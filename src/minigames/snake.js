var snakeScore = require(__dirname + '/../models/snakescore.js');

var snakePlayers = {};
var snakeGame = {};

function block(posX, posY) {
    this.posX = posX,
    this.posY = posY
};

function startSnakeGame(name, socket) {
    snakeScore.findAll({
        limit: 10,
        order: '"score" DESC'
    }).then(function(scores) {
        var highScoreList = [];
        scores.forEach(function (score) {
            highScoreList.push(score.asArray());
        });
        snakePlayers[name] = {
            snake: [new block(2, 2)],
            snack: new block(10, 10),
            direction: null
        };
        socket.emit('startSnake', highScoreList);
        snakeGame[name] = setInterval(snakeAction, 100, name, socket);
    });
}

function snakeUpdate(name, direction, socket) {
    if (name in snakePlayers) {
        if (direction === 'left' && snakePlayers[name].direction !== 'right')
            snakePlayers[name].direction = 'left';
        else if (direction === 'up' && snakePlayers[name].direction !== 'down')
            snakePlayers[name].direction = 'up';
        else if (direction === 'right' && snakePlayers[name].direction !== 'left')
            snakePlayers[name].direction = 'right';
        else if (direction === 'down' && snakePlayers[name].direction !== 'up')
            snakePlayers[name].direction = 'down';
    }
}

function snakeAction(name, socket) {
    var playing = true;
    if (snakePlayers[name].direction) {
        if (snakePlayers[name].direction === 'left')
            snakePlayers[name].snake.unshift(new block(snakePlayers[name].snake[0].posX - 1, snakePlayers[name].snake[0].posY));
        else if (snakePlayers[name].direction === 'up')
            snakePlayers[name].snake.unshift(new block(snakePlayers[name].snake[0].posX, snakePlayers[name].snake[0].posY - 1));
        else if (snakePlayers[name].direction === 'right')
            snakePlayers[name].snake.unshift(new block(snakePlayers[name].snake[0].posX + 1, snakePlayers[name].snake[0].posY));
        else if (snakePlayers[name].direction === 'down')
            snakePlayers[name].snake.unshift(new block(snakePlayers[name].snake[0].posX, snakePlayers[name].snake[0].posY + 1));
    }
    for (var i = 1; i < snakePlayers[name].snake.length; i++) {
        if (snakePlayers[name].snake[0].posX === snakePlayers[name].snake[i].posX &&
            snakePlayers[name].snake[0].posY === snakePlayers[name].snake[i].posY)
            playing = false;
    }
    if (snakePlayers[name].snake[0].posX < 1 || snakePlayers[name].snake[0].posX > 22 ||
        snakePlayers[name].snake[0].posY < 1 || snakePlayers[name].snake[0].posY > 22)
        playing = false;
    if (snakePlayers[name].snake.length === 484)
        playing = false;
    if (playing && snakePlayers[name].direction) {
        if (snakePlayers[name].snake[0].posX !== snakePlayers[name].snack.posX ||
            snakePlayers[name].snake[0].posY !== snakePlayers[name].snack.posY)
            snakePlayers[name].snake.pop();
        else {
            var snackPlaced = false;
            while (!snackPlaced) {
                var newSnack = new block(Math.floor((Math.random() * 21)) + 1, Math.floor((Math.random() * 20)) + 1);
                var available = true;
                for (var i = 0; i < snakePlayers[name].snake.length; i++) {
                    if (snakePlayers[name].snake[i].posX === newSnack.posX &&
                        snakePlayers[name].snake[i].posY === newSnack.posY)
                        available = false;
                }
                if (available) {
                    snakePlayers[name].snack = newSnack;
                    snackPlaced = true;
                }
            }
        }
    }
    if (!playing) {
        snakeScore.create({
            username: name,
            score: snakePlayers[name].snake.length - 2
        });
        clearInterval(snakeGame[name]);
        delete snakePlayers[name];
        socket.emit('stopSnake', '');
    }
    else {
        socket.emit('snakeUpdate', {
            snake: snakePlayers[name].snake,
            snack: snakePlayers[name].snack
        });
    }
}

function stopSnakeGame(name, socket, id) {
    if (name in snakeGame) {
        clearInterval(snakeGame[name]);
        delete snakePlayers[name];
        socket.to(id).emit('stopSnake', '');
    }
}

module.exports = {
    startSnakeGame: startSnakeGame,
    snakeUpdate: snakeUpdate,
    stopSnakeGame: stopSnakeGame
};
