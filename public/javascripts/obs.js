// const urlParams = new URLSearchParams(window.location.search);
// const authParam = urlParams.get('auth');

var currentID = null;
var badResponses = 0;
var lastSettingsUpdate = new Date(0);
async function updateData() {
    res = await fetch('/nowplaying');

    if (res.status === 401 || res.status !== 200) {
        if (badResponses++ >= 5) {
            document.getElementById('main').style.display = 'none';
        }
        return;
    }

    data = await res.json();

    if ('updated' in data) {
        let recentUpdate = new Date(data.updated);
        if (recentUpdate > lastSettingsUpdate) {
            lastSettingsUpdate = recentUpdate;
            getSettings();
        }
    }
    badResponses = 0;
    if ('skip' in data && data.skip === true) {
        return;
    } else if ('error' in data && data.error == 'no_song') {
        document.getElementById('main').style.display = 'none';
    } else {
        document.getElementById('main').style.display = 'block';


        // if (document.getElementById('cover1').src != data.cover) {
        //     document.getElementById('cover1').src = data.cover;
        // }
        // if (document.getElementById('title1').innerText != data.title) {
        //     document.getElementById('title1').innerText = data.title;
        //     document.getElementById('artist1').innerText = data.artists;
        // }

        if (currentID != data.id) {
            currentID = data.id;
            slide(data.cover, data.title, data.artists);
        }
        document.getElementById('progress').style.width = (data.elapsed / data.duration) * 100 + '%';
    }
}

function msToDsp(ms) {
    ms = Math.floor(ms/1000);
    let minutes = Math.floor(ms/60);
    let secs = ms - minutes * 60;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    secs = secs < 10 ? '0' + secs : secs;
    return minutes + ':' + secs;
}

var switched = false;
function slide(src, title, artist) {
    let cover_s = document.getElementById('cover-slide').style;
    let info_s = document.getElementById('info-slide').style;

    switched = !switched;
    if (switched) {
        document.getElementById('cover2').src = src;
        document.getElementById('title2').innerText = title;
        document.getElementById('artist2').innerText = artist;
        cover_s.top = '-300px';
        info_s.top = '-310px';
    } else {
        document.getElementById('cover1').src = src;
        document.getElementById('title1').innerText = title;
        document.getElementById('artist1').innerText = artist;
        cover_s.top = '0px';
        info_s.top = '0px';
    }

    // //Option 2
    // document.getElementById('cover2').src = src;
    // document.getElementById('title2').innerText = title;
    // document.getElementById('artist2').innerText = artist;
    // cover_s.top = '-300px';
    // info_s.top = '-310px';
    // setTimeout(resetSliders, 1000);
}

// function resetSliders() {
//     let cover_s = document.getElementById('cover-slide').style;
//     let info_s = document.getElementById('info-slide').style;

//     //Remove slide speed
//     cover_s.transition = 'top 0s linear 0s';
//     info_s.transition = 'top 0s linear 0s';

//     //Duplicate info to other display
//     document.getElementById('cover1').src = document.getElementById('cover2').src;
//     document.getElementById('title1').innerHTML = document.getElementById('title2').innerHTML;
//     document.getElementById('artist1').innerHTML = document.getElementById('artist2').innerHTML;
//     //Switch!
//     cover_s.top = '0px';
//     info_s.top = '0px';
//     setTimeout(resetSliders2, 10);
// }

// function resetSliders2() {
//     let cover_s = document.getElementById('cover-slide').style;
//     let info_s = document.getElementById('info-slide').style;
//     //Reset slide speed
//     cover_s.transition = 'top 1s linear 0s';
//     info_s.transition = 'top 1s linear 0s';
// }

async function getSettings() {
    settings = await (await fetch('/getSettings')).json();
    document.getElementById('main').style.backgroundImage = 'linear-gradient(90deg, #'+ settings.backgroundColour +' 75%, rgba(0, 0, 0, 0))';
    document.getElementById('main').style.color = '#'+ settings.textColour;
}

updateData();
var interval = setInterval(updateData, 2000);
function changeInterval(ms) {
    clearInterval(interval);
    interval = setInterval(updateData, ms);
}
