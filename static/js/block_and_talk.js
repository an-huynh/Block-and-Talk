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
            element('chat_box').style.display = 'block';
            element('message-form').style.display = 'block';
            username = msg;
            update_request();
            element('message-form').onsubmit = messageEntered;
            element('message-input').onfocus = typing;
            element('message-input').onblur = stoppedTyping;
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
        element('chat_box').style.display = 'block';
        element('message-form').style.display = 'block';
        username = msg;
        update_request();
        element('message-form').onsubmit = messageEntered;
        element('message-input').onfocus = typing;
        element('message-input').onblur = stoppedTyping;
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
    socket.on('chat_message', function(msg) {
        var new_message = element('message-template').content.cloneNode(true);
        new_message.querySelector('.message-username').textContent = msg['username'];
        new_message.querySelector('.message-content').textContent = msg['message'];
        element('messages').appendChild(new_message);
        element('chat_box').scrollTop = element('chat_box').scrollHeight;
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

function messageEntered() {
    var request = {
        username : username,
        message : element('message-input').value
    };
    socket.emit('message_request', request);
    element('message-input').value = '';
    return false;
}

function typing() {
    window.onkeydown = null;
}

function stoppedTyping() {
    window.onkeydown = keyHandler;
}
