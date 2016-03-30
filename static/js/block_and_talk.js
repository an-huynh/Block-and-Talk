// GLOBALS
var socket;
var username;

var players;

var canvas;
var ctx;

window.onload = function() {
    canvas = element('myCanvas');
    ctx = canvas.getContext('2d')


    socketInit();
    element('login').onsubmit = login_request;
}

function socketInit() {
    socket = io();
    socket.on('login_response', function(msg) {
        // TEMPORARY
        if (msg) {
            console.log('login');
            element('login').onsubmit = function(){return false;};
            element('username').value = '';
            window.onkeydown = keyHandler;
            element('login_box').style.display = 'none';
            username = msg;
            update_request();
        }
        else {
            socket.emit('register_request', element('username').value);
        }
    });
    socket.on('register_response', function(msg) {
        // TEMPORARY
        console.log('reg');
        console.log(msg);
        element('login').onsubmit = function(){return false;};
        element('username').value = '';
        window.onkeydown = keyHandler;
        element('login_box').style.display = 'none';
        username = msg;
        update_request();
    });
    socket.on('move_response', function(msg) {
        for(var found = false, i = 0; i < players.length; i++) {
            if (msg['username'] === players[i]['username']) {
                players[i] = msg;
            }
        }
        drawCycle();
    });
    socket.on('update_response', function(msg) {
        players = msg;
        drawCycle();
    });
}

function element(id) {
    return document.getElementById(id);
}

function login_request() {
    socket.emit('login_request', element('username').value);
    return false;
}

function move_request(dir) {
    console.log('requesting');
    var request = {
        username : username,
        direction : dir
    };
    socket.emit('move_request', request);
}

function update_request() {
    socket.emit('update_client_request', '');
}

function keyHandler(evt) {
    console.log(evt.keyCode);
    switch(evt.keyCode) {
        case 87:
            move_request('up');
            break;
        case 65:
            move_request('left');
            break;
        case 68:
            move_request('right');
            break;
        case 83:
            move_request('down');
            break;
    }
}

function drawCycle() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < players.length; i++) {
        ctx.beginPath();
        ctx.rect(players[i]['posx'] * 2, players[i]['posy'] * 2, 20, 20);
        ctx.fillStyle = players[i]['color'];
        ctx.fill();
        ctx.closePath();
    }
}
