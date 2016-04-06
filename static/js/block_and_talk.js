// GLOBALS
var socket;
var players = {};
var messages = {};
var canvas;
var ctx;

var chatGroups = {};
var currentChatGroup;

var direction = {
    up: null,
    right: null,
    down: null,
    left: null
};

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
            loggedIn();
        }
        else {
            alert('Incorrect username or password');
        }
    });
    socket.on('register_response', function(msg) {
        if (msg) {
            loggedIn();
        }
        else {
            alert('user already exists');
        }
    });
    socket.on('open_name_response', function(msg) {
        if (msg) {
            open_name = msg;

            element('register').style.display = 'none';
            element('login').style.display = 'none';
            customizeDrawCycle();
            document.removeEventListener('mousedown', mouseDownHandler);
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
        players[msg['username']] = msg['array'];
        drawCycle();
    });
    socket.on('chat_message', function(msg) {
        var newMessage = element('message-template').content.cloneNode(true);
        newMessage.querySelector('.message-username').textContent = msg['username'];
        newMessage.querySelector('.message-content').textContent = msg['message'];
        element('global-chat-messages').appendChild(newMessage);
        element('chat-box').scrollTop = element('chat-box').scrollHeight;
        var user = msg['username'];
        if (!messages[user])
            messages[user] = {};
        messages[user]['message'] = msg['message'];
        messages[user]['time'] = Date.now();
        messages[user]['color'] = 'black';
        drawCycle();
    });
    socket.on('player_list_response', function(msg) {
        for (var i = 0; i < msg.length; i++) {
            if (!(msg[i] in chatGroups)) {
                var newChatMessages = document.createElement('ul');
                newChatMessages.className = 'messages';
                newChatMessages.id = 'chat-messages-player-' + msg[i];
                newChatMessages.style.display = 'none';
                element('chat-box').appendChild(newChatMessages);
                chatGroups[msg[i]] = element('chat-box').querySelector('#chat-messages-player-' + msg[i]);

                var newBox = document.createElement('option');
                newBox.value = msg[i];
                newBox.id = 'drop-down-' + msg[i];
                newBox.textContent = msg[i];
                element('chat-box-dropdown').appendChild(newBox);
            }
        }
    });
    socket.on('player_list_removal', function(msg) {
        if (msg in chatGroups) {
            element('chat-box').removeChild(chatGroups[msg]);
            delete chatGroups[msg];
            element('chat-box-dropdown').removeChild(element('drop-down-' + msg));
        }
    });
    socket.on('private_message_response', function(msg) {
        var newMessage = element('message-template').content.cloneNode(true);
        newMessage.querySelector('.message-username').textContent = msg['username'];
        newMessage.querySelector('.message-content').textContent = msg['message'];
        var group = msg.sender;
        if (msg.username in chatGroups)
            group = msg.username;
        element('chat-messages-player-' + group).appendChild(newMessage);
        element('chat-box').scrollTop = element('chat-box').scrollHeight;
        
        if (!messages[msg.sender])
            messages[msg.sender] = {};
        messages[msg.sender]['message'] = msg['message'];
        messages[msg.sender]['time'] = Date.now();
        messages[msg.sender]['color'] = 'red';
        drawCycle();
        
    });
}

function loginRequest() {
    if (element('login-username').value !== '') {
        var message = {
            username : element('login-username').value,
            password : sha256_digest(element('login-password').value)
        };
        socket.emit('login_request', message);
    }
    return false;
}

function registerRequest() {
    if (element('register-password1').value !== element('register-password2').value) {
        alert('passwords do not match');
    }
    else if (element('register-username').value !== '')
        socket.emit('open_name_request', element('register-username').value);
    return false;
}

function loggedIn() {
    element('login').style.display = 'none';
    element('register').style.display = 'none';
    initChat();
    element('login-password').value = '';
    element('register-password1').value = '';
    element('register-password2').value = '';
    element('message-form').onsubmit = messageEntered;
    element('message-input').onfocus = writing;
    element('message-input').onblur = notWriting;
    window.onkeydown = keyDownHandler;
    window.onkeyup = keyUpHandler;
    document.removeEventListener('mousedown', mouseDownHandler);
    initSocketLoggedIn();
    playerListRequest();
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

function moveRequest() {
    var message = {
        deltaX : null,
        deltaY : null
    };
    if (direction.left && !direction.right) {
        message.deltaX = 'left';
    }
    else if (direction.right && !direction.left) {
        message.deltaX = 'right';
    }
    else {
        message.deltaX = null;
    }
    if (direction.up && !direction.down) {
        message.deltaY = 'up';
    }
    else if (direction.down && !direction.up) {
        message.deltaY = 'down';
    }
    else {
        message.deltaY = null;
    }
    socket.emit('move_request', message);
}

function messageEntered() {
    socket.emit('message_request', element('message-input').value);
    element('message-input').value = '';
    return false;
}

function element(id) {
    return document.getElementById(id);
}

function writing() {
    window.onkeydown = function() {};
    window.onkeyup = function() {};
}

function notWriting() {
    window.onkeydown = keyDownHandler;
    window.onkeyup = keyUpHandler;
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
    for (var key in players) {
        ctx.beginPath();
        switch(players[key]['shape']) {
            case 'square':
                ctx.rect(players[key].posx, players[key].posy, 20, 20);
                break;
            case 'circle':
                ctx.arc(players[key].posx + 10, players[key].posy + 10, 10, 0, 2*Math.PI);
                break;
            case 'triangle':
                ctx.moveTo(players[key].posx + 10, players[key].posy);
                ctx.lineTo(players[key].posx, players[key].posy + 20);
                ctx.lineTo(players[key].posx + 20, players[key].posy + 20);
        }
        ctx.fillStyle = players[key]['color'];
        ctx.fill();
        ctx.closePath();
    }
    for (var key in messages) {
        if (messages[key]['time'] > Date.now() - 10000) {
            ctx.font = '20px Helvetica';
            ctx.textAlign = 'center';
            ctx.fillStyle = messages[key].color;
            ctx.fillText(messages[key]['message'], players[key]['posx'] + 10, players[key]['posy'] - 10,
                200);
        }
    }
}

function customizeDrawCycle() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    switch(shapeIndex) {
        case 0:
            ctx.rect(20, 20, 200, 200);
            break;
        case 1:
            ctx.arc(120, 120, 100, 0, 2*Math.PI);
            break;
        case 2:
            ctx.moveTo(120, 20);
            ctx.lineTo(220, 220);
            ctx.lineTo(20, 220);
    }
    ctx.fillStyle = colors[colorIndex];
    ctx.fill();
    ctx.closePath();

    ctx.font = '30px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Color', 350, 42);

    ctx.beginPath();
    ctx.rect(240, 60, 100, 40);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Back', 290, 87);

    ctx.beginPath();
    ctx.rect(360, 60, 100, 40);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Next', 410, 87);

    ctx.font = '30px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Shape', 350, 140);

    ctx.beginPath();
    ctx.rect(240, 160, 100, 40);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Back', 290, 187);

    ctx.beginPath();
    ctx.rect(360, 160, 100, 40);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Next', 410, 187);

    ctx.beginPath();
    ctx.rect(240, 220, 220, 40);
    ctx.fillStyle = 'green';
    ctx.fill();
    ctx.closePath();
    ctx.font='20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Submit', 350, 247);

    ctx.font = '40px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.fillText(open_name, 20, 440);
}

var open_name;
var colorIndex = 0;
var colors = ['#F0F8FF', '#FAEBD7', '#00FFFF', '#7FFFD4', '#F0FFFF', '#F5F5DC',
              '#FFEBCD', '#0000FF', '#8A2BE2', '#A52A2A', '#DEB887', '#5F9EA0',
              '#7FFF00', '#D2691E', '#FF7F50', '#6495ED', '#FFF8DC', '#DC143C',
              '#00FFFF', '#00008B', '#008B8B', '#B8860B', '#A9A9A9', '#006400',
              '#BDB76B', '#8B008B', '#556B2F', '#FF8C00', '#9932CC', '#8B0000'];
var shapeIndex = 0;

function customizeBlockMouseHandler(evt) {
    var relativeX = evt.clientX - canvas.offsetLeft;
    var relativeY = evt.clientY - canvas.offsetTop;
    if (relativeX >= 240 && relativeX <= 340 &&
        relativeY >= 60 && relativeY <= 100) {
        if (colorIndex < colors.length) {
            colorIndex++;
        }
        else {
            colorIndex = 0;
        }
        customizeDrawCycle();
    }
    if (relativeX >= 360 && relativeX <= 460 &&
        relativeY >= 60 && relativeY <= 100) {
        if (colorIndex > 0) {
            colorIndex--;
        }
        else {
            colorIndex = colors.length - 1;
        }
        customizeDrawCycle();
    }
    if (relativeX >= 240 && relativeX <= 340 &&
        relativeY >= 160 && relativeY <= 200) {
        if (shapeIndex > 0) {
            shapeIndex--;
        }
        else {
            shapeIndex = 2
        }
        customizeDrawCycle();
    }
    if (relativeX >= 360 && relativeX <= 460 &&
        relativeY >= 160 && relativeY <= 200) {
        if (shapeIndex < 2) {
            shapeIndex++;
        }
        else {
            shapeIndex = 0;
        }
        customizeDrawCycle();
    }
    if (relativeX >= 240 && relativeX <= 460 &&
        relativeY >= 220 && relativeY <= 260) {
        registerNewBlock();
    }
}

function registerNewBlock() {
    var shape;
    switch (shapeIndex) {
        case 0:
            shape = 'square';
            break;
        case 1:
            shape = 'circle';
            break;
        case 2:
            shape = 'triangle';
            break;
    }
    var block = {
        username : open_name,
        password : sha256_digest(element('register-password1').value),
        color    : colors[colorIndex],
        shape    : shape
    };
    socket.emit('register_request', block);
    document.removeEventListener('mousedown', customizeBlockMouseHandler, false);
}

function keyDownHandler(evt) {
    var change = false;
    switch(evt.keyCode) {
        case 38:
        case 87:
            if (!direction.up) {
                direction.up = true;
                change = true;
            }
            break;
        case 37:
        case 65:
            if (!direction.left) {
                direction.left = true;
                change = true;
            }
            break;
        case 39:
        case 68:
            if (!direction.right) {
                direction.right = true;
                change = true;
            }
            break;
        case 40:
        case 83:
            if (!direction.down) {
                direction.down = true;
                change = true;
            }
            break;
    }
    if (change)
        moveRequest();
}
function keyUpHandler(evt) {
    var change = false;
    switch(evt.keyCode) {
        case 38:
        case 87:
            if (direction.up) {
                direction.up = false;
                change = true;
            }
            break;
        case 40:
        case 83:
            if (direction.down) {
                direction.down = false;
                change = true;
            }
            break;
        case 37:
        case 65:
            if (direction.left) {
                direction.left = false;
                change = true;
            }
            break;
        case 39:
        case 68:
            if (direction.right) {
                direction.right = false;
                change = true;
            }
            break;
    }
    if (change)
        moveRequest();
}

function initChat() {
    element('message-form').style.display = 'block';
    element('chat-box-select').style.display = 'block';
    element('chat-box').style.display = 'block';
    element('chat-box-dropdown').onchange = chatBoxChanger;
    chatGroups.global = element('chat-box').querySelector('#global-chat-messages');
    currentChatGroup = 'global';
}

function playerListRequest() {
    socket.emit('player_list_request', '');
}

function chatBoxChanger() {
    var selected = element('chat-box-dropdown').value;
    if (currentChatGroup === 'global') {
        element('global-chat-messages').style.display = 'none';
    }
    else {
        element('chat-messages-player-' + currentChatGroup).style.display = 'none';
    }
    if (selected === 'global') {
        element('global-chat-messages').style.display = 'block';
        element('message-form').onsubmit = messageEntered;
    }
    else {
        element('chat-messages-player-' + selected).style.display = 'block';
        element('message-form').onsubmit = privateMessage;
    }
    currentChatGroup = selected;
}

function privateMessage() {
    var message = {
        username : currentChatGroup,
        message : element('message-input').value
    };
    socket.emit('private_message', message);
    element('message-input').value = '';
    return false;
}

window.onload = function() {
    canvas = element('myCanvas');
    ctx = canvas.getContext('2d');
    loginScreen();
    initSocket();
}