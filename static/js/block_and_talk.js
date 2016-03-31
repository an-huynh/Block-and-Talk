// GLOBALS
var socket;
var username;
var messages = {};

var players;

var canvas;
var ctx;

var login = false;

window.onload = function() {
    canvas = element('myCanvas');
    ctx = canvas.getContext('2d')
    loginScreen();
    socketInit();
    element('login').onsubmit = login_request;
}

function socketInit() {
    socket = io();
    socket.on('login_response', function(msg) {
        // TEMPORARY
        if (msg) {
            element('login').onsubmit = function(){return false;};
            element('username').value = '';
            window.onkeydown = keyHandler;
            element('login_box').style.display = 'none';
            element('chat_box').style.display = 'block';
            element('message-form').style.display = 'block';
            username = msg;
            element('message-form').onsubmit = messageEntered;
            element('message-input').onfocus = typing;
            element('message-input').onblur = stoppedTyping;
            login = true;
            update_request();
        }
        else {
            socket.emit('register_request', element('username').value);
        }
    });
    socket.on('register_response', function(msg) {
        // TEMPORARY
        element('login').onsubmit = function(){return false;};
        element('username').value = '';
        window.onkeydown = keyHandler;
        element('login_box').style.display = 'none';
        element('chat_box').style.display = 'block';
        element('message-form').style.display = 'block';
        username = msg;
        element('message-form').onsubmit = messageEntered;
        element('message-input').onfocus = typing;
        element('message-input').onblur = stoppedTyping;
        login = true;
        update_request();
    });
    socket.on('move_response', function(msg) {
        if (login) {
            for(var found = false, i = 0; i < players.length; i++) {
                if (msg['username'] === players[i]['username']) {
                    players[i] = msg;
                }
            }
                drawCycle();
        }
    });
    socket.on('update_response', function(msg) {
        players = msg;
        if (login)
            drawCycle();
    });
    socket.on('chat_message', function(msg) {
        if (login) {
            var new_message = element('message-template').content.cloneNode(true);
            new_message.querySelector('.message-username').textContent = msg['username'];
            new_message.querySelector('.message-content').textContent = msg['message'];

            var user = msg['username'];
            if (!messages[user]) {
                messages[user] = {};
            }
            messages[user]['message'] = msg['message'];
            messages[user]['time'] = Math.floor(Date.now() / 1000);

            drawCycle();

            element('messages').appendChild(new_message);
            element('chat_box').scrollTop = element('chat_box').scrollHeight;
        }
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
    switch(evt.keyCode) {
        case 38:
        case 87:
            move_request('up');
            break;
        case 37:
        case 65:
            move_request('left');
            break;
        case 39:
        case 68:
            move_request('right');
            break;
        case 40:
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
    for(var key in messages) {
        if (messages[key]['time'] > Math.floor(Date.now() / 1000) - 10) {
            var index;
            var found = false;
            for(var i = 0; i < players.length && !found; i++) {
                if (key === players[i]['username']) {
                    index = i;
                    found = true;
                }
            }
            if (found) {
                ctx.font='20px Helvetica';
                ctx.textAlign = 'center';
                ctx.fillText(messages[key]['message'], players[index]['posx'] * 2 + 10, players[index]['posy'] * 2 - 10,
                150);
            }
        }
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

function loginScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "55px Helvetica";
    ctx.textAlign = "center";
    ctx.fillText("Block and Talk", (canvas.width)/2, ((canvas.height)/2)-40);

    ctx.beginPath();
    ctx.rect(270, 270, 75, 30);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.closePath();
    ctx.textAlign = "left";
    ctx.fillStyle = "black";
    ctx.font = "25px Helvetica";
    ctx.fillText("Login", 274, 293);

    ctx.beginPath();
    ctx.rect(370, 270, 105, 30);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.closePath();
    ctx.textAlign = "left";
    ctx.fillStyle = "black";
    ctx.font = "25px Helvetica";
    ctx.fillText("Register", 374, 293);
}
