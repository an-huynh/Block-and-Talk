var canvas;
var ctx;
var socket;
var players;
var messages = {};
var currentMessageBox = 'global';
var direction = {
    left  : false,
    right : false,
    up    : false,
    down  : false
};

window.onload = function() {
    canvas = element('myCanvas');
    ctx = canvas.getContext('2d');
    loginMenu();
}

function loginMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // LARGE LOGO
    ctx.textAlign = 'center';
    ctx.font = '55px Helvetica';
    ctx.fillText('Block and Talk', canvas.width / 2, canvas.height / 2);

    // LOGIN BUTTON RECTANGLE
    ctx.beginPath();
    ctx.rect(canvas.width / 2 - 130, 270, 110, 30);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();

    // LOGIN BUTTON TEXT
    ctx.font = '25px Helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText('Login', canvas.width / 2 - 75, 293);

    // REGISTER BUTTON
    ctx.beginPath();
    ctx.rect(canvas.width / 2 + 20, 270, 110, 30);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();

    // REGISTER BUTTON TEXT
    ctx.font='25px Helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText('Register', canvas.width / 2 + 75, 293);

    initLoginMenuSockets();
    document.addEventListener('mousedown', loginMenuHandler, false);
    element('login').onsubmit = loginRequest;
    element('register').onsubmit = registerRequest;
}

function initLoginMenuSockets() {
    socket = io();
    socket.on('login_response', function(msg) {
        if (msg) {
            gameInit();
        }
        else
            alert('Invalid username or password');
    });
    socket.on('open_name_response', function(msg) {
        if (msg) {
            newPlayerInfo.openName = msg;
            initRegistration();
        }
        else
            alert('Name taken');
    });
    socket.on('register_response', function(msg) {
        if (msg) {
            gameInit();
        }
        else
            alert('Something bad happened');
    });
    socket.on('player_addition', function(msg) {});
    socket.on('player_removal', function(msg) {});
    socket.on('player_list_response', function(msg) {});
    socket.on('message_post', function(msg) {});
    socket.on('private_message', function(msg) {});
}

function initGameSockets() {
    socket.on('login_response', function(msg) {});
    socket.on('open_name_response', function(msg) {});
    socket.on('register_response', function(msg) {});
    socket.on('player_addition', function(msg) {
        playerAddition(msg.username);
        players[msg.username] = msg;
        drawGame();
    });
    socket.on('player_removal', function(msg) {
        delete players.msg;
        element('chat-box').removeChild(element('chat-messages-player-' + msg));
        element('chat-box-dropdown').removeChild(element('drop-down-' + msg));
        drawGame();
    });
    socket.on('player_list_response', function(msg) {
        players = msg;
        drawGame();
    });
    socket.on('message_list_response', function(msg) {
        for (var i = 0; i < msg.length; i++)
            playerAddition(msg[i]);
    });
    socket.on('message_post', function(msg) {
        var newMessage = element('message-template').content.cloneNode(true);
        newMessage.querySelector('.message-username').textContent = msg.username;
        newMessage.querySelector('.message-content').textContent = msg.message;
        element('global-chat-messages').appendChild(newMessage);
        element('chat-box').scrollTop = element('chat-box').scrollHeight;
        if (!messages[msg.username])
            messages[msg.username] = {};
        messages[msg.username].message = msg.message;
        messages[msg.username].time = Date.now();
        messages[msg.username].color = 'black';
        drawGame();
    });
    socket.on('private_message', function(msg) {
        var newMessage = element('message-template').content.cloneNode(true);
        newMessage.querySelector('.message-username').textContent = msg.sender;
        newMessage.querySelector('.message-content').textContent = msg.message;
        var group = msg.reciever;
        if (element('chat-messages-player-' + msg.sender))
            group = msg.sender;
        element('chat-messages-player-' + group).appendChild(newMessage);
        element('chat-box').scrollTop = element('chat-box').scrollHeight;
        if (!messages[msg.sender])
            messages[msg.sender] = {};
        messages[msg.sender].message = msg.message;
        messages[msg.sender].time = Date.now();
        messages[msg.sender].color = 'red';
        drawGame();
    });
}

function gameInit() {
    initGameSockets();
    chatBoxInitialize();
    socket.emit('player_list_request', '');
    socket.emit('message_list_request', '');
    document.removeEventListener('mousedown', loginMenuHandler, false);
    window.onkeydown = keyDownHandler;
    window.onkeyup = keyUpHandler;
}

function playerAddition(name) {
    var messageBox = document.createElement('ul');
    messageBox.className = 'messages';
    messageBox.id = 'chat-messages-player-' + name;
    messageBox.style.display = 'none';
    element('chat-box').appendChild(messageBox);

    var dropDown = document.createElement('option');
    dropDown.value = 'a' + name;
    dropDown.id = 'drop-down-' + name;
    dropDown.textContent = name;
    element('chat-box-dropdown').appendChild(dropDown);
}

function loginRequest() {
    socket.emit('login_request', {
        username : element('login-username').value,
        password : sha256_digest(element('login-password').value)
    });
    return false;
}

function registerRequest() {
    if (element('register-password1').value === element('register-password2').value)
        socket.emit('open_name_request', element('register-username').value);
    else
        alert('passwords do not match');
    return false;
}

function initRegistration() {
    document.removeEventListener('mousedown', loginMenuHandler, false);
    element('register').style.display = 'none';
    document.addEventListener('mousedown', creationClickHandler, false);
    creationMenuDraw();
}

var newPlayerInfo = {
    openName   : null,
    colorIndex : 0,
    shapeIndex : 0
};

var colors = ['#F0F8FF', '#FAEBD7', '#00FFFF', '#7FFFD4', '#F0FFFF', '#F5F5DC',
              '#FFEBCD', '#0000FF', '#8A2BE2', '#A52A2A', '#DEB887', '#5F9EA0',
              '#7FFF00', '#D2691E', '#FF7F50', '#6495ED', '#FFF8DC', '#DC143C',
              '#00FFFF', '#00008B', '#008B8B', '#B8860B', '#A9A9A9', '#006400',
              '#BDB76B', '#8B008B', '#556B2F', '#FF8C00', '#9932CC', '#8B0000'];

function creationMenuDraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    // DRAW CHARACTER ENTITY LARGE
    if (newPlayerInfo.shapeIndex === 0)
        ctx.rect(20, 20, 200, 200);
    else if (newPlayerInfo.shapeIndex === 1)
        ctx.arc(120, 120, 100, 0, 2*Math.PI);
    else if (newPlayerInfo.shapeIndex === 2) {
        ctx.moveTo(120, 20);
        ctx.lineTo(220, 220);
        ctx.lineTo(20, 220);
    }
    else if (newPlayerInfo.shapeIndex === 3) {
        ctx.moveTo(120, 20);
        ctx.lineTo(200, 220);
        ctx.lineTo(20, 90);
        ctx.lineTo(220, 90);
        ctx.lineTo(40, 220);
    }
    ctx.fillStyle = colors[newPlayerInfo.colorIndex];
    ctx.fill();
    ctx.closePath();

    // Draw Button Type
    ctx.font = '30px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';
    ctx.fillText('Color', 350, 42);

    // Draw Color back button
    ctx.beginPath();
    ctx.rect(240, 60, 100, 40);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();

    // Back Button Text
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText('Back', 290, 87);

    // Draw forward color button
    ctx.beginPath();
    ctx.rect(360, 60, 100, 40);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();

    // Forward button Text
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText('Next', 410, 87);

    // Draw Button Type - shape
    ctx.font = '30px helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText('Shape', 350, 140);

    // Back Shape button
    ctx.beginPath();
    ctx.rect(240, 160, 100, 40);
    ctx.fillStyle = 'red';
    ctx.fill();

    // Back Shape Button Text
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText('Back', 290, 187);

    // forward shape button
    ctx.beginPath();
    ctx.rect(360, 160, 100, 40);
    ctx.fillStyle = 'red';
    ctx.fill();

    // Forward shape button text
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText('Next', 410, 187);

    // Submit Button
    ctx.beginPath();
    ctx.rect(240, 220, 220, 40);
    ctx.fillStyle = 'green';
    ctx.fill();
    ctx.closePath();

    // submit button text
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText('Submit', 350, 247);

    // Name
    ctx.font = '40px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.fillText(newPlayerInfo.openName, 20, 440);

}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var key in players) {
        ctx.beginPath();
        if (players[key].shape === 'square')
            ctx.rect(players[key].posx, players[key].posy, 20, 20);
        else if (players[key].shape === 'circle')
            ctx.arc(players[key].posx + 10, players[key].posy + 10, 10, 0, 2*Math.PI);
        else if (players[key].shape === 'triangle') {
            ctx.moveTo(players[key].posx + 10, players[key].posy);
            ctx.lineTo(players[key].posx, players[key].posy + 20);
            ctx.lineTo(players[key].posx + 20, players[key].posy + 20);
        }
        else if (players[key].shape === 'star') {
            ctx.moveTo(players[key].posx + 10, players[key].posy);
            ctx.lineTo(players[key].posx + 18, players[key].posy + 20);
            ctx.lineTo(players[key].posx, players[key].posy + 7);
            ctx.lineTo(players[key].posx + 20, players[key].posy + 7);
            ctx.lineTo(players[key].posx + 2, players[key].posy + 20);
        }
        ctx.fillStyle = players[key].color;
        ctx.fill();
        ctx.closePath();
    }
    for (var key in messages) {
        if (messages[key].time > Date.now() - 10000) {
            ctx.font = '20px Helvetica';
            ctx.textAlign = 'center';
            ctx.fillStyle = messages[key].color;
            ctx.fillText(messages[key].message, players[key].posx + 10, players[key].posy - 10, 200);
        }
    }
}

function chatBoxInitialize() {
    element('login').style.display = 'none';
    element('register').style.display = 'none';
    element('chat-box-dropdown').style.display = 'block';
    element('chat-box').style.display = 'block';
    element('message-form').style.display = 'block';

    element('message-form').onsubmit = messagePost;
    element('message-input').onfocus = writing;
    element('message-input').onblur = notWriting;
    currentChatGroup = 'global';
    element('chat-box-dropdown').onchange = chatBoxChanger;

}

function chatBoxChanger() {
    var selected = element('chat-box-dropdown').value;
    if (currentChatGroup === 'global')
        element('global-chat-messages').style.display = 'none';
    else
        element('chat-messages-player-' + currentChatGroup).style.display = 'none';
    if (selected === 'global') {
        element('global-chat-messages').style.display = 'block';
        element('message-form').onsubmit = messagePost;
    }
    else {
        selected = selected.substr(1);
        element('chat-messages-player-' + selected).style.display = 'block';
        element('message-form').onsubmit = privateMessagePost;
    }
    currentChatGroup = selected;
}

function messagePost() {
    socket.emit('message_post', element('message-input').value);
    element('message-input').value = '';
    return false;
}

function privateMessagePost() {
    var message = {
        destination  : currentChatGroup,
        message      : element('message-input').value
    };
    socket.emit('private_message_post', message);
    element('message-input').value = '';
    return false;
}

function directionUpdate() {
    var dir = null;
    if (direction.up && !direction.down) {
        if (direction.left && !direction.right)
            dir = 'up-left';
        else if (direction.right && !direction.left)
            dir = 'up-right';
        else
            dir = 'up';
    }
    else if (direction.down && !direction.up) {
        if (direction.left && !direction.right)
            dir = 'down-left';
        else if (direction.right && !direction.left)
            dir = 'down-right';
        else
            dir = 'down';
    }
    else if (direction.left && !direction.right)
        dir = 'left';
    else if (direction.right && !direction.left)
        dir = 'right';
    socket.emit('direction_update', dir);
}

function registerCreation() {
    var shape;
    if (newPlayerInfo.shapeIndex === 0)
        shape = 'square';
    else if (newPlayerInfo.shapeIndex === 1)
        shape = 'circle';
    else if (newPlayerInfo.shapeIndex === 2)
        shape = 'triangle';
    else if (newPlayerInfo.shapeIndex === 3)
        shape = 'star';
    var block = {
        username : newPlayerInfo.openName,
        password : sha256_digest(element('register-password1').value),
        color    : colors[newPlayerInfo.colorIndex],
        shape    : shape
    };
    socket.emit('register_request', block);
    document.removeEventListener('mousedown', creationClickHandler, false);
}

function writing() {
    window.onkeydown = function() {};
    window.onkeyup = function() {};
}

function notWriting() {
    window.onkeydown = keyDownHandler;
    window.onkeyup = keyUpHandler;
}

function element(id) {
    return document.getElementById(id);
}

// EVENT LISTENERS
function loginMenuHandler(evt) {
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

function keyDownHandler(evt) {
    var changed = false;
    if (evt.keyCode == 38 || evt.keyCode == 87 && !direction.up) {
        direction.up = true;
        changed = true;
    }
    else if (evt.keyCode == 37 || evt.keyCode == 65 && !direction.left) {
        direction.left = true;
        changed = true;
    }
    else if (evt.keyCode == 39 || evt.keyCode == 68 && !direction.right) {
        direction.right = true;
        changed = true;
    }
    else if (evt.keyCode == 40 || evt.keyCode == 83 && !direction.down) {
        direction.down = true;
         changed = true;
    }
    if (changed)
        directionUpdate();
}

function keyUpHandler(evt) {
    var changed = false;
    if (evt.keyCode == 38 || evt.keyCode == 87) {
        if (direction.up) {
            direction.up = false;
            changed = true;
        }
    }
    else if (evt.keyCode == 37 || evt.keyCode == 65) {
        if (direction.left) {
            direction.left = false;
            changed = true;
        }
    }
    else if (evt.keyCode == 39 || evt.keyCode == 68) {
        if (direction.right) {
            direction.right = false;
            changed = true;
        }
    }
    else if (evt.keyCode == 40 || evt.keyCode == 83) {
        if (direction.down) {
            direction.down = false;
            changed = true;
        }
    }
    if (changed)
        directionUpdate();
}

function creationClickHandler(evt) {
    var relativeX = evt.clientX - canvas.offsetLeft;
    var relativeY = evt.clientY - canvas.offsetTop;
    if (relativeX >= 240 && relativeX <= 340 &&
        relativeY >= 60 && relativeY <= 100) {
        if (newPlayerInfo.colorIndex > 0) {
            newPlayerInfo.colorIndex--;
        }
        else {
            newPlayerInfo.colorIndex = colors.length - 1;
        }
        creationMenuDraw();
    }
    if (relativeX >= 360 && relativeX <= 460 &&
        relativeY >= 60 && relativeY <= 100) {
        if (newPlayerInfo.colorIndex < colors.length) {
            newPlayerInfo.colorIndex++;
        }
        else {
            newPlayerInfo.colorIndex = 0;
        }
        creationMenuDraw();
    }
    if (relativeX >= 240 && relativeX <= 340 &&
        relativeY >= 160 && relativeY <= 200) {
        if (newPlayerInfo.shapeIndex > 0) {
            newPlayerInfo.shapeIndex--;
        }
        else {
            newPlayerInfo.shapeIndex = 3
        }
        creationMenuDraw();
    }
    if (relativeX >= 360 && relativeX <= 460 &&
        relativeY >= 160 && relativeY <= 200) {
        if (newPlayerInfo.shapeIndex < 3) {
            newPlayerInfo.shapeIndex++;
        }
        else {
            newPlayerInfo.shapeIndex = 0;
        }
        creationMenuDraw();
    }
    if (relativeX >= 240 && relativeX <= 460 &&
        relativeY >= 220 && relativeY <= 260) {
        registerCreation();
    }
}
