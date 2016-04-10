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
var socketFunctions = {
    login_response : null,
    open_name_response : null,
    register_response : null,
    player_addition : null,
    player_removal : null,
    player_list_response : null,
    message_list_response : null,
    message_post : null,
    private_message : null,
    initiate_snake : null,
    snake_update : null,
    kicked : null,
    rps_invite : null,
    rps_initiate : null,
    rps_result : null
};
var snakeGameList = {};
var rpsSelected = null;


/*
*    Initiates the app on load, creates the canvas
*    initiates the sockets, and draws the login menu
*/
window.onload = function() {
    canvas = element('myCanvas');
    ctx = canvas.getContext('2d');
    initSockets();
    loginMenu();
    initLoginFunctions();
}

/*
*    Draws the login menu for the game, as well as
*    adding event listeners to register user clicks
*    as well as registering the submission boxes for
*    logging in and registering
*/
function loginMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // LARGE LOGO
    ctx.textAlign = 'center';
    ctx.font = '55px Helvetica';
    ctx.fillStyle = 'black';
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

    document.addEventListener('mousedown', loginMenuHandler, false);
    element('login').onsubmit = loginRequest;
    element('register').onsubmit = registerRequest;
}


/*
*    Initiates the socket functions for logging in,
*    removing the uncessary ones temporarily
*/
function initLoginFunctions() {
    socketFunctions.login_response = function(msg) {
        if (msg)
            gameInit();
        else
            alert('Invalid username or password');
    };
    socketFunctions.open_name_response = function(msg) {
        if (msg) {
            newPlayerInfo.openName = msg;
            initRegistration();
        }
        else
            alert('Name taken');
    };
    socketFunctions.register_response = function(msg) {
        if (msg)
            gameInit();
        else
            alert('Something bad happened');
    };
    socketFunctions.player_addition = function(msg) {};
    socketFunctions.player_removal  = function(msg) {};
    socketFunctions.player_list_response = function(msg) {};
    socketFunctions.message_list_response = function(msg) {};
    socketFunctions.message_post = function(msg) {};
    socketFunctions.initiate_snake = function(msg) {};
    socketFunctions.snake_update = function(msg) {};
    socketFunctions.uninitiate_snake = function(msg) {};
    socketFunctions.private_message = function(msg) {};
    socketFunctions.kicked = function(msg) {};
    socketFunctions.rps_invite = function(msg) {};
    socketFunctions.rps_initiate = function(msg) {};
    socketFunctions.rps_result = function(msg) {};
}


/*
*    Initiates all of the socket functions, assigning each of them a
*    function corresponding with their function in the socketFunctions
*    object
*/
function initSockets() {
    socket = io();
    socket.on('login_response', function(msg) {socketFunctions.login_response(msg);});
    socket.on('open_name_response', function(msg) {socketFunctions.open_name_response(msg);});
    socket.on('register_response', function(msg) {socketFunctions.register_response(msg);});
    socket.on('player_addition', function(msg) {socketFunctions.player_addition(msg);});
    socket.on('player_removal', function(msg) {socketFunctions.player_removal(msg);});
    socket.on('player_list_response', function(msg) {socketFunctions.player_list_response(msg);});
    socket.on('message_list_response', function(msg) {socketFunctions.message_list_response(msg);});
    socket.on('message_post', function(msg) {socketFunctions.message_post(msg);});
    socket.on('private_message', function(msg) {socketFunctions.private_message(msg);});
    socket.on('initiate_snake', function(msg) {socketFunctions.initiate_snake(msg);});
    socket.on('snake_update', function(msg) {socketFunctions.snake_update(msg);});
    socket.on('uninitiate_snake', function(msg) {socketFunctions.uninitiate_snake(msg);});
    socket.on('kicked', function(msg) {socketFunctions.kicked(msg);});
    socket.on('rps_invite', function(msg) {socketFunctions.rps_invite(msg);});
    socket.on('rps_initiate', function(msg) {socketFunctions.rps_initiate(msg);});
    socket.on('rps_result', function(msg) {socketFunctions.rps_result(msg);});
}


/*
*    Initiates all of the socket functions that the
*    actual game uses. This also includes temporarily
*    nilling the functions that are unnecessary for the
*    game
*/
function initGameFunctions() {
    socketFunctions.login_response = function(msg) {};
    socketFunctions.open_name_response = function(msg) {};
    socketFunctions.register_response = function(msg) {};
    socketFunctions.player_addition = function(msg) {
        playerAddition(msg.username);
        players[msg.username] = msg;
        drawGame();
    };
    socketFunctions.player_removal = function(msg) {
        delete players.msg;
        if (element('chat-messages-player-' + msg)) {
            element('chat-box').removeChild(element('chat-messages-player-' + msg));
            element('chat-box-dropdown').removeChild(element('drop-down-' + msg));
            element('global-chat-players').removeChild(element('playerlist-' + msg));
        }
        if (currentChatGroup === msg) {
            currentChatGroup = 'global';
            element('global-chat-messages').style.display = 'block';
            element('message-form').onsubmit = messagePost;
        }
        drawGame();
    };
    socketFunctions.player_list_response = function(msg) {
        players = msg;
        drawGame();
    };
    socketFunctions.message_list_response = function(msg) {
        for (var i = 0; i < msg.length; i++) {
            if (!document.querySelector('#chat-messages-player-' + msg[i])){
                playerAddition(msg[i]);
            }
        }
    };
    socketFunctions.message_post = function(msg) {
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
    };
    socketFunctions.initiate_snake = function(msg) {
        snakeGameList = msg;
        initiateSnake();
        initiateSnakeControls();
    };
    socketFunctions.snake_update = function(msg) {};
    socketFunctions.uninitiate_snake = function(msg) {};
    socketFunctions.private_message = function(msg) {
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
    };
    socketFunctions.kicked = function(msg) {
        initLoginFunctions();
        loginMenu();
        chatBoxUninitialize();
        messages = {};
        players = {};
        currentMessageBox = 'global';
        window.onkeydown = null;
        window.onkeyup = null;
    };
    socketFunctions.rps_invite = function(msg) {
        var newMessage = element('message-template').content.cloneNode(true);
        newMessage.querySelector('.message-username').textContent = 'GAME';
        newMessage.querySelector('.message-content').textContent = msg +
            ' has invited you to play rock paper scissors. to accept, type /rpsaccept ' + msg;
        element('global-chat-messages').appendChild(newMessage);
        element('chat-box').scrollTop = element('chat-box').scrollHeight;
    };
    socketFunctions.rps_initiate = function(msg) {
        initiateRPS();
        initiateRPSControls();
        rpsSelected = null;
        drawRPS();
    };
    socketFunctions.rps_result = function(msg) {};
}

/*
*    Initiates all of the socket functions that the
*    snake minigame needs, as well as nulling all
*    the socket functions the snake game doesn't
*    need.
*/
function initiateSnake(msg) {
    socketFunctions.player_list_response = function(msg) {};
    socketFunctions.initiate_snake = function(msg) {};
    socketFunctions.snake_update = function(msg) {
        snakeDraw(msg);
    };
    socketFunctions.uninitiate_snake = function(msg) {
        gameInit();
    };
    socketFunctions.kicked = function(msg) {};
    socketFunctions.rps_invite = function(msg) {};
    socketFunctions.rps_initiate = function(msg) {};
    socketFunctions.rps_result = function(msg) {};
}

function initiateRPS() {
    socketFunctions.player_list_response = function(msg) {};
    socketFunctions.initiate_snake = function(msg) {};
    socketFunctions.snake_update = function(msg) {};
    socketFunctions.uninitiate_snake = function(msg) {};
    socketFunctions.kicked = function(msg) {};
    socketFunctions.rps_invite = function(msg) {};
    socketFunctions.rps_initiate = function(msg) {};
    socketFunctions.rps_result = function(msg) {
        drawRPSResult(msg);
        window.onclick = rpsExitHandler;
    };
}

/*
*    Initiates the controls for the snake minigame,
*    setting the on key event to their proper handlers,
*    as well as unititializing the chat box while playing
*/
function initiateSnakeControls() {
    window.onkeyup = null;
    window.onkeydown = snakeHandler;
    element('message-input').onfocus = null;
    element('message-input').onblur = null;
    chatBoxUninitialize();
}

function initiateRPSControls() {
    window.onkeyup = null;
    window.onkeydown = null;
    window.onclick = rpsHandler;
    element('message-input').onfocus = null;
    element('message-input').onblur = null;
    chatBoxUninitialize();
}

/*
*    Initiates the controls for the actual game,
*    initiating its functions as well as opening
*    the chat box and creating key handlers for
*    moving around
*/
function gameInit() {
    initGameFunctions();
    chatBoxInitialize();
    socket.emit('player_list_request', '');
    socket.emit('message_list_request', '');
    document.removeEventListener('mousedown', loginMenuHandler, false);
    window.onkeydown = keyDownHandler;
    window.onkeyup = keyUpHandler;
}

/*
*    Adds the chat box to the client,
*    as well as adding a user to the drop
*    box to allow for private messaging
*/
function playerAddition(name) {
    var messageBox = document.createElement('ul');
    messageBox.className = 'messages';
    messageBox.id = 'chat-messages-player-' + name;
    messageBox.style.display = 'none';
    element('chat-box').appendChild(messageBox);

    var newPlayer = document.createElement('section');
    newPlayer.id = 'playerlist-' + name;
    newPlayer.className = 'players';
    newPlayer.textContent = name;
    element('global-chat-players').appendChild(newPlayer);

    var dropDown = document.createElement('option');
    dropDown.value = 'a' + name;
    dropDown.id = 'drop-down-' + name;
    dropDown.textContent = name;
    element('chat-box-dropdown').appendChild(dropDown);
}


/*
*    Emits a login request that sends in the
*    the username and a hashed password to
*    the controller
*/
function loginRequest() {
    socket.emit('login_request', {
        username : element('login-username').value,
        password : sha256_digest(element('login-password').value)
    });
    return false;
}


/*
*    Performs  a register request, which compares the
*    two typed passwords ensuring they match, and
*    if they do it emits a request to check if the name
*    is open
*/
function registerRequest() {
    if (element('register-password1').value === element('register-password2').value)
        socket.emit('open_name_request', element('register-username').value);
    else
        alert('passwords do not match');
    return false;
}


/*
*    Initializes customization after the new user is
*    created. Removes the registration box and draws
*    the customization canvas.
*/
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


/*
*    Draws the menu for character creation,
*    including the model of the character as
*    well as the buttons for change between
*    shapes and colors
*/
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

function drawRPS(msg) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = '30px helvetica';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';
    ctx.fillText('ROCK, PAPER, SCISSORS', canvas.width / 2, 40);

    ctx.font = '20px Helvetica';
    ctx.fillStyle = 'blue';
    if (rpsSelected === 'Rock') {
        ctx.beginPath();
        ctx.rect(canvas.width / 2 - 100, 92.5, 200, 30);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    }
    ctx.fillStyle = 'blue';
    ctx.fillText('Rock', canvas.width / 2, 115);
    if (rpsSelected === 'Paper') {
        ctx.beginPath();
        ctx.rect(canvas.width / 2 - 100, 142.5, 200, 30);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    }
    ctx.fillStyle = 'blue';
    ctx.fillText('Paper', canvas.width / 2, 165);
    if (rpsSelected === 'Scissors') {
        ctx.beginPath();
        ctx.rect(canvas.width / 2 - 100, 192.5, 200, 30);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    }
    ctx.fillStyle = 'blue';
    ctx.fillText('Scissors', canvas.width / 2, 215.5);
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

function snakeDraw(msg) {
    ctx.clearRect(0, 0, canvas.height, canvas.height);
    ctx.beginPath();
    ctx.rect(20, 20, canvas.height - 40, canvas.height - 40);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();
    for (var i = 0; i < msg.snake.length; i++) {
        ctx.beginPath();
        ctx.rect(msg.snake[i].posx * 20, msg.snake[i].posy * 20, 20, 20);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    }
    ctx.beginPath();
    ctx.rect(msg.snack.posx * 20, msg.snack.posy * 20, 20, 20);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.closePath();

    ctx.rect(canvas.height, 20, canvas.width - canvas.height - 20, canvas.height - 40);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.closePath();

    for (var i = 0; i < snakeGameList.length; i++) {
        ctx.font = '20px Helvetica';
        ctx.textAlign = 'left';
        ctx.fillStyle = 'black';
        ctx.fillText(snakeGameList[i].score + ' ' + snakeGameList[i].username,
                     canvas.height + 20, 50 + (22 * i));
    }
    ctx.font = '20px Helvetica';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'black';
    ctx.fillText("Score: " + (msg.snake.length - 1), canvas.height + 4, canvas.height - 30);
}

function chatBoxInitialize() {
    element('login').style.display = 'none';
    element('register').style.display = 'none';
    element('chat-box-dropdown').style.display = 'block';
    element('chat-box').style.display = 'block';
    element('message-form').style.display = 'block';
    element('playerlist-box').style.display = 'block';

    element('message-form').onsubmit = messagePost;
    element('message-input').onfocus = writing;
    element('message-input').onblur = notWriting;
    currentChatGroup = 'global';
    element('chat-box-dropdown').onchange = chatBoxChanger;

}

function chatBoxUninitialize() {
    element('chat-box-dropdown').style.display = 'none';
    element('chat-box').style.display = 'none';
    element('message-form').style.display = 'none';
    element('playerlist-box').style.display = 'none';
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
    socket.emit('snake_direction_update', direction);
}

function rpsHandler(evt) {
    var selected = null;
    var relativeX = evt.clientX - canvas.offsetLeft;
    var relativeY = evt.clientY - canvas.offsetTop;
    if (relativeX > canvas.width / 2 - 200 && relativeX < canvas.width / 2 + 200) {
        if (relativeY >= 92.5 && relativeY <= 122.5)
            selected = 'Rock';
        else if (relativeY >= 142.5 && relativeY <= 172.5)
            selected = 'Paper';
        else if (relativeY >= 192.5 && relativeY <= 222.5)
            selected = 'Scissors';
    }
    if (selected) {
        rpsSelected = selected;
        drawRPS();
        socket.emit('rps_update', selected);
    }

}

function rpsExitHandler(evt) {
    var relativeX = evt.clientX - canvas.offsetLeft;
    var relativeY = evt.clientY - canvas.offsetTop;
    if (relativeX >= canvas.width / 2 - 50 && relativeX <= canvas.width / 2 + 50 &&
        relativeY >= 350 && relativeY <= 380) {
        gameInit();
        window.onclick = null;
    }
}
