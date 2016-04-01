// GLOBALS
var socket;
var username;
var players;
var messages = {};
var canvas;
var ctx;

window.onload = function() {
    canvas = element('myCanvas');
    ctx = canvas.getContext('2d');
    loginScreen();
    initSocket();
}

function initSocket() {
    socket = io();
    socket.on('login_response', function(msg) {
        if (msg) {
            username = msg;
            loggedIn();
        }
        else {
            alert('User does not exist');
        }
    });
    socket.on('register_response', function(msg) {
        if (msg) {
            username = msg;
            loggedIn();
        }
        else {
            alert('Failed to make account');
        }
    });
    socket.on('open_name_response', function(msg) {
        if (msg) {
            open_name = msg;
            element('register').style.display = 'none';
            element('login').style.display = 'none';
            customizeDrawCycle();
            document.addEventListener('mousedown', customizeBlockMouseHandler, false);
        }
        else {
            alert('user already exists');
        }
    });
}

function initSocketLoggedIn() {
    socket.on('login_response', function(msg) {});
    socket.on('register_response', function(msg) {});
    socket.on('update_response', function(msg) {
        players = msg;
        drawCycle();
    });
    socket.on('move_response', function(msg) {
        for (var found = false, i = 0; i < players.length && !found; i++) {
            if (msg['username'] === players[i]['username']) {
                players[i] = msg;
            }
        }
        drawCycle();
    });
    socket.on('chat_message', function(msg) {
        var newMessage = element('message-template').content.cloneNode(true);
        newMessage.querySelector('.message-username').textContent = msg['username'];
        newMessage.querySelector('.message-content').textContent = msg['message'];
        element('messages').appendChild(newMessage);
        element('chat-box').scrollTop = element('chat-box').scrollHeight;
        var user = msg['username'];
        if (!messages[user])
            messages[user] = {};
        messages[user]['message'] = msg['message'];
        messages[user]['time'] = Date.now();
        drawCycle();
    });
}

function loginRequest() {
    if (element('login-username').value !== '')
        socket.emit('login_request', element('login-username').value);
    return false;
}

function registerRequest() {
    if (element('register-username').value !== '')
        socket.emit('open_name_request', element('register-username').value);
    return false;
}

function loggedIn() {
    element('login').style.display = 'none';
    element('register').style.display = 'none';
    element('chat-box').style.display = 'block';
    element('message-form').style.display = 'block';
    element('message-form').onsubmit = messageEntered;
    element('message-input').onfocus = writing;
    element('message-input').onblur = notWriting;
    window.onkeydown = keyHandler;
    document.removeEventListener('mousedown', mouseDownHandler);
    initSocketLoggedIn();
    socket.emit('update_request', '');
}

function loginScreen() {
    ctx.font = '55px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText('Block and Talk', canvas.width / 2, canvas.height / 2 - 40);

    ctx.beginPath();
    ctx.rect(canvas.width / 2 - 130, 270, 110, 30);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';
    ctx.font = '25px Helvetica';
    ctx.fillText('Login', canvas.width / 2 - 75, 293);

    ctx.beginPath();
    ctx.rect(canvas.width / 2 + 20, 270, 110, 30);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';
    ctx.font = '25px Helvetica';
    ctx.fillText('Register', canvas.width / 2 + 75, 293);


    element('login').onsubmit = loginRequest;
    element('register').onsubmit = registerRequest;
    document.addEventListener('mousedown', mouseDownHandler, false);
}

function moveRequest(dir) {
    var message = {
        username : username,
        direction : dir
    };
    socket.emit('move_request', message);
}

function messageEntered() {
    var message = {
        username : username,
        message : element('message-input').value
    }
    socket.emit('message_request', message);
    element('message-input').value = '';
    return false;
}

function element(id) {
    return document.getElementById(id);
}

function writing() {
    window.onkeydown = function() {};
}

function notWriting() {
    window.onkeydown = keyHandler;
}

function keyHandler(evt) {
    switch(evt.keyCode) {
        case 38:
        case 87:
            moveRequest('up');
            break;
        case 37:
        case 65:
            moveRequest('left');
            break;
        case 39:
        case 68:
            moveRequest('right');
            break;
        case 40:
        case 83:
            moveRequest('down');
            break;
    }
}

function mouseDownHandler(evt) {
    var relativeX = evt.clientX - canvas.offsetLeft;
    var relativeY = evt.clientY - canvas.offsetTop;
    if (relativeX >= canvas.width / 2 - 130 && relativeX <= canvas.width / 2 - 20 &&
        relativeY >= 270 && relativeY <= 300) {
        element('register').style.display = 'none';
        element('login').style.display = 'block';
    }
    if (relativeX >= canvas.width / 2 + 20 && relativeX <= canvas.width / 2 + 110 &&
        relativeY >= 270 && relativeY <= 300) {
        element('login').style.display = 'none';
        element('register').style.display = 'block';
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
    for (var key in messages) {
        if (messages[key]['time'] > Date.now() - 10000) {
            var index;
            var found = false;
            for (var i = 0; i < players.length && !found; i++) {
                if (key === players[i]['username']) {
                    index = i;
                    found = true;
                }
            }
            ctx.font = '20px Helvetica';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'black';
            ctx.fillText(messages[key]['message'], players[index]['posx'] * 2 + 10, players[index]['posy'] * 2 - 10,
                200);
        }
    }
}

function customizeDrawCycle() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.rect(20, 20, 200, 200);
    ctx.fillStyle = colors[colorIndex];
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.rect(240, 20, 100, 40);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Back', 290, 47);

    ctx.beginPath();
    ctx.rect(360, 20, 100, 40);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Next', 410, 47);

    ctx.beginPath();
    ctx.rect(240, 80, 220, 40);
    ctx.fillStyle = 'green';
    ctx.fill();
    ctx.closePath();
    ctx.font='20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Submit', 350, 107);

    ctx.font = '40px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.fillText(open_name, 20, 260);
}

var open_name;
var colorIndex = 0;
var colors = ['#F0F8FF', '#FAEBD7', '#00FFFF', '#7FFFD4', '#F0FFFF', '#F5F5DC',
'#FFEBCD', '#0000FF', '#8A2BE2', '#A52A2A', '#DEB887', '#5F9EA0',
'#7FFF00', '#D2691E', '#FF7F50', '#6495ED', '#FFF8DC', '#DC143C',
'#00FFFF', '#00008B', '#008B8B', '#B8860B', '#A9A9A9', '#006400',
'#BDB76B', '#8B008B', '#556B2F', '#FF8C00', '#9932CC', '#8B0000'];

function customizeBlockMouseHandler(evt) {
    var relativeX = evt.clientX - canvas.offsetLeft;
    var relativeY = evt.clientY - canvas.offsetTop;
    if (relativeX >= 240 && relativeX <= 340 &&
        relativeY >= 20 && relativeY <= 60) {
        if (colorIndex < colors.length) {
            colorIndex++;
        }
        else {
            colorIndex = 0;
        }
        customizeDrawCycle();
    }
    if (relativeX >= 360 && relativeX <= 460 &&
        relativeY >= 20 && relativeY <= 60) {
        if (colorIndex > 0) {
            colorIndex--;
        }
        else {
            colorIndex = colors.length - 1;
        }
        customizeDrawCycle();
    }
    if (relativeX >= 240 && relativeX <= 460 &&
        relativeY >= 80 && relativeY <= 120) {
        registerNewBlock();
    }
}

function registerNewBlock() {
    var block = {
        username : open_name,
        color : colors[colorIndex]
    };
    socket.emit('register_request', block);
    document.removeEventListener('mousedown', customizeBlockMouseHandler, false);
}
