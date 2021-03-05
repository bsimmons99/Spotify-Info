async function updateAuthKey(path) {
    let res = await fetch(path);
    if (res.status === 401) {
        window.location.href = '/login';
    }

    let data = await res.json();

    document.getElementById('authKey').innerText = data;
    document.getElementById('authKey2').innerText = data;
}

async function saveSettings() {
    let data = {};
    data.backgroundColour = document.getElementById('backgroundColourPicker').value;
    data.textColour = document.getElementById('textColourPicker').value;
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
    document.getElementById('backgroundColourPicker').value = '#' + settings.backgroundColour;
    document.getElementById('textColourPicker').value = '#' + settings.textColour;
}

function init() {
    updateAuthKey('/getauth');
    getSettings();
}
