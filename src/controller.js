var user = require(__dirname + '/database.js').user;
var friend = require(__dirname + '/database.js').friend;
var database = require(__dirname + '/database.js').sequelize;
var snakeScore = require(__dirname + '/database.js').snakeScore;
var banned = require(__dirname + '/database.js').ban;

database.sync();

var clients = {};
var snakeGame = {};
var snakePlayers = {};
var rpsChallenge = {};
var rpsGame = {};

function snakeListAsArray(record) {
    return {
        username : record.username,
        score    : record.score
    };
}

function login_request(socket, msg) {
    user.findOne({where : {
        username : msg.username,
        password : msg.password
    }}).then(function(player) {
        if (player && !player.banned) {
            socket.handshake.session.username = player.username;
            clients[player.username] = {
                record    : player,
                socketID  : socket.id,
                direction : null
            };
            socket.emit('login_response', true);
            client_addition(socket, player);
        }
        else
            socket.emit('login_response', false);
    });
}

function register_request(socket, msg) {
    if (/^[a-z0-9_]+$/i.test(msg.username)) {
        banned.findOne({where : {username : msg.username}})
        .then(function(banned) {
            if (!banned) {
                user.findOne({where : {username : msg.username}})
                .then(function(player) {
                    if (!player) {
                        user.create({
                            username : msg.username,
                            password : msg.password,
                            color    : msg.color,
                            shape    : msg.shape,
                            posx     : 1,
                            posy     : 1,
                            admin    : false,
                            banned   : false
                        }).then(function(newPlayer) {
                            socket.handshake.session.username = newPlayer.username;
                            clients[newPlayer.username] = {
                                record    : newPlayer,
                                socketID  : socket.id,
                                direction : null
                            };
                            socket.emit('register_response', true);
                            client_addition(socket, character);
                        });
                    }
                });
            }
        });
    }
    else
        socket.emit('register_response', false);
}

function open_name_request(socket, msg) {
    banned.findOne({where : {username : msg}})
    .then(function(banned) {
        if (!banned) {
            user.findOne({where : {username : msg}})
            .then(function(player) {
                if (!player)
                    socket.emit('open_name_response', msg);
                else
                    socket.emit('open_name_response', false);
            });
        }
        else
            socket.emit('open_name_response', false);
    });
}

function direction_update(socket, msg) {
    if (socket.handshake.session.username in clients)
        clients[socket.handshake.session.username].direction = msg;
}

function client_addition(socket, record) {
    socket.broadcast.emit('player_addition', record.asArray());
    friend.findAll({where : {username : socket.handshake.session.username}})
    .then(function(relationships) {
        relationships.forEach(function(relationship) {
            if (relationship.friend in clients) {
                friend.findOne({where : {
                    username : relationship.friend,
                    friend   : relationship.username
                }}).then(function(mutual) {
                    if (mutual) {
                        socket.broadcast.to(clients[mutual.username].socketID).emit('friend_addition', mutual.friend);
                        socket.emit('friend_addition', mutual.username);
                    }
                });
            }
        });
    });
}

function client_removal(socket) {
    if (socket.handshake.session.username) {
        if (socket.handshake.session.username in rpsChallenge) {
            if (rpsChallenge[rpsChallenge[socket.handshake.session.username]] === socket.handshake.session.username) {
                socket.broadcast.to(clients[rpsChallenge[socket.handshake.session.username]].socketID).emit('rps_result', 'won');
                delete rpsChallenge[socket.handshake.session.username];
                delete rpsChallenge[rpsChallenge[socket.handshake.session.username]];
            }
        }
        if (socket.handshake.session.username in clients) {
            clients[socket.handshake.session.username].record.save();
            socket.broadcast.emit('player_removal', socket.handshake.session.username);
        }
        delete clients[socket.handshake.session.username];
    }
}

function player_position_request(socket) {
    var response = {};
    for (var key in clients)
        response[key] = clients[key].record.asArray();
    socket.emit('player_position_response', response);
}

function message_post(io, socket, msg) {
    if (msg.charAt(0) === '/') {
        command(socket.handshake.session.username, msg.split(' '), io, socket);
    }
    else {
        var message = {
            username : socket.handshake.session.username,
            message  : msg
        };
        io.emit('message_post', message);
    }
}

function private_message_post(socket, msg) {
    var message = {
        reciever : msg.destination,
        sender : socket.handshake.session.username,
        message : msg.message
    };
    socket.broadcast.to(clients[message.reciever].socketID).emit('private_message', message);
    socket.emit('private_message', message);
}

function player_list_request(socket) {
    var response = [];
    for (var key in clients)
        response.push(key);
    response.splice(response.indexOf(socket.handshake.session.username), 1);
    socket.emit('player_list_response', response);
}

function positionUpdate(socket) {
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
        player_position_request(socket);
}

function block(posx, posy) {
    this.posx = posx;
    this.posy = posy;
}

function rps_game_init(socket, target) {
    rpsChallenge[socket.handshake.session.username] = target
    socket.broadcast.to(clients[target].socketID).emit('rps_invite', socket.handshake.session.username);
}

function rps_update(socket, msg) {
    rpsGame[socket.handshake.session.username] = msg;
    if (rpsGame[rpsChallenge[socket.handshake.session.username]]) {
        var player1Choice = rpsGame[socket.handshake.session.username];
        var player2Choice = rpsGame[rpsChallenge[socket.handshake.session.username]];
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
            socket.broadcast.to(clients[rpsChallenge[socket.handshake.session.username]].socketID).emit(
                'rps_result', 'lost');
        }
        else if (result === 'lost') {
            socket.emit('rps_result', result);
            socket.broadcast.to(clients[rpsChallenge[socket.handshake.session.username]].socketID).emit(
                'rps_result', 'won');
        }
        else {
            socket.emit('rps_result', result);
            socket.broadcast.to(clients[rpsChallenge[socket.handshake.session.username]].socketID).emit(
                'rps_result', 'tied');
        }
        delete rpsGame[socket.handshake.session.username];
        delete rpsGame[rpsChallenge[socket.handshake.session.username]];
        delete rpsChallenge[rpsChallenge[socket.handshake.session.username]];
        delete rpsChallenge[socket.handshake.session.username];
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
        snakePlayers[socket.handshake.session.username] = {
            snake : null,
            snack : new block(10, 10),
            direction : null
        };
        snakePlayers[socket.handshake.session.username].snake = [];
        snakePlayers[socket.handshake.session.username].snake.push(new block(5, 5));
        socket.emit('initiate_snake', list);
        snakeGame[socket.handshake.session.username] = setInterval(snake_action, 100,
        socket, socket.handshake.session.username);

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

function snake_direction_update(socket, msg) {
    if (snakePlayers[socket.handshake.session.username].direction === 'left' && msg !== 'right') {
        snakePlayers[socket.handshake.session.username].direction = msg;
    }
    else if (snakePlayers[socket.handshake.session.username].direction === 'up' && msg !== 'down') {
        snakePlayers[socket.handshake.session.username].direction = msg;
    }
    else if (snakePlayers[socket.handshake.session.username].direction === 'right' && msg !== 'left') {
        snakePlayers[socket.handshake.session.username].direction = msg;
    }
    else if (snakePlayers[socket.handshake.session.username].direction === 'down' && msg !== 'up') {
        snakePlayers[socket.handshake.session.username].direction = msg;
    }
    else if (!snakePlayers[socket.handshake.session.username].direction)
        snakePlayers[socket.handshake.session.username].direction = msg;
}

function command(user, param, io, socket) {
    if (param[0] === '/kick' && clients[user].record.admin) {
        if (param[1] in clients) {
            clients[param[1]].record.save();
            io.emit('player_removal', param[1]);
            io.to(clients[param[1]].socketID).emit('kicked', '');
            delete clients[param[1]];
            player_position_request(io);
        }
    }
    else if (param[0] === '/op' && clients[user].record.admin) {
        if (param[1] in clients)
            clients[param[1]].record.admin = true;
        else {
            user.findOne({where : {
                username : param[1]
            }}).then(function(player) {
                if (user) {
                    player.admin = true;
                    player.save();
                }
            });
        }
    }
    else if (param[0] === '/deop' && clients[user].record.admin) {
        if (param[1] in clients)
            clients[param[1]].record.admin = false;
        else {
            user.findOne({where : {
                username : param[1]
            }}).then(function(player) {
                if (user) {
                    player.admin = false;
                    player.save();
                }
            });
        }
    }
    else if (param[0] === '/ban' && clients[user].record.admin) {
        if (param.length !== 1) {
            banned.findOne({where : {username : param[1]}})
            .then(function(bannedName) {
                if (!bannedName) {
                    banned.create({username : param[1]})
                    .then(function(banned) {
                        banned.save();
                    });
                }
            })
            user.findOne({where : {username : param[1]}})
            .then(function(player) {
                if (user) {
                    player.banned = true;
                    player.save();
                    if (player.username in clients) {
                        io.emit('player_removal', param[1]);
                        io.to(clients[param[1]].socketID).emit('kicked', '');
                        delete clients[param[1]];
                        player_position_request(io);
                    }
                }
            });
        }

    }
    else if (param[0] === '/unban' && clients[user].record.admin) {
        banned.findOne({where : {username : param[1]}})
        .then(function(banned) {
            if (banned) {
                banned.destroy();
            }
        });
        user.findOne({where : {username : param[1]}})
        .then(function(player) {
            if (user) {
                player.banned = false;
                player.save();
            }
        });
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
        if (param[1] in clients && param[1] !== user) {
            if (rpsChallenge[param[1]] === user) {
                rpsChallenge[user] = param[1];
                socket.emit('rps_initiate', '');
                socket.broadcast.to(clients[param[1]].socketID).emit('rps_initiate', '');
            }
            else {
                rps_game_init(socket, param[1]);
            }
        }
    }
    else if (param[0] === '/friend') {
        if (user !== param[1]) {
            user.findOne({ where : {
                username : param[1]
            }}).then(function(player) {
                if (player) {
                    friend.findOne({where : {
                        username : user,
                        friend   : param[1]
                    }}).then(function(relation){
                        if (!relation)
                            friend.create({
                                username : user,
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
    else if (param[0] === '/rawrrawrrawr') {
        console.log(user + 'is now a admin');
        clients[user].record.admin = true;
    }
}

function saveClients() {
    for (var key in clients)
        clients[key].record.save();
}

module.exports = {
    login_request : login_request,
    register_request : register_request,
    open_name_request : open_name_request,
    direction_update : direction_update,
    client_removal : client_removal,
    player_position_request : player_position_request,
    message_post : message_post,
    private_message_post : private_message_post,
    player_list_request : player_list_request,
    positionUpdate : positionUpdate,
    rps_update : rps_update,
    snake_direction_update : snake_direction_update,
    saveClients : saveClients
}
