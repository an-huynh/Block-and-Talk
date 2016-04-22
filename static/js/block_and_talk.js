var canvas;
var ctx;
var socket;
var players;
var messages = {};
var socketFunctions = {
    loginResponse: function() {},
    registerResponse: function() {},
    openNameResponse: function() {},
    playerListResponse: function() {},
    globalAddition: function() {},
    zoneAddition: function() {},
    friendAddition: function() {},
    playerRemoval: function() {},
    zoneUpdate: function() {},
    currentZone: function() {},
    newMessage: function() {},
    newPM: function() {},
    stopGame: function() {},
    startSnake: function() {},
    snakeUpdate: function() {},
    stopSnake: function() {},
    startRPS: function() {},
    rpsResult: function() {}
};
var direction = {
    left  : false,
    right : false,
    up    : false,
    down  : false
};
var minigameStuff = {
    rpsSelected: null
};

window.onload = function() {
    canvas = elt('myCanvas');
    ctx = canvas.getContext('2d');
    initSockets();
    startLoginFunctions();
    startMenu();
}

function elt(id) {
    return document.getElementById(id);
}

function startMenu() {
    drawStartMenu();
    document.addEventListener('mousedown', startMenuHandler, false);
    elt('login').onsubmit = loginRequest;
    elt('register').onsubmit = registerRequest;
}

function stopMenu() {
    document.removeEventListener('mousedown', startMenuHandler, false);
    elt('login').style.display = 'none';
    elt('register').style.display = 'none';
}

function startCreationMenu() {
    document.addEventListener('mousedown', creationClickHandler, false);
    creationMenuDraw();
}

function stopCreationMenu() {
    document.removeEventListener('mousedown', creationClickHandler, false);
}

function startGame() {
    socket.emit('currentZoneRequest');
    window.onkeydown = gameKeyDown;
    window.onkeyup = gameKeyUp;
    socket.emit('zoneRequest');
    socket.emit('playerListRequest');
}

function stopGame() {
    window.onkeydown = null;
    window.onkeyup = null;
}

function startSnake(scoreList) {
    stopGame();
    pauseChatBox();
    window.onkeydown = snakeHandler;
    snakeScoreDraw(scoreList);
}

function stopSnake() {
    startGame();
    unpauseChatBox();
}

function startRPS() {
    stopGame();
    pauseChatBox();
    drawRPS();
    document.addEventListener('click', rpsHandler);
}

function stopRPS() {
    document.removeEventListener('click', rpsHandler);
    document.addEventListener('click', rpsResultHandler);
}

function startChatBox() {
    var newGlobalChat = document.createElement('ul');
    newGlobalChat.className = 'messages';
    newGlobalChat.id = 'global-chat-messages';
    var newGlobalOption = document.createElement('option');
    newGlobalOption.value = 'global';
    newGlobalOption.innerHTML = 'global';
    elt('chat-box-dropdown').appendChild(newGlobalOption);
    elt('chat-box').appendChild(newGlobalChat);
    elt('chat-box-dropdown').style.display = 'block';
    elt('chat-box').style.display = 'block';
    elt('message-form').style.display = 'block';
    elt('playerlist-box').style.display = 'block';
    socket.emit('playerListRequest', '');

    elt('message-input').onfocus = typingMessage;
    elt('message-input').onblur = notTypingMessage;
    elt('message-form').onsubmit = sendMessage;
    elt('chat-box-dropdown').onchange = chatBoxHandler;
}

function pauseChatBox() {
    elt('chat-box-dropdown').style.display = 'none';
    elt('chat-box').style.display = 'none';
    elt('message-form').style.display = 'none';
    elt('playerlist-box').style.display = 'none';

    elt('message-input').onfocus = null;
    elt('message-input').onblur = null;
}

function unpauseChatBox() {
    elt('chat-box-dropdown').style.display = 'block';
    elt('chat-box').style.display = 'block';
    elt('message-form').style.display = 'block';
    elt('playerlist-box').style.display = 'block';

    elt('message-input').onfocus = typingMessage;
    elt('message-input').onblur = notTypingMessage;
}

function stopChatBox() {
    elt('chat-box-dropdown').style.display = 'none';
    elt('chat-box').style.display = 'none';
    elt('message-form').style.display = 'none';
    elt('playerlist-box').style.display = 'none';

    var dropDown = elt('chat-box-dropdown');
    while (dropDown.lastChild) {
        dropDown.removeChild(dropDown.lastChild);
    }

    var chatBox = elt('chat-box');
    while (chatBox.lastChild) {
        chatBox.removeChild(chatBox.lastChild);
    }
    var playerList = elt('global-chat-players');
    while (playerList.lastChild) {
        playerList.removeChild(playerList.lastChild);
    }
    elt('message-input').onfocus = null;
    elt('message-input').onblur = null;
    elt('message-form').onsubmit = null;
    elt('chat-box-dropdown').onchange = null;

}

function sendMessage() {
    if (elt('message-input').value !== '') {
        socket.emit('messagePost', elt('message-input').value);
        elt('message-input').value = '';
    }
    return false;
}

function sendPM() {
    if (elt('message-input').value !== '') {
        var message = {
            destination: elt('chat-box-dropdown').value.substr(1),
            message: elt('message-input').value
        };
        socket.emit('pmPost', message);
        elt('message-input').value = '';
    }
    return false;
}

function playerListAdd(name) {
    if (!elt('playerlist-' + name)) {
        var newPlayer = document.createElement('section');
        newPlayer.id = 'playerlist-' + name;
        newPlayer.className = 'players';
        newPlayer.textContent = name;
        elt('global-chat-players').appendChild(newPlayer);
    }
}

function addFriend(name) {
    var messageBox = document.createElement('ul');
    messageBox.className = 'messages';
    messageBox.id = 'chat-messages-player-' + name;
    messageBox.style.display = 'none';
    elt('chat-box').appendChild(messageBox);

    var dropDown = document.createElement('option');
    dropDown.value = 'a' + name;
    dropDown.id = 'drop-down-' + name;
    dropDown.textContent = name;
    elt('chat-box-dropdown').appendChild(dropDown);
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
    socket.emit('directionUpdate', dir);
}

function loginRequest() {
    socket.emit('loginRequest', {
        username: elt('login-username').value,
        password: sha256_digest(elt('login-password').value)
    });
    return false;
}

function registerRequest() {
    if (/^[a-z0-9_]+$/i.test(elt('register-username').value)) {
        if (elt('register-password1').value === elt('register-password2').value &&
            elt('register-password1').value.length >= 6)
            socket.emit('openNameRequest', elt('register-username').value);
        else
            alert('passwords do not match or are less than 6 characters');
    }
    else
        alert('Name can only contain numbers, letters, and _')
    return false;
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var key in players) {
        ctx.beginPath();
        if (players[key].shape === 'square')
            ctx.rect(players[key].posX, players[key].posY, 20, 20);
        else if (players[key].shape === 'circle')
            ctx.arc(players[key].posX + 10, players[key].posY + 10, 10, 0, 2*Math.PI);
        else if (players[key].shape === 'triangle') {
            ctx.moveTo(players[key].posX + 10, players[key].posY);
            ctx.lineTo(players[key].posX, players[key].posY + 20);
            ctx.lineTo(players[key].posX + 20, players[key].posY + 20);
            ctx.lineTo(players[key].posX + 10, players[key].posY);
        }
        else if (players[key].shape === 'star') {
            ctx.moveTo(players[key].posX + 10, players[key].posY);
            ctx.lineTo(players[key].posX + 18, players[key].posY + 20);
            ctx.lineTo(players[key].posX, players[key].posY + 7);
            ctx.lineTo(players[key].posX + 20, players[key].posY + 7);
            ctx.lineTo(players[key].posX + 2, players[key].posY + 20);
            ctx.lineTo(players[key].posX + 10, players[key].posY);
        }
        else if (players[key].shape === 'pentagram') {
            ctx.moveTo(players[key].posX + 10, players[key].posY);
            ctx.lineTo(players[key].posX + 17.0710678119, players[key].posY + 17.0710678119);
            ctx.lineTo(players[key].posX + 1.33974596216, players[key].posY + 5);
            ctx.lineTo(players[key].posX + 18.6602540378, players[key].posY + 5);
            ctx.lineTo(players[key].posX + 2.92893218813, players[key].posY + 17.0710678119);
            ctx.lineTo(players[key].posX + 10, players[key].posY);
        }
        ctx.fillStyle = players[key].color;
        ctx.fill();
        ctx.strokeStyle = players[key].stroke;
        ctx.stroke();
        ctx.closePath();
        if (players[key].shape === 'pentagram') {
            ctx.beginPath();
            ctx.arc(players[key].posX + 10, players[key].posY + 10, 10, 0, 2*Math.PI);
            ctx.strokeStyle = players[key].stroke;
            ctx.stroke();
            ctx.closePath();
        }
    }
    for (var key in messages) {
        if (key in players && messages[key].time > Date.now() - 10000) {
            ctx.font = '20px Helvetica';
            ctx.textAlign = 'center';
            ctx.fillStyle = messages[key].color;
            ctx.fillText(messages[key].message, players[key].posX + 10, players[key].posY - 10, 200);
        }
    }
}

function drawStartMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // LARGE LOGO
    ctx.textAlign = 'center';
    ctx.font = '55px Lemon_Milk';
    ctx.fillStyle = 'black';
    ctx.fillText('Block and Talk', canvas.width / 2, canvas.height / 2);

    // LOGIN BUTTON RECTANGLE
    ctx.beginPath();
    ctx.rect(canvas.width / 2 - 130, 270, 110, 30);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.stroke();
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
    ctx.strokeStyle = 'black';
    ctx.stroke();
    ctx.closePath();

    // REGISTER BUTTON TEXT
    ctx.font='25px Helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText('Register', canvas.width / 2 + 75, 293);
}

var newPlayerInfo = {
    openName   : null,
    colorIndex : 0,
    shapeIndex : 0,
    strokeIndex : 0
};

var colors = ['#F0F8FF', '#FAEBD7', '#00FFFF', '#7FFFD4', '#F0FFFF', '#F5F5DC',
              '#FFEBCD', '#0000FF', '#8A2BE2', '#A52A2A', '#DEB887', '#5F9EA0',
              '#7FFF00', '#D2691E', '#FF7F50', '#6495ED', '#FFF8DC', '#DC143C',
              '#00FFFF', '#00008B', '#008B8B', '#B8860B', '#A9A9A9', '#006400',
              '#BDB76B', '#8B008B', '#556B2F', '#FF8C00', '#9932CC', '#8B0000'];
var strokes = ['#50585F', '#5A4B37', '#005F5F', '#0C5F34', '#505F5F', '#55553C',
              '#5F4B2D', '#00005F', '#080342', '#050303', '#3E1805', '#0A0D00',
              '#0D5F00', '#320A00', '#5F0C00', '#00043D', '#5F583C', '#3C0005',
              '#005F5F', '#000009', '#000909', '#280402', '#191919', '#001F00',
              '#2D2707', '#090009', '#101707', '#5F1A00', '#18112C', '#190000'];

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
    else if (newPlayerInfo.shapeIndex === 4)
        shape = 'pentagram';
    var block = {
        username : elt('register-username').value,
        password : sha256_digest(elt('register-password1').value),
        color    : colors[newPlayerInfo.colorIndex],
        shape    : shape,
        stroke   : strokes[newPlayerInfo.strokeIndex]
    };
    socket.emit('registerRequest', block);
    document.removeEventListener('mousedown', creationClickHandler, false);
}

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
        ctx.lineTo(120, 20);
    }
    else if (newPlayerInfo.shapeIndex === 3) {
        ctx.moveTo(120, 20);
        ctx.lineTo(200, 220);
        ctx.lineTo(20, 90);
        ctx.lineTo(220, 90);
        ctx.lineTo(40, 220);
        ctx.lineTo(120, 20);
    }
    else if (newPlayerInfo.shapeIndex === 4) {
        ctx.moveTo(120, 20);
        ctx.lineTo(190.710678119, 190.710678119);
        ctx.lineTo(33.3974596216, 70);
        ctx.lineTo(206.602540378, 70);
        ctx.lineTo(49.2893218813, 190.710678119);
        ctx.lineTo(120, 20);
    }
    ctx.fillStyle = colors[newPlayerInfo.colorIndex];
    ctx.fill();
    ctx.strokeStyle = strokes[newPlayerInfo.strokeIndex];
    ctx.stroke();
    ctx.closePath();
    if(newPlayerInfo.shapeIndex === 4) {
        ctx.beginPath();
        ctx.arc(120, 120, 100, 0, 2*Math.PI);
        ctx.strokeStyle = strokes[newPlayerInfo.strokeIndex];
        ctx.stroke();
        ctx.closePath();
    }

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
    ctx.strokeStyle = 'black';
    ctx.stroke();
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
    ctx.strokeStyle = 'black';
    ctx.stroke();
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
    ctx.strokeStyle = 'black';
    ctx.stroke();
    ctx.closePath();

    // Back Shape Button Text
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText('Back', 290, 187);

    // forward shape button
    ctx.beginPath();
    ctx.rect(360, 160, 100, 40);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.stroke();
    ctx.closePath();

    // Forward shape button text
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText('Next', 410, 187);

    // Submit Button
    ctx.beginPath();
    ctx.rect(240, 220, 220, 40);
    ctx.fillStyle = 'green';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.stroke();
    ctx.closePath();

    // submit button text
    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText('Submit', 350, 247);

    // Name
    ctx.font = '40px Helvetica';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.fillText(elt('register-username').value, 20, 440);
}

function snakeDraw(msg) {
    ctx.clearRect(0, 0, canvas.height, canvas.height);
    ctx.beginPath();
    ctx.rect(20, 20, canvas.height - 40, canvas.height - 40);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();
    for (var i = 0; i < msg.snake.length; i++) {
        ctx.beginPath();
        ctx.rect(msg.snake[i].posX * 20, msg.snake[i].posY * 20, 20, 20);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    }
    ctx.beginPath();
    ctx.rect(msg.snack.posX * 20, msg.snack.posY * 20, 20, 20);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.closePath();

    ctx.clearRect(canvas.height, canvas.height - 50, canvas.width - canvas.height - 20, 30);
    ctx.beginPath();
    ctx.rect(canvas.height, canvas.height - 50, canvas.width - canvas.height - 20, 30);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.closePath();

    ctx.font = '20px Helvetica';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'black';
    ctx.fillText("Score: " + (msg.snake.length - 1), canvas.height + 4, canvas.height - 30);
}

function snakeScoreDraw(scores) {
    ctx.beginPath();
    ctx.rect(canvas.height, 20, canvas.width - canvas.height - 20, canvas.height - 50);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.closePath();

    for (var i = 0; i < scores.length; i++) {
        ctx.font = '20px Helvetica';
        ctx.textAlign = 'left';
        ctx.fillStyle = 'black';
        ctx.fillText(scores[i].score + ' ' + scores[i].username, canvas.height + 20, 50 + (22 * i));
    }
}

function drawRPSResult(msg) {
    ctx.fillStyle = 'black';
    ctx.font = '40px Helvetica';
    ctx.fillText('YOU ' + msg + '!', canvas.width / 2, 300);

    ctx.beginPath();
    ctx.rect(canvas.width / 2 - 50, 350, 100, 30);
    ctx.fillStyle = 'green';
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = 'black';
    ctx.font = '20px Helvetica';
    ctx.fillText('ESCAPE', canvas.width / 2, 372);
}

function drawRPS() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = '30px helvetica';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';
    ctx.fillText('ROCK, PAPER, SCISSORS', canvas.width / 2, 40);

    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'blue';
    if (minigameStuff.rpsSelected === 'Rock') {
        ctx.beginPath();
        ctx.rect(canvas.width / 2 - 100, 92.5, 200, 30);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    }
    ctx.fillStyle = 'blue';
    ctx.fillText('Rock', canvas.width / 2, 115);
    if (minigameStuff.rpsSelected === 'Paper') {
        ctx.beginPath();
        ctx.rect(canvas.width / 2 - 100, 142.5, 200, 30);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    }
    ctx.fillStyle = 'blue';
    ctx.fillText('Paper', canvas.width / 2, 165);
    if (minigameStuff.rpsSelected === 'Scissors') {
        ctx.beginPath();
        ctx.rect(canvas.width / 2 - 100, 192.5, 200, 30);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    }
    ctx.fillStyle = 'blue';
    ctx.fillText('Scissors', canvas.width / 2, 215.5);
}

function typingMessage() {
    window.onkeydown = function(){};
}

function notTypingMessage() {
    window.onkeydown = gameKeyDown;
}

function startMenuHandler(evt) {
    var relativeX = evt.clientX - canvas.offsetLeft;
    var relativeY = evt.clientY - canvas.offsetTop;
    if (relativeX >= canvas.width / 2 - 130 && relativeX <= canvas.width / 2 - 20 &&
        relativeY >= 270 && relativeY <= 300) {
        elt('register').style.display = 'none';
        elt('login').style.display = 'block';
    }
    if (relativeX >= canvas.width / 2 + 20 && relativeX <= canvas.width / 2 + 110 &&
        relativeY >= 270 && relativeY <= 300) {
        elt('login').style.display = 'none';
        elt('register').style.display = 'block';
    }
}

function creationClickHandler(evt) {
    var relativeX = evt.clientX - canvas.offsetLeft;
    var relativeY = evt.clientY - canvas.offsetTop;
    if (relativeX >= 240 && relativeX <= 340 &&
        relativeY >= 60 && relativeY <= 100) {
        if (newPlayerInfo.colorIndex > 0) {
            newPlayerInfo.colorIndex--;
            newPlayerInfo.strokeIndex--;
        }
        else {
            newPlayerInfo.colorIndex = colors.length - 1;
            newPlayerInfo.strokeIndex = strokes.length - 1;
        }
        creationMenuDraw();
    }
    if (relativeX >= 360 && relativeX <= 460 &&
        relativeY >= 60 && relativeY <= 100) {
        if (newPlayerInfo.colorIndex < colors.length - 1) {
            newPlayerInfo.colorIndex++;
            newPlayerInfo.strokeIndex++;
        }
        else {
            newPlayerInfo.colorIndex = 0;
            newPlayerInfo.strokeIndex = 0;
        }
        creationMenuDraw();
    }
    if (relativeX >= 240 && relativeX <= 340 &&
        relativeY >= 160 && relativeY <= 200) {
        if (newPlayerInfo.shapeIndex > 0) {
            newPlayerInfo.shapeIndex--;
        }
        else {
            newPlayerInfo.shapeIndex = 4
        }
        creationMenuDraw();
    }
    if (relativeX >= 360 && relativeX <= 460 &&
        relativeY >= 160 && relativeY <= 200) {
        if (newPlayerInfo.shapeIndex < 4) {
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

function gameKeyDown(evt) {
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

function gameKeyUp(evt) {
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

function chatBoxHandler() {
    var selected = elt('chat-box-dropdown').value;
    var chatMessages = document.getElementsByClassName('messages');
    for (var i = 0; i < chatMessages.length; i++)
        chatMessages[i].style.display = 'none';
    if (selected === 'global') {
        elt('global-chat-messages').style.display = 'block';
        elt('message-form').onsubmit = sendMessage;
    }
    else {
        selected = selected.substr(1);
        elt('chat-messages-player-' + selected).style.display = 'block';
        elt('message-form').onsubmit = sendPM;
    }
}

function snakeHandler(evt) {
    var direction = null;
    if (evt.keyCode == 38 || evt.keyCode == 87) {
        direction = 'up';
    }
    else if (evt.keyCode == 37 || evt.keyCode == 65) {
        direction = 'left';
    }
    else if (evt.keyCode == 39 || evt.keyCode == 68) {
        direction = 'right';
    }
    else if (evt.keyCode == 40 || evt.keyCode == 83) {
        direction = 'down';
    }
    if (direction !== null)
        socket.emit('snakeUpdate', direction);
}

function rpsHandler(evt) {
    var relativeX = evt.clientX - canvas.offsetLeft;
    var relativeY = evt.clientY - canvas.offsetTop;
    if (relativeX > canvas.width / 2 - 200 && relativeX < canvas.width / 2 + 200) {
        if (relativeY >= 92.5 && relativeY <= 122.5)
            minigameStuff.rpsSelected = 'Rock';
        else if (relativeY >= 142.5 && relativeY <= 172.5)
            minigameStuff.rpsSelected = 'Paper';
        else if (relativeY >= 192.5 && relativeY <= 222.5)
            minigameStuff.rpsSelected = 'Scissors';
    }
    if (minigameStuff.rpsSelected) {
        drawRPS();
        socket.emit('rpsUpdate', minigameStuff.rpsSelected);
    }
}

function rpsResultHandler(evt) {
    var relativeX = evt.clientX - canvas.offsetLeft;
    var relativeY = evt.clientY - canvas.offsetTop;
    if (relativeX >= canvas.width / 2 - 50 && relativeX <= canvas.width / 2 + 50 &&
        relativeY >= 350 && relativeY <= 380) {
        document.removeEventListener('click', rpsResultHandler, false);
        startGame();
        unpauseChatBox();
        unpauseGameFunctions();
    }
}

// INIT SOCKET
function initSockets() {
    socket = io();
    socket.on('loginResponse', function(msg) {socketFunctions.loginResponse(msg);});
    socket.on('registerResponse', function(msg) {socketFunctions.registerResponse(msg);});
    socket.on('openNameResponse', function(msg) {socketFunctions.openNameResponse(msg);});
    socket.on('playerListResponse', function(msg) {socketFunctions.playerListResponse(msg);});
    socket.on('globalAddition', function(msg) {socketFunctions.globalAddition(msg);});
    socket.on('friendAddition', function(msg) {socketFunctions.friendAddition(msg);});
    socket.on('playerRemoval', function(msg) {socketFunctions.playerRemoval(msg);});
    socket.on('zoneAddition', function(msg) {socketFunctions.zoneAddition(msg);});
    socket.on('zoneUpdate', function(msg) {socketFunctions.zoneUpdate(msg);});
    socket.on('currentZone', function(msg) {socketFunctions.currentZone(msg);});
    socket.on('newMessage', function(msg) {socketFunctions.newMessage(msg);});
    socket.on('newPM', function(msg) {socketFunctions.newPM(msg);});
    socket.on('stopGame', function(msg) {socketFunctions.stopGame();});
    socket.on('startSnake', function(msg) {socketFunctions.startSnake(msg);});
    socket.on('snakeUpdate', function(msg) {socketFunctions.snakeUpdate(msg);});
    socket.on('stopSnake', function(msg) {socketFunctions.stopSnake();});
    socket.on('startRPS', function(msg) {socketFunctions.startRPS();});
    socket.on('rpsResult', function(msg) {socketFunctions.rpsResult(msg);});
    socket.on('disconnect', function(msg) {alert('lost connection to server');});
}

// INIT LOGIN SOCKET FUNCTIONS
function startLoginFunctions() {
    socketFunctions.loginResponse = function(msg) {
        if (msg === true) {
            stopMenu();
            stopLoginFunctions();
            stopCreationMenu();
            startGameFunctions();
            startGame();
            startChatBox();
        }
        else
            alert(msg);
    };
    socketFunctions.registerResponse = function(msg) {
        if (msg === true) {
            stopMenu();
            stopLoginFunctions();
            stopCreationMenu();
            startGameFunctions();
            startGame();
            startChatBox();
        }
        else
            alert(msg);
    };
    socketFunctions.openNameResponse = function(msg) {
        if (msg){
            stopMenu();
            startCreationMenu();
        }
        else
            alert('Name unavailable');
    };
}

// UNITIALIZE SOCKET FUNCTIONS
function stopLoginFunctions() {
    socketFunctions.loginResponse = function(){};
    socketFunctions.registerResponse = function(){};
    socketFunctions.openNameResponse = function(){};
}

function startGameFunctions() {
    socketFunctions.globalAddition = function(msg) {
        playerListAdd(msg);
    };
    socketFunctions.playerListResponse = function(msg) {
        for (var i = 0; i < msg.length; i++)
            playerListAdd(msg[i]);
    };
    socketFunctions.zoneAddition = function(msg) {
        players[msg.username] = msg;
        drawGame();
    };
    socketFunctions.friendAddition = function(msg) {
        addFriend(msg);
    };
    socketFunctions.playerRemoval = function(msg) {
        if (elt('playerlist-' + msg))
            elt('global-chat-players').removeChild(elt('playerlist-' + msg));
        if (elt('chat-messages-player-' + msg)) {
            elt('chat-box').removeChild(elt('chat-messages-player-' + msg));
            if (elt('chat-box-dropdown').value.substr(1) === msg) {
                elt('global-chat-messages').style.display = 'block';
                elt('message-form').onsubmit = sendMessage;
            }
            elt('chat-box-dropdown').removeChild(elt('drop-down-' + msg));
        }
    }
    socketFunctions.zoneAddition = function(msg) {
        players[msg.username] = msg;
        drawGame();
    };
    socketFunctions.zoneUpdate = function(msg) {
        players = msg;
        drawGame();
    };
    socketFunctions.currentZone = function(msg) {
        elt('myCanvas').style.backgroundImage = "url(/img/" + msg + ".png)";
    }
    socketFunctions.newMessage = function(msg) {
        var newMessage = elt('message-template').content.cloneNode(true);
        newMessage.querySelector('.message-username').textContent = msg.username;
        newMessage.querySelector('.message-content').textContent = msg.message;
        elt('global-chat-messages').appendChild(newMessage);
        elt('chat-box').scrollTop = elt('chat-box').scrollHeight;
        if (!messages[msg.username])
            messages[msg.username] = {};
        messages[msg.username].message = msg.message;
        messages[msg.username].time = Date.now();
        messages[msg.username].color = 'black';
        drawGame();
    }
    socketFunctions.newPM = function(msg) {
        var newMessage = elt('message-template').content.cloneNode(true);
        newMessage.querySelector('.message-username').textContent = msg.source;
        newMessage.querySelector('.message-content').textContent = msg.message;
        var group = msg.destination;
        if (msg.reciever)
            group = msg.source;
        elt('chat-messages-player-' + group).appendChild(newMessage);
        elt('chat-box').scrollTop = elt('chat-box').scrollHeight;
        if (!messages[msg.source])
            messages[msg.source] = {};
        messages[msg.source].message = msg.message;
        messages[msg.source].time = Date.now();
        messages[msg.source].color = 'red';
        drawGame();
    }
    socketFunctions.stopGame = function() {
        stopGameFunctions();
        stopGame();
        stopChatBox();
        stopSnakeFunctions();
        startLoginFunctions();
        startMenu();
    }
    socketFunctions.startSnake = function(msg) {
        pauseGameFunctions();
        startSnakeFunctions();
        startSnake(msg);
    }
    socketFunctions.startRPS = function() {
        minigameStuff.rpsSelected = null;
        pauseGameFunctions();
        startRPS();
        startRPSFunctions();
    }
}

function startRPSFunctions() {
    socketFunctions.rpsResult = function(result) {
        stopRPS();
        drawRPSResult(result);
    }
}

function stopGameFunctions() {
    socketFunctions.globalAddition = function() {};
    socketFunctions.playerListResponse = function() {};
    socketFunctions.zoneAddition = function() {};
    socketFunctions.friendAddition = function() {};
    socketFunctions.playerRemoval = function() {}
    socketFunctions.zoneUpdate = function() {};
    socketFunctions.currentZone = function() {};
    socketFunctions.newMessage = function() {};
    socketFunctions.newPM = function() {};
    socketFunctions.stopGame = function() {};
    socketFunctions.startSnake = function() {};
    socketFunctions.startRPS = function() {};
}

function pauseGameFunctions() {
    socketFunctions.playerListResponse = function() {};
    socketFunctions.zoneAddition = function() {};
    socketFunctions.startSnake = function() {};
    socketFunctions.zoneUpdate = function() {};
    socketFunctions.startRPS = function() {};
}

function startSnakeFunctions() {
    pauseGameFunctions();
    socketFunctions.snakeUpdate = function(msg) {
        snakeDraw(msg);
    }
    socketFunctions.stopSnake = function() {
        stopSnake();
        stopSnakeFunctions();
        unpauseGameFunctions();
        startGame()
    }
}

function stopSnakeFunctions() {
    socketFunctions.snakeUpdate = function() {};
    socketFunctions.stopSnake = function() {};
}

function unpauseGameFunctions() {
    socketFunctions.playerListResponse = function(msg) {
        for (var i = 0; i < msg.length; i++)
            playerListAdd(msg[i]);
    };
    socketFunctions.zoneAddition = function(msg) {
        players[msg.username] = msg;
        drawGame();
    };
    socketFunctions.zoneUpdate = function(msg) {
        players = msg;
        drawGame();
    }
    socketFunctions.startSnake = function(msg) {
        pauseGameFunctions();
        startSnakeFunctions();
        startSnake(msg);
    }
    socketFunctions.startRPS = function() {
        minigameStuff.rpsSelected = null;
        pauseGameFunctions();
        startRPS();
        socketFunctions.rpsResult = function(msg) {
            stopRPS();
            drawRPSResult(msg);
        }
    }
}