// GLOBALS
var socket;
var players = {};
var messages = {};
var canvas;
var ctx;

var x_direction = null;
var y_direction = null;
var moving = null;

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
            alert('User does not exist');
        }
    });
    socket.on('register_response', function(msg) {
        if (msg) {
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
        console.log('drawing');
    });
    socket.on('move_response', function(msg) {
        players[msg['username']] = msg['array'];
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
    window.onkeydown = keyDownHandler;
    window.onkeyup = keyUpHandler;
    document.removeEventListener('mousedown', mouseDownHandler);
    initSocketLoggedIn();
    //socket.emit('update_request', '');
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
    console.log('moving');
    if (x_direction || y_direction) {
        var direction;
        if (x_direction && !y_direction) {
            direction = x_direction;
        }
        if (y_direction && !x_direction) {
            direction = y_direction;
        }
        if (x_direction && y_direction) {
            if (x_direction == 'left' && y_direction == 'up') {
                direction = 'up-left';
            }
            else if (x_direction == 'right' && y_direction == 'up') {
                direction = 'up-right';
            }
            else if (x_direction == 'left' && y_direction == 'down') {
                direction = 'down-left';
            }
            else if (x_direction == 'right' && y_direction == 'down') {
                direction = 'down-right';
            }
        }
        socket.emit('move_request', direction);
    }
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
        ctx.rect(players[key]['posx'], players[key]['posy'], 20, 20);
        ctx.fillStyle = players[key]['color'];
        ctx.fill();
        ctx.closePath();
    }
    for (var key in messages) {
        if (messages[key]['time'] > Date.now() - 10000) {
            ctx.font = '20px Helvetica';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'black';
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
            ctx.arc(120, 120, 200, 0, 2*Math.PI);
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
    ctx.fillText(open_name, 20, 260);
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
            shapeIndex++;
        }
        else {
            shapeIndex = 0;
        }
        customizeDrawCycle();
        console.log('shape back');
    }
    if (relativeX >= 360 && relativeX <= 460 &&
        relativeY >= 160 && relativeY <= 200) {
        if (shapeIndex > 0) {
            shapeIndex--;
        }
        else {
            shapeIndex = 2;
        }
        customizeDrawCycle();
        console.log('shape next');
    }
    if (relativeX >= 240 && relativeX <= 460 &&
        relativeY >= 220 && relativeY <= 260) {
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

function keyDownHandler(evt) {
    switch(evt.keyCode) {
        case 38:
        case 87:
            y_direction = 'up';
            break;
        case 37:
        case 65:
            x_direction = 'left';
            break;
        case 39:
        case 68:
            x_direction = 'right';
            break;
        case 40:
        case 83:
            y_direction = 'down'
            break;
    }
    if (!moving)
        moving = setInterval(moveRequest, 1000 / 60);
}
function keyUpHandler(evt) {
    switch(evt.keyCode) {
        case 38:
        case 87:
        case 40:
        case 83:
            y_direction = null
            break;
        case 37:
        case 65:
        case 39:
        case 68:
            x_direction = null;
            break;
    }
    if (!x_direction && !y_direction){
        clearInterval(moving);
        moving = null;
    }
}
