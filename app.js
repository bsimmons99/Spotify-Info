const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mariadb = require('mariadb');
const mysql = require('mysql'); //Needed as mariadb does not support ?? required by express-mysql-session
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const serverTiming = require('server-timing');
const configs = require('./config.json');

const indexRouter = require('./routes/index');

const app = express();

app.use(serverTiming());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//Start connection to database
const dbConnectionPool = mariadb.createPool({
    host: configs.db_host,
    user: configs.db_user,
    password: configs.db_pass,
    database: configs.db_database,
    connectionLimit: 5
});

//Add database pool to request
app.use(function (req, res, next) {
    req.pool = dbConnectionPool;
    next();
});

//Link session store to MySQL
const sessionStore = new MySQLStore({
    host: configs.db_host,
    user: configs.db_user,
    password: configs.db_pass,
    database: configs.db_database,
    connectionLimit: 5,

    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 86400000
});

//Add session data to request
app.use(session({
    secret: 'PH14Mz/XJ0EY7Xr4dcVSIA',
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true, sameSite: 'lax' },
}));

//Query Authentication
app.use(async function(req, res, next) {
    // console.log(req.session);
    if ('authKey' in req.session && req.session.authKey != null) {
        auth = await req.pool.query('SELECT auth FROM User WHERE id = ?', req.session.spot_id);
        auth = auth[0].auth;
        if (req.session.authKey != auth) {
            req.session.spot_id = null;
            req.session.authKey = null;
            res.sendStatus(401);
            return;
        }
    } 
    if ('auth' in req.query) {
        user = await req.pool.query('SELECT id as spot_id FROM User WHERE auth IS NOT NULL AND auth = ?', req.query.auth);
        if (user.length === 1) {
            req.session.spot_id = user[0].spot_id;
            req.session.authKey = req.query.auth;
        } else {
            req.session.spot_id = null;
            req.session.authKey = null;
            res.sendStatus(401);
            return;
        }
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public'), {extensions: ['html']}));

app.use('/', indexRouter);

app['shutdown'] = function (callback) {
    sessionStore.close(() => {
        console.log('Session Store Closed');
        dbConnectionPool.end().then(() => {
            console.log('Database Closed');
            callback();
        });
    });
};

module.exports = app;
