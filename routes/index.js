const express = require('express');
const configs = require('../config.json');
const https = require('https');
const crypto = require("crypto");
const { settings } = require('cluster');

const router = express.Router();

// router.use(function (req, res, next) {
//     console.log("ID", req.session.spot_id);
//     next();
// });

router.get('/logout', function (req, res) {
    req.session.spot_id = null;
    res.send('Logged out');
});

router.get('/login', function (req, res) {
    if ('code' in req.query) {
        auth(req, res);
        return;
    }

    const scopes = 'user-read-currently-playing';
    // const scopes = '';
    res.redirect(307, 'https://accounts.spotify.com/authorize' +
        '?response_type=code' +
        '&client_id=' + configs.client_id +
        '&scope=' + encodeURIComponent(scopes) +
        '&redirect_uri=' + encodeURIComponent(configs.redirect_uri) +
        '&show_dialog=' + 'false'
    );
});

function auth(req, res) {
    // res.startTime('db', 'database');
    // res.endTime('db');
    const apiReq = https.request('https://accounts.spotify.com/api/token', {
        method: 'POST'
    },
        function (resb) {
            console.log('statusCode:', resb.statusCode);
            let data = '';
            resb.on('data', function (stream) {
                data += stream;
            });
            resb.on('end', async function () {
                data = JSON.parse(data);
                // console.log(data);
                let con = await req.pool.getConnection();
                await con.beginTransaction();
                let userData = await getSpotUserId(data.access_token);
                let qu = await con.query('INSERT INTO User (id, scope, access, refresh, expiry) VALUE (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE scope = ?, access = ?, refresh = ?, expiry = ?;', [userData.id, data.scope, data.access_token, data.refresh_token, data.expires_in, data.scope, data.access_token, data.refresh_token, data.expires_in]);
                if (qu.affectedRows === 1) {
                    await newAuth(userData.id, con);
                }
                await con.commit();
                await con.release();
                req.session.spot_id = userData.id;
                // console.log('UserData:', userData, req.session, req.session.id);
                // res.send(data);
                res.redirect(307, '/'); //Login Success
            });
        }
    );
    apiReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
    apiReq.setHeader('Authorization', 'Basic ' + Buffer.from(configs.client_id + ':' + configs.client_secret).toString('base64'));
    apiReq.end('grant_type=' + 'authorization_code' +
        '&code=' + req.query.code +
        '&redirect_uri=' + encodeURIComponent(configs.redirect_uri)
    );
}

function getSpotUserId(token) {
    return new Promise((resolve, reject) => {
        const apiReq = https.request('https://api.spotify.com/v1/me/', function (res) {
            let data = '';
            res.on('data', function (stream) {
                data += stream;
            });
            res.on('end', function () {
                data = JSON.parse(data);
                if (res.statusCode == 200) {
                    resolve(data);
                } else {
                    reject(data);
                }
            });
        });
        apiReq.setHeader('Authorization', 'Bearer ' + token);
        apiReq.end();
    });
}

//Must be logged in!
router.use(function (req, res, next) {
    if ('spot_id' in req.session && req.session.spot_id != null) {
        next();
        return;
    }
    // console.log("Not logged in", req.session, req.session.id);
    res.sendStatus(401);
});

router.get('/getauth', async function (req, res) {
    let key = await req.pool.query('SELECT auth FROM User WHERE id = ?;', req.session.spot_id);
    key = key[0].auth;
    // console.log(req.session.spot_id, key);
    res.json(key);
});

router.get('/revokeauth', async function (req, res) {
    let con = await req.pool.getConnection();
    let key = await newAuth(req.session.spot_id, con);
    res.json(key);
    con.release();
});

router.get('/query', async function (req, res) {
    if ('endpoint' in req.query) {
        res.json(await queryAPI(req.query.endpoint, req.session.spot_id, req.pool));
    } else {
        res.json(await queryAPI('/me/', req.session.spot_id, req.pool));
    }
});

router.get('/nowplaying', async function (req, res) {
    let data = await queryAPI('/me/player/currently-playing', req.session.spot_id, req.pool);
    let settings = (await req.pool.query('SELECT settings_updated AS updated FROM User WHERE id = ?;', req.session.spot_id))[0];
    if ('error' in data) {
        res.json(data);
    } else {
        let ret = {};
        ret.updated = settings.updated;
        if (data.item === null) {
            ret.skip = true;
            res.json(ret);
            return;
        }
        ret.id = data.item.id;
        ret.cover = data.item.album.images[1].url;
        ret.title = data.item.name;
        ret.artists = ''
        data.item.artists.forEach(element => {
            ret.artists += element.name + ', ';
        });
        ret.artists = ret.artists.slice(0, ret.artists.length-2);
        if (configs.rickroll) {
            ret.id = '4uLU6hMCjMI75M1A2tKUQC';
            ret.title = 'Never Gonna Give You Up';
            ret.artists = 'Rick Astley';
            ret.cover = 'https://i.scdn.co/image/ab67616d00001e02255e131abc1410833be95673';
        }
        ret.duration = data.item.duration_ms;
        ret.elapsed = data.progress_ms;
        res.json(ret);
    }
});

function queryAPI(endpoint, id, db) {
    return new Promise(async (resolve, reject) => {
        try {
            let con = await db.getConnection();
            await con.beginTransaction();
            let tokens = await con.query('SELECT access, refresh, issued, expiry, scope FROM User WHERE id = ?', id);
            if (tokens.length < 1) {
                throw 'User not found';
            }
            tokens = tokens[0];
            
            if (!tokenValid(tokens.issued, tokens.expiry)) {
                tokens.access = await refreshToken(tokens.refresh, id, con);
            }
            await con.commit();
            await con.release();


            const apiReq = https.request('https://api.spotify.com/v1' + endpoint, function (res) {
                let data = '';
                res.on('data', function (stream) {
                    data += stream;
                });
                res.on('end', async function () {
                    if (res.statusCode == 404) {
                        reject(res.statusMessage);
                        return;
                    } else if (res.statusCode === 200) {
                        data = JSON.parse(data);
                    } else if (res.statusCode === 204) {
                        data = {'error':'no_song'};
                    } else if (res.statusCode === 401) {
                        //Refresh access token
                        await refreshToken(tokens.refresh, id, con);
                    }
                    // console.log('data', data);
                    // console.log(res.statusCode);
                    if (res.statusCode == 200 || res.statusCode == 204) {
                        resolve(data);
                    } else {
                        reject(data);
                    }
                });
            });
            apiReq.setHeader('Authorization', 'Bearer ' + tokens.access);
            apiReq.end();

        } catch (error) {
            console.log(error);
            try {
                if (con != undefined) {
                    await con.rollback();
                    await con.release();
                }
            } catch (error) {
                return reject(error);
            }
            return reject(error);
        }
    });
}

function tokenValid(issued, expiry) {
    const safety = 60 * 5; //5 Minutes
    let elapsed = (new Date().getTime() - issued.getTime()) / 1000 + safety;
    // console.log(elapsed);
    return elapsed < expiry;
}

function refreshToken(refreshToken, id, con) {
    return new Promise(async (resolve, reject) => {
        const apiReq = https.request('https://accounts.spotify.com/api/token', {
            method: 'POST'
        },
            function (res) {
                let data = '';
                res.on('data', function (stream) {
                    data += stream;
                });
                res.on('end', async function () {
                    data = JSON.parse(data);
                    // console.log(data);
                    if (res.statusCode != 200) {
                        return reject(data);
                    }
                    try {
                        await con.query('UPDATE User SET access = ?, expiry = ?, issued = CURRENT_TIMESTAMP() WHERE id = ?;', [data.access_token, data.expires_in, id]);
                        return resolve(data.access_token);
                    } catch (error) {
                        return reject(error);
                    }
                });
            }
        );
        apiReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        apiReq.setHeader('Authorization', 'Basic ' + Buffer.from(configs.client_id + ':' + configs.client_secret).toString('base64'));
        apiReq.end('grant_type=' + 'refresh_token' +
            '&refresh_token=' + refreshToken
        );
    });
}

async function newAuth(id, con) {
    let validKey = false;
    let tries = 10;
    while (!validKey) {
        key = crypto.randomBytes(20).toString('hex');
        try {
            await con.query("UPDATE User SET auth = ? WHERE id = ?;", [key, id]);
            validKey = true;
        } catch (error) {
            if (error.code != 'ER_DUP_ENTRY') {
                throw error;
            }
        }
        if (tries-- < 0) {
            throw 'Could not generate unique auth key after 10 tries';
        }
    }
    return key;
}

router.put('/saveSettings', async function(req, res) {
    // console.log(req.body);
    if ('backgroundColour' in req.body && 'textColour' in req.body) {
        let bg = req.body.backgroundColour.slice(1,9);
        let fg = req.body.textColour.slice(1,9);
        fg += fg.length < 8 ? '0' : '';
        bg += bg.length < 8 ? '0' : '';
        console.log(fg, bg);
        await req.pool.query('UPDATE User SET background_colour = ?, text_colour = ?, settings_updated = CURRENT_TIMESTAMP() WHERE id = ?;', [bg, fg, req.session.spot_id]);
    }
    res.sendStatus(204);
});

router.get('/getSettings', async function(req, res) {
    let settings = (await req.pool.query('SELECT settings_updated AS updated, background_colour AS backgroundColour, text_colour AS textColour FROM User WHERE id = ?;', req.session.spot_id))[0];
    res.json(settings);
});

module.exports = router;
