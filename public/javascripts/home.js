async function updateAuthKey(path) {
    let res = await fetch(path);
    if (res.status === 401) {
        window.location.href = '/login';
    }

    let data = await res.json();

    document.getElementById('authKey').innerText = data;
    document.getElementById('authKey2').innerText = data;
}

function swapColours() {
    let fgcp = document.getElementById('textColourPicker');
    let bgcp = document.getElementById('backgroundColourPicker');
    let fbc = fgcp.value;
    fgcp.value = bgcp.value;
    bgcp.value = fbc;

    let fgop = document.getElementById('textOpacityPicker');
    let bgop = document.getElementById('backgroundOpacityPicker');
    let fbo = fgop.value;
    fgop.value = bgop.value;
    bgop.value = fbo;
}

function validateOpacity(field) {
    field.value = Math.max(Math.min(field.value, 100), 0);
}

async function saveSettings() {
    let data = {};
    data.backgroundColour = document.getElementById('backgroundColourPicker').value;
    data.textColour = document.getElementById('textColourPicker').value;

    data.backgroundColour += Math.round(document.getElementById('backgroundOpacityPicker').value/100*255).toString(16);
    data.textColour += Math.round(document.getElementById('textOpacityPicker').value/100*255).toString(16);

    console.log(data.textColour, data.backgroundColour);

    data.backgroundColour += data.backgroundColour.length < 9 ? '0' : '';
    data.textColour += data.textColour.length < 9 ? '0' : '';

    await fetch('/saveSettings', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

async function getSettings() {
    settings = await (await fetch('/getSettings')).json();
    document.getElementById('backgroundColourPicker').value = '#' + settings.backgroundColour.slice(0,6);
    document.getElementById('textColourPicker').value = '#' + settings.textColour.slice(0,6);
    document.getElementById('backgroundOpacityPicker').value = Math.round(parseInt(settings.backgroundColour.slice(6,8), 16)/255*100);
    document.getElementById('textOpacityPicker').value = Math.round(parseInt(settings.textColour.slice(6,8), 16)/255*100);
}

function init() {
    updateAuthKey('/getauth');
    getSettings();
}
