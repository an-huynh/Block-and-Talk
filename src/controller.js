var model = require(__dirname + '/database.js').user;
var friend = require(__dirname + '/database.js').friend;
var database = require(__dirname + '/database.js').sequelize;
var snakeScore = require(__dirname + '/database.js').snakeScore;

database.sync();

var clients = {};
var snakeGame = {};
var snakePlayers = {};
var rpsChallenge = {};
var rpsGame = {};

function as_array(record) {
    return {
        username : record.username,
        color    : record.color,
        shape    : record.shape,
        posx     : record.posx,
        posy     : record.posy
    };
}

function snakeListAsArray(record) {
    return {
        username : record.username,
        score    : record.score
    };
}

module.exports.login_request = function(socket, msg) {
    model.findOne({where : {
        username : msg.username,
        password : msg.password
    }}).then(function(user) {
        if (user) {
            socket.handshake.session.userdata = user.username;
            clients[user.username] = {};
            clients[user.username].record = user;
            clients[user.username].socketID = socket.id;
            clients[user.username].direction = null;
            socket.emit('login_response', true);
            client_addition(socket, user);
        }
        else {
            socket.emit('login_response', false);
        }
    });
}

module.exports.register_request = function(socket, msg) {
    model.findOne({where : {
        username : msg.username,
        password : msg.password
    }}).then(function(user) {
        if (!user) {
            model.create({
                username : msg.username,
                password : msg.password,
                color    : msg.color,
                shape    : msg.shape,
                posx     : 0,
                posy     : 0,
                admin    : false
            }).then(function(user) {
                socket.handshake.session.userdata = user.username;
                clients[user.username] = {};
                clients[user.username].record = user;
                clients[user.username].socketID = socket.id;
                clients[user.username].direction = null;
                socket.emit('register_response', true);
                client_addition(socket, user);
            });
        }
        else {
            socket.emit('register_response', false);
        }
    })
}

module.exports.open_name_request = function(socket, msg) {
    model.findOne({where : {
        username : msg
    }}).then(function(user) {
        if (!user)
            socket.emit('open_name_response', msg);
        else
            socket.emit('open_name_response', false);
    });
}

module.exports.direction_update = function(socket, msg) {
    if (socket.handshake.session.userdata in clients)
        clients[socket.handshake.session.userdata].direction = msg;
}

function client_addition(socket, record) {
    socket.broadcast.emit('player_addition', as_array(record));
    friend.findAll({where : {username : socket.handshake.session.userdata}})
    .then(function(relations) {
        relations.forEach(function(relation) {
            if (relation.friend in clients) {
                friend.findOne({where : {
                    username : relation.friend,
                    friend : socket.handshake.session.userdata
                }}).then(function(friendship) {
                    if (friendship) {
                        socket.broadcast.to(clients[friendship.username].socketID).emit('friend_addition', friendship.friend);
                        socket.emit('friend_addition', friendship.username);
                    }
                })
            }
        })
    });
}

module.exports.client_removal = function(socket) {
    if (socket.handshake.session.userdata) {
        if (socket.handshake.session.userdata in rpsChallenge) {
            if (rpsChallenge[rpsChallenge[socket.handshake.session.userdata]] === socket.handshake.session.userdata) {
                socket.broadcast.to(clients[rpsChallenge[socket.handshake.session.userdata]].socketID).emit('rps_result', 'won');
                delete rpsChallenge[socket.handshake.session.userdata];
            }
        }
        if (socket.handshake.session.userdata in clients) {
            clients[socket.handshake.session.userdata].record.save();
            socket.broadcast.emit('player_removal', socket.handshake.session.userdata);
        }
        delete clients[socket.handshake.session.userdata];
    }
}

module.exports.player_list_request = function(socket) {
    var response = {};
    for (var key in clients)
        response[key] = as_array(clients[key].record);
    socket.emit('player_list_response', response);
}

module.exports.message_post = function(io, socket, msg) {
    if (msg.charAt(0) === '/') {
        command(socket.handshake.session.userdata, msg.split(' '), io, socket);
    }
    else {
        var message = {
            username : socket.handshake.session.userdata,
            message  : msg
        };
        io.emit('message_post', message);
    }
}

module.exports.private_message_post = function(socket, msg) {
    var message = {
        reciever : msg.destination,
        sender : socket.handshake.session.userdata,
        message : msg.message
    };
    socket.broadcast.to(clients[message.reciever].socketID).emit('private_message', message);
    socket.emit('private_message', message);
}

module.exports.message_list_request = function(socket) {
    var response = [];
    for (var key in clients)
        response.push(key);
    var index = response.indexOf(socket.handshake.session.userdata);
    response.splice(index, 1);
    socket.emit('message_list_response', response);
}

module.exports.updating = function(socket) {
    var movement = false;
    for (var key in clients) {
        switch(clients[key].direction) {
            case 'left':
                if (clients[key].record.posx > 0) {
                    clients[key].record.posx = clients[key].record.posx - 1;
                    movement = true;
                }
                break;
            case 'right':
                if (clients[key].record.posx < 700) {
                    clients[key].record.posx = clients[key].record.posx + 1;
                    movement = true;
                }
                break;
            case 'up':
                if (clients[key].record.posy > 0) {
                    clients[key].record.posy = clients[key].record.posy - 1;
                    movement = true;
                }
                break;
            case 'down':
                if (clients[key].record.posy < 460) {
                    clients[key].record.posy = clients[key].record.posy + 1;
                    movement = true;
                }
                break;
            case 'up-left':
                if (clients[key].record.posy > 0 && clients[key].record.posx > 0) {
                    clients[key].record.posy = clients[key].record.posy - 0.707106781187;
                    clients[key].record.posx = clients[key].record.posx - 0.707106781187;
                    movement = true;
                }
                break;
            case 'up-right':
                if (clients[key].record.posy > 0 && clients[key].record.posx < 700) {
                    clients[key].record.posy = clients[key].record.posy - 0.707106781187;
                    clients[key].record.posx = clients[key].record.posx + 0.707106781187;
                    movement = true;
                }
                break;
            case 'down-left':
                if (clients[key].record.posy < 460 && clients[key].record.posx > 0) {
                    clients[key].record.posy = clients[key].record.posy + 0.707106781187;
                    clients[key].record.posx = clients[key].record.posx - 0.707106781187;
                    movement = true;
                }
                break;
            case 'down-right':
                if (clients[key].record.posy < 460 && clients[key].record.posx < 700) {
                    clients[key].record.posy = clients[key].record.posy + 0.707106781187;
                    clients[key].record.posx = clients[key].record.posx + 0.707106781187;
                    movement = true;
                }
                break;
        }
    }
    if (movement)
        module.exports.player_list_request(socket);
}

function block(posx, posy) {
    this.posx = posx;
    this.posy = posy;
}

function rps_game_init(socket, target) {
    rpsChallenge[socket.handshake.session.userdata] = target
    socket.broadcast.to(clients[target].socketID).emit('rps_invite', socket.handshake.session.userdata);
}

module.exports.rps_update = function(socket, msg) {
    rpsGame[socket.handshake.session.userdata] = msg;
    if (rpsGame[rpsChallenge[socket.handshake.session.userdata]]) {
        var player1Choice = rpsGame[socket.handshake.session.userdata];
        var player2Choice = rpsGame[rpsChallenge[socket.handshake.session.userdata]];
        var result;
        if (player1Choice && player2Choice && player1Choice === player2Choice)
            result = 'tied';
        else if (player1Choice === 'Rock' && player2Choice === 'Scissors')
            result = 'won';
        else if (player1Choice === 'Scissors' && player2Choice === 'Paper')
            result = 'won';
        else if (player1Choice === 'Paper' && player2Choice === 'Rock')
            result = 'won';
        else if (player1Choice === 'Rock' && player2Choice === 'Paper')
            result = 'lost';
        else if (player1Choice === 'Scissors' && player2Choice === 'Rock')
            result = 'lost';
        else if (player1Choice === 'Paper' && player2Choice === 'Scissors')
            result = 'lost';
        if (result === 'won') {
            socket.emit('rps_result', result);
            socket.broadcast.to(clients[rpsChallenge[socket.handshake.session.userdata]].socketID).emit(
                'rps_result', 'lost');
        }
        else if (result === 'lost') {
            socket.emit('rps_result', result);
            socket.broadcast.to(clients[rpsChallenge[socket.handshake.session.userdata]].socketID).emit(
                'rps_result', 'won');
        }
        else {
            socket.emit('rps_result', result);
            socket.broadcast.to(clients[rpsChallenge[socket.handshake.session.userdata]].socketID).emit(
                'rps_result', 'tied');
        }
        delete rpsGame[socket.handshake.session.userdata];
        delete rpsGame[rpsChallenge[socket.handshake.session.userdata]];
        delete rpsChallenge[rpsChallenge[socket.handshake.session.userdata]];
        delete rpsChallenge[socket.handshake.session.userdata];
    }
}

function snake_game_initiate(socket) {
    snakeScore.findAll({
        limit : 10,
        order : '"score" DESC'
    }).then(function(users) {
        var list = [];
        users.forEach(function(user) {
            list.push(snakeListAsArray(user));
        });
        snakePlayers[socket.handshake.session.userdata] = {
            snake : null,
            snack : new block(10, 10),
            direction : null
        };
        snakePlayers[socket.handshake.session.userdata].snake = [];
        snakePlayers[socket.handshake.session.userdata].snake.push(new block(5, 5));
        socket.emit('initiate_snake', list);
        snakeGame[socket.handshake.session.userdata] = setInterval(snake_action, 100,
        socket, socket.handshake.session.userdata);

    });
}

function snake_action(socket, player) {
    var done = false;
    if (snakePlayers[player].direction) {
        if (snakePlayers[player].direction === 'up')
            snakePlayers[player].snake.unshift(new block(snakePlayers[player].snake[0].posx, snakePlayers[player].snake[0].posy - 1));
        else if (snakePlayers[player].direction === 'right')
            snakePlayers[player].snake.unshift(new block(snakePlayers[player].snake[0].posx + 1, snakePlayers[player].snake[0].posy));
        else if (snakePlayers[player].direction === 'down')
            snakePlayers[player].snake.unshift(new block(snakePlayers[player].snake[0].posx, snakePlayers[player].snake[0].posy + 1));
        else if (snakePlayers[player].direction === 'left')
            snakePlayers[player].snake.unshift(new block(snakePlayers[player].snake[0].posx - 1, snakePlayers[player].snake[0].posy));
    }
    for (var i = 1; i < snakePlayers[player].snake.length; i++) {
        if (snakePlayers[player].snake[0].posx === snakePlayers[player].snake[i].posx &&
            snakePlayers[player].snake[0].posy === snakePlayers[player].snake[i].posy) {
            done = true;
        }
    }
    if (snakePlayers[player].snake[0].posx < 1 || snakePlayers[player].snake[0].posx > 22 ||
        snakePlayers[player].snake[0].posy < 1 || snakePlayers[player].snake[0].posy > 22)
        done = true;
    if (snakePlayers[player].snake.length === 484)
        done = true;
    if (!done) {
        if (snakePlayers[player].direction) {
            if (snakePlayers[player].snake[0].posx !== snakePlayers[player].snack.posx ||
                snakePlayers[player].snake[0].posy !== snakePlayers[player].snack.posy) {
                snakePlayers[player].snake.pop();
            }
            else {
                var snackPlaced = false;
                while (!snackPlaced) {
                    var newSnack = new block(
                        Math.floor((Math.random() * 21) + 1),
                        Math.floor((Math.random() * 21) + 1)
                    );
                    var available = true;
                    for (var i = 0; i < snakePlayers[player].snake.length && !snackPlaced; i++) {
                        if (newSnack.posx === snakePlayers[player].snake[i].posx &&
                            newSnack.posy === snakePlayers[player].snake[i].posy)
                            available = false;
                    }
                    if (available) {
                        snakePlayers[player].snack = newSnack;
                        snackPlaced = true;
                    }
                }
            }
        }
    }
    if (done || !(player in clients)) {
        snakeScore.create({
            username : player,
            score    : snakePlayers[player].snake.length - 2,
        });
        clearInterval(snakeGame[player]);
        delete snakeGame[player];
        socket.emit('uninitiate_snake', '');
    }
    else {
        var message = {
            snake : snakePlayers[player].snake,
            snack : snakePlayers[player].snack
        };
        socket.emit('snake_update', message);
    }
}

module.exports.snake_direction_update = function(socket, msg) {
    if (snakePlayers[socket.handshake.session.userdata].direction === 'left' && msg !== 'right') {
        snakePlayers[socket.handshake.session.userdata].direction = msg;
    }
    else if (snakePlayers[socket.handshake.session.userdata].direction === 'up' && msg !== 'down') {
        snakePlayers[socket.handshake.session.userdata].direction = msg;
    }
    else if (snakePlayers[socket.handshake.session.userdata].direction === 'right' && msg !== 'left') {
        snakePlayers[socket.handshake.session.userdata].direction = msg;
    }
    else if (snakePlayers[socket.handshake.session.userdata].direction === 'down' && msg !== 'up') {
        snakePlayers[socket.handshake.session.userdata].direction = msg;
    }
    else if (!snakePlayers[socket.handshake.session.userdata].direction)
        snakePlayers[socket.handshake.session.userdata].direction = msg;
}

function command(user, param, io, socket) {
    if (param[0] === '/kick' && clients[user].record.admin) {
        if (param[1] in clients) {
            clients[param[1]].record.save();
            io.emit('player_removal', param[1]);
            io.to(clients[param[1]].socketID).emit('kicked', '');
            delete clients[param[1]];
            module.exports.player_list_request(io);
        }
    }
    else if (param[0] === '/op' && clients[user].record.admin) {
        if (param[1] in clients)
            clients[param[1]].record.admin = true;
        else {
            model.findOne({where : {
                username : param[1]
            }}).then(function(user) {
                if (user) {
                    user.admin = true;
                    user.save();
                }
            });
        }
    }
    else if (param[0] === '/deop' && clients[user].record.admin) {
        if (param[1] in clients)
            clients[param[1]].record.admin = false;
        else {
            model.findOne({where : {
                username : param[1]
            }}).then(function(user) {
                if (user) {
                    user.admin = false;
                    user.save();
                }
            });
        }
    }
    else if (param[0] === '/help') {
        var message = {
            username : 'help',
            message : "/snake   : initiate snake game"
        };
        socket.emit('message_post', message);
    }
    else if (param[0] === '/snake')
        snake_game_initiate(socket);
    else if (param[0] === '/rps') {
        if (param[1] in clients && param[1] !== socket.handshake.session.userdata) {
            if (rpsChallenge[param[1]] === socket.handshake.session.userdata) {
                rpsChallenge[socket.handshake.session.userdata] = param[1];
                socket.emit('rps_initiate', '');
                socket.broadcast.to(clients[param[1]].socketID).emit('rps_initiate', '');
            }
            else {
                rps_game_init(socket, param[1]);
            }
        }
    }
    else if (param[0] === '/friend') {
        if (socket.handshake.session.userdata !== param[1]) {
            model.findOne({ where : {
                username : param[1]
            }}).then(function(user) {
                if (user) {
                    friend.findOne({where : {
                        username : socket.handshake.session.userdata,
                        friend   : param[1]
                    }}).then(function(relation){
                        if (!relation)
                            friend.create({
                                username : socket.handshake.session.userdata,
                                friend : param[1]
                            }).then(function(friendship) {
                                friend.findOne({where : {
                                    username : friendship.friend,
                                    friend   : friendship.username
                                }}).then(function(friends) {
                                    if(friends) {
                                        socket.emit('friend_addition', friends.username);
                                        socket.broadcast.to(clients[friends.username].socketID).emit('friend_addition', friends.friend);
                                    }
                                })
                            })
                    });
                }
            });
        }
    }
}
setInterval(function() {
    for (var key in clients)
        clients[key].record.save();
}, 10000);
