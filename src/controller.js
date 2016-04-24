var database = require(__dirname + '/models/database.js');
var user = require(__dirname + '/models/user.js');
var friend = require(__dirname + '/models/friend.js');
var banned = require(__dirname + '/models/ban.js');
var snakeGame = require(__dirname + '/minigames/snake.js');
var rpsGame = require(__dirname + '/minigames/rps.js');
var objectAssign = require('object-assign');

database.sync();

var clients = {
    '0_0': {},
    '0_1': {}
};
var bySocket = {};
var byName = {};

function loginRequest(socket, msg) {
    user.findOne({where: {
        username: msg.username,
        password: msg.password
    }}).then(function(player) {
        if (player && !(player.username in byName) && !player.banned) {
            var zone = player.sectionX + '_' + player.sectionY;
            bySocket[socket.id] = {
                zone: zone,
                name: player.username
            };
            byName[player.username] = {
                zone: zone,
                socketID: socket.id
            };
            clients[zone][player.username] = {
                record: player,
                direction: null,
            };
            newClient(socket);
            socket.emit('loginResponse', true);
            console.log(player.username + ' has logged in.');
        }
        else
            socket.emit('ERROR');
    });
}

function registerRequest(socket, msg) {
    if (/^[a-z0-9_]+$/i.test(msg.username) && msg.password.length >= 6) {
        banned.findOne({where: {username: msg.username}}).then(function(bannedName) {
            if(!bannedName)
                user.findOne({where: {username: msg.username}}).then(function(player) {
                    if (!player)
                        user.create({
                            username: msg.username,
                            password: msg.password,
                            color: msg.color,
                            shape: msg.shape,
                            stroke: msg.stroke,
                            sectionX: 0,
                            sectionY: 0,
                            posX: 0,
                            posY: 0,
                            admin: false,
                            banned: false
                        }).then(function(newPlayer) {
                            var zone = newPlayer.sectionX + '_' + newPlayer.sectionY;
                            bySocket[socket.id] = {
                                zone: zone,
                                name: newPlayer.username
                            };
                            byName[newPlayer.username] = {
                                zone: zone,
                                socketID: socket.id
                            };
                            clients[zone][newPlayer.username] = {
                                record: newPlayer,
                                direction: null
                            };
                            newClient(socket);
                            socket.emit('registerResponse', true);
                            console.log(newPlayer.username + ' has registered and logged in.');
                        });
                    else
                        socket.emit('registerResponse', 'Player with that Name already exists');
                });
            else
                socket.emit('registerResponse', 'Name is Banned');
        });
    }
    else
        socket.emit('registerResponse', 'Invalid Username');
}

function openNameRequest(socket, msg) {
    banned.findOne({where: {username: msg}}).then(function(bannedName) {
        if (!bannedName)
            user.findOne({where: {username: msg}}).then(function(player) {
                if (!player)
                    socket.emit('openNameResponse', true);
                else
                    socket.emit('openNameResponse', false);
            });
        else
            socket.emit('openNameResponse', false);
    });
}

function playerListRequest(socket) {
    var response = [];
    for (var name in byName)
        response.push(name);
    socket.emit('playerListResponse', response);
}

function newClient(socket) {
    globalAddition(socket);
    zoneAddition(socket);
    friendAddition(socket);
}

function globalAddition(socket) {
    socket.broadcast.emit('globalAddition', bySocket[socket.id].name);
}

function zoneAddition(socket) {
    for (var username in clients[bySocket[socket.id].zone])
        socket.broadcast.to(byName[username].socketID).emit('zoneAddition',
            clients[bySocket[socket.id].zone][bySocket[socket.id].name].record.asArray());
}

function friendAddition(socket) {
    friend.findAll({where: {username: bySocket[socket.id].name}}).then(function(friendships) {
        friendships.forEach(function (friendship) {
            if (friendship.friend in byName)
                friend.findOne({where: {
                    username: friendship.friend,
                    friend: friendship.username
                }}).then(function(mutual) {
                    if (mutual) {
                        socket.broadcast.to(byName[mutual.username].socketID).emit('friendAddition', mutual.friend);
                        socket.emit('friendAddition', mutual.username);
                    }
                });
        });
    });
}

function clientRemovalIO(io, socketID) {
    if (socketID in bySocket) {
        io.emit('playerRemoval', bySocket[socketID].name);
        snakeGame.stopSnakeGame(bySocket[socketID].name, io, socketID);
        rpsGame.rpsRemove(bySocket[socketID].name, io);
        delete clients[bySocket[socketID].zone][bySocket[socketID].name];
        delete byName[bySocket[socketID].name];
        delete bySocket[socketID];
    }
}

function clientRemovalSocket(socket, socketID) {
    if (socketID in bySocket) {
        socket.broadcast.emit('playerRemoval', bySocket[socketID].name);
        socket.emit('playerRemoval', bySocket[socketID].name);
        rpsGame.rpsRemove(bySocket[socketID].name, socket);
        snakeGame.stopSnakeGame(bySocket[socketID].name, socket, socketID);
        delete clients[bySocket[socketID].zone][bySocket[socketID].name];
        delete byName[bySocket[socketID].name];
        delete bySocket[socketID];
    }
}



function zoneRequest(socket) {
    if (socket.id in bySocket) {
        var response = {};
        for (var name in clients[bySocket[socket.id].zone])
            response[name] = clients[bySocket[socket.id].zone][name].record.asArray();
        socket.emit('zoneUpdate', response);
    }
}

function zoneUpdate(io, zone) {
    var response = {};
    for (var name in clients[zone])
        response[name] = clients[zone][name].record.asArray();
    for (var name in clients[zone])
        io.to(byName[name].socketID).emit('zoneUpdate', response);
}

function messagePost(socket, msg) {
    if (socket.id in bySocket)
        if (msg.charAt(0) === '/')
            commandAttempt(bySocket[socket.id].name, msg.split(' '), socket);
        else {
            socket.emit('newMessage', {
                username: bySocket[socket.id].name,
                message: msg
            });
            socket.broadcast.emit('newMessage', {
                username: bySocket[socket.id].name,
                message: msg
            });
        }
}

function sendPM(socket, msg) {
    if (socket.id in bySocket)
        friend.findOne({where: {
            username: bySocket[socket.id].name,
            friend: msg.destination
        }}).then(function(relationship) {
            if (relationship)
                friend.findOne({where: {
                    username: relationship.friend,
                    friend: relationship.username
                }}).then(function(mutual) {
                    if (mutual) {
                        socket.broadcast.to(byName[msg.destination].socketID).emit('newPM',{
                            source: mutual.friend,
                            destination: mutual.username,
                            message: msg.message,
                            reciever: true
                        });
                        socket.emit('newPM', {
                            source: mutual.friend,
                            destination: mutual.username,
                            message: msg.message,
                            reciever: false
                        });
                    }
                });
        });
}

function directionUpdate(socket, msg) {
    if (socket.id in bySocket)
        clients[bySocket[socket.id].zone][bySocket[socket.id].name].direction = msg;
}

function positionUpdate(io) {
    for (var zone in clients) {
        for (var key in clients[zone]) {
            if (clients[zone][key].direction === 'left') {
                if (clients[zone][key].record.posX > 0)
                    clients[zone][key].record.posX -= 1;
                else
                    zoneChange(io, zone, key, {
                        x: -1,
                        y: 0
                    });
            }
            else if (clients[zone][key].direction === 'right') {
                if (clients[zone][key].record.posX < 700)
                    clients[zone][key].record.posX += 1;
                else
                    zoneChange(io, zone, key, {
                        x: 1,
                        y: 0
                    });
            }
            else if (clients[zone][key].direction === 'up') {
                if (clients[zone][key].record.posY > 0)
                    clients[zone][key].record.posY -= 1;
                else
                    zoneChange(io, zone, key, {
                        x: 0,
                        y: -1
                    });
            }
            else if (clients[zone][key].direction === 'down') {
                if (clients[zone][key].record.posY < 460)
                clients[zone][key].record.posY += 1;
                else
                    zoneChange(io, zone, key, {
                        x: 0,
                        y: 1
                    });
            }
            else if (clients[zone][key].direction === 'up-left') {
                if (clients[zone][key].record.posX > 0 && clients[zone][key].record.posY > 0) {
                    clients[zone][key].record.posX -= 1;
                    clients[zone][key].record.posY -= 1;
                }
                else
                    zoneChange(io, zone, key, {
                        x: -1,
                        y: -1
                    });
            }
            else if (clients[zone][key].direction === 'up-right') {
                if (clients[zone][key].record.posX < 700 && clients[zone][key].record.posY > 0) {
                    clients[zone][key].record.posX += 1;
                    clients[zone][key].record.posY -= 1;
                }
                else
                    zoneChange(io, zone, key, {
                        x: 1,
                        y: -1
                    });
            }
            else if (clients[zone][key].direction === 'down-left') {
                if (clients[zone][key].record.posX > 0 && clients[zone][key].record.posY < 460) {
                    clients[zone][key].record.posX -= 1;
                    clients[zone][key].record.posY += 1;
                }
                else
                    zoneChange(io, zone, key, {
                        x: -1,
                        y: 1
                    });
            }
            else if (clients[zone][key].direction === 'down-right') {
                if (clients[zone][key].record.posX < 700 && clients[zone][key].record.posY < 460) {
                    clients[zone][key].record.posX += 1;
                    clients[zone][key].record.posY += 1;
                }
                else
                    zoneChange(io, zone, key, {
                        x: 1,
                        y: 1
                    });
            }
        }
        zoneUpdate(io, zone);
    }
}

function currentZone(socket) {
    if (socket.id in bySocket) {
        socket.emit('currentZone', bySocket[socket.id].zone);
    }
}

function zoneChange(io, zone, name, direction) {
    var possiblePosition = {
        x: clients[zone][name].record.posX + direction.x,
        y: clients[zone][name].record.posY + direction.y
    };
    if (possiblePosition.x < 0) {
        if (possiblePosition.y < 0) {
            var newZone = clients[zone][name].record.sectionX - 1 + '_' + (clients[zone][name].record.sectionY - 1);
            if (newZone in clients) {
                clients[zone][name].record.sectionX -= 1;
                clients[zone][name].record.sectionY -= 1;
                clients[zone][name].record.posX = 700;
                clients[zone][name].record.posY = 460;

                bySocket[byName[name].socketID].zone = newZone;
                byName[name].zone = newZone;

                clients[newZone][name] = objectAssign(clients[zone][name]);
                io.to(byName[name].socketID).emit('currentZone', newZone);
                delete clients[zone][name];
            }
        }
        else if (possiblePosition.y > 460) {
            var newZone = clients[zone][name].record.sectionX - 1 + '_' + (clients[zone][name].record.sectionY + 1);
            if (newZone in clients) {
                clients[zone][name].record.sectionX -= 1;
                clients[zone][name].record.sectionY += 1;
                clients[zone][name].record.posX = 700;
                clients[zone][name].record.posY = 0;
                clients[newZone][name] = objectAssign(clients[zone][name]);
                io.to(byName[name].socketID).emit('currentZone', newZone);
                bySocket[byName[name].socketID].zone = newZone;
                byName[name].zone = newZone;
                delete clients[zone][name];
            }
        }
        else {
            var newZone = clients[zone][name].record.sectionX - 1 + '_' + clients[zone][name].record.sectionY;
            if (newZone in clients) {
                clients[zone][name].record.sectionX -= 1;
                clients[zone][name].record.posX = 700;
                clients[newZone][name] = objectAssign(clients[zone][name]);
                io.to(byName[name].socketID).emit('currentZone', newZone);
                bySocket[byName[name].socketID].zone = newZone;
                byName[name].zone = newZone;
                delete clients[zone][name];
            }
        }
    }
    else if (possiblePosition.x > 700) {
        if (possiblePosition.y < 0) {
            var newZone = clients[zone][name].record.sectionX + 1 + '_' + (clients[zone][name].record.sectionY - 1);
            if (newZone in clients) {
                clients[zone][name].record.sectionX += 1;
                clients[zone][name].record.sectionY -= 1;
                clients[zone][name].record.posX = 0;
                clients[zone][name].record.posY = 460;
                clients[newZone][name] = objectAssign(clients[zone][name]);
                io.to(byName[name].socketID).emit('currentZone', newZone);
                bySocket[byName[name].socketID].zone = newZone;
                byName[name].zone = newZone;
                delete clients[zone][name];
            }
        }
        else if (possiblePosition.y > 460) {
            var newZone = clients[zone][name].record.sectionX + 1 + '_' + (clients[zone][name].record.sectionY + 1);
             if (newZone in clients) {
                 clients[zone][name].record.sectionX += 1;
                 clients[zone][name].record.sectionY += 1;
                 clients[zone][name].record.posX = 700;
                 clients[zone][name].record.posY = 0;
                 clients[newZone][name] = objectAssign(clients[zone][name]);
                 io.to(byName[name].socketID).emit('currentZone', newZone);
                 bySocket[byName[name].socketID].zone = newZone;
                 byName[name].zone = newZone;
                 delete clients[zone][name];
            }
        }
        else {
            var newZone = clients[zone][name].record.sectionX + 1 + '_' + clients[zone][name].record.sectionY;
            if (newZone in clients) {
                clients[zone][name].record.sectionX += 1;
                clients[zone][name].record.posX = 0;
                clients[newZone][name] = objectAssign(clients[zone][name]);
                io.to(byName[name].socketID).emit('currentZone', newZone);
                bySocket[byName[name].socketID].zone = newZone;
                byName[name].zone = newZone;
                delete clients[zone][name];
            }
        }
    }
    else if (possiblePosition.y < 0) {
        var newZone = clients[zone][name].record.sectionX + '_' + (clients[zone][name].record.sectionY - 1);
        if (newZone in clients) {
            clients[zone][name].record.sectionY -= 1;
            clients[zone][name].record.posY = 460;
            clients[newZone][name] = objectAssign(clients[zone][name]);
            io.to(byName[name].socketID).emit('currentZone', newZone);
            bySocket[byName[name].socketID].zone = newZone;
            byName[name].zone = newZone;
            delete clients[zone][name];
        }
    }
    else if (possiblePosition.y > 460) {
        var newZone = clients[zone][name].record.sectionX + '_' + (clients[zone][name].record.sectionY + 1);
        if (newZone in clients) {
            clients[zone][name].record.sectionY += 1;
            clients[zone][name].record.posY = 0;
            clients[newZone][name] = objectAssign(clients[zone][name]);
            io.to(byName[name].socketID).emit('currentZone', newZone);
            bySocket[byName[name].socketID].zone = newZone;
            byName[name].zone = newZone;
            delete clients[zone][name];
        }
    }
}

function commandAttempt(username, param, socket) {
    if (param[0] === '/friend' && param.length === 2) {
        if (username !== param[1])
            user.findOne({where: {username: param[1]}}).then(function(player) {
                if (player)
                    friend.findOne({where: {
                        username: username,
                        friend: param[1]
                    }}).then(function(relation) {
                        if (!relation)
                            friend.create({
                                username: username,
                                friend: param[1]
                            }).then(function(friendship) {
                                friend.findOne({where: {
                                    username: friendship.friend,
                                    friend: friendship.username
                                }}).then(function(mutual) {
                                    if (mutual) {
                                        socket.broadcast.to(byName[mutual.username].socketID).emit('friendAddition', mutual.friend);
                                        socket.emit('friendAddition', friend.username);
                                    }
                                });
                            });
                    });
            });
    }
    if (param[0] === '/kick' && clients[byName[username].zone][username].record.admin && param.length === 2) {
        if (param[1] in byName && param[1] !== username) {
            clients[byName[param[1]].zone][param[1]].record.save();
            socket.to(byName[param[1]].socketID).emit('stopGame', '');
            clientRemovalSocket(socket, byName[param[1]].socketID);
            console.log(param[1] + ' has been kicked by ' + username);
        }
    }
    if (param[0] === '/op' && clients[byName[username].zone][username].record.admin && param.length === 2) {
        if (param[1] in byName) {
            if (clients[byName[param[1]].zone][param[1]].record.admin === false) {
                clients[byName[param[1]].zone][param[1]].record.admin = true;
                socket.broadcast.to(byName[param[1]].socketID).emit('newMessage', {
                    username: 'Server',
                    message: 'You have been made an administrator'
                });
                console.log(param[1] + ' has been made an administrator by ' + username);
            }
        }
        else
            user.findOne({where: {username: param[1]}}).then(function(player) {
                if (player) {
                    if (player.admin === false) {
                        player.admin = true;
                        player.save();
                        console.log(param[1] + ' has been made an administrator by ' + username);
                    }
                }
            });
    }
    if (param[0] === '/deop' && clients[byName[username].zone][username].record.admin && param.length === 2) {
        if (param[1] in byName) {
            if (clients[byName[param[1]].zone][param[1]].record.admin === true){
                clients[byName[param[1]].zone][param[1]].record.admin = true;
                socket.broadcast.to(byName[param[1]].socketID).emit('newMessage', {
                    username: 'Server',
                    message: 'You are no longer an administrator'
                });
                console.log(param[1] + ' has had administrative powers revoked by ' + username);
            }
        }
        else
            user.findOne({where: {username: param[1]}}).then(function(player) {
                if (player) {
                    if (player.admin === true) {
                        player.admin = false;
                        player.save();
                        console.log(param[1] + ' has had administrative powers revoked by ' + username);
                    }
                }
            });
    }
    if (param[0] === '/ban' && clients[byName[username].zone][username].record.admin && param.length === 2) {
        banned.findOne({where: {username: param[1]}}).then(function(bannedName) {
            if (!bannedName) {
                banned.create({username: param[1]});
                if (param[1] in byName) {
                    clients[byName[param[1]].zone][param[1]].record.banned = true;
                    clients[byName[param[1]].zone][param[1]].record.save();
                    socket.to(byName[param[1]].socketID).emit('stopGame', '');
                    clientRemovalSocket(socket, byName[param[1]].socketID);
                }
                else
                    user.findOne({where: {username: param[1]}}).then(function(player) {
                        if (player) {
                            player.banned = true;
                            player.save();
                        }
                    });
                console.log(param[1] + ' has been banned by ' + username);
            }
        });
    }
    if (param[0] === '/unban' && param.length === 2 && clients[byName[username].zone][username].record.admin) {
        banned.findOne({where: {username: param[1]}}).then(function(bannedName) {
            if (bannedName) {
                bannedName.destroy();
                user.findOne({where: {username: param[1]}}).then(function(bannedPlayer) {
                    if (bannedPlayer) {
                        bannedPlayer.banned = false;
                        bannedPlayer.save();
                    }
                });
                console.log(param[1] + ' has been unbanned by ' + username);
            }
        });
    }
    if (param[0] === '/snake' && param.length === 1)
        snakeGame.startSnakeGame(username, socket);
    if (param[0] === '/rps' && param.length === 2) {
        if (param[1] !== username && param[1] in byName)
            rpsGame.rpsChallenge(username, param[1], socket);
    }
}

function serverCommand(io, param) {
    if(param[0] === '/op' && param.length === 2) {
        if (param[1] in byName) {
            if (clients[byName[param[1]].zone][param[1]].record.admin === false) {
                clients[byName[param[1]].zone][param[1]].record.admin = true;
                console.log(param[1] + ' has been granted administrative powers');
            }
            else
                console.log(param[1] + ' is already an administrator');
        }
        else {
            user.findOne({where: {username: param[1]}}).then(function(player) {
                if (player) {
                    if (player.admin == false) {
                        player.admin = true;
                        player.save();
                        console.log(player.username + ' has been granted administrative powers');
                    }
                    else
                        console.log(player.username + ' is already an administrator');
                }
                else
                    console.log(param[1] + ' does not exist');
            });
        }
    }
    if (param[0] === '/deop' && param.length === 2) {
        if (param[1] in byName) {
            if (clients[byName[param[1]].zone][param[1]].record.admin === true) {
                clients[byName[param[1]].zone][param[1]].record.admin = false;
                console.log(param[1] + ' has had administrative powers revoked');
            }
        }
        else
            user.findOne({where: {username: param[1]}}).then(function(player) {
                if (player) {
                    if (player.admin === true) {
                        player.admin = false;
                        player.save();
                        console.log(param[1] + ' has had administrative powers revoked');
                    }
                }
            });
    }
    if(param[0] === '/clear')
        process.stdout.write('\033c');
    if (param[0] === '/kick' && param.length === 2) {
        if (param[1] in byName) {
            clients[byName[param[1]].zone][param[1]].record.save();
            io.to(byName[param[1]].socketID).emit('stopGame', '');
            clientRemovalIO(io, byName[param[1]].socketID);
            console.log(param[1] + ' has been kicked');
        }
    }
    if (param[0] === '/ban' && param.length === 2) {
        banned.findOne({where: {username: param[1]}}).then(function(bannedName) {
            if (!bannedName) {
                banned.create({username: param[1]});
                if (param[1] in byName) {
                    clients[byName[param[1]].zone][param[1]].record.banned = true;
                    clients[byName[param[1]].zone][param[1]].record.save();
                    io.to(byName[param[1]].socketID).emit('stopGame', '');
                    clientRemovalIO(io, byName[param[1]].socketID);
                }
                else
                    user.findOne({where: {username: param[1]}}).then(function(player) {
                        if (player) {
                            console.log('eyy');
                            player.banned = true;
                            player.save();
                        }
                    });
                console.log(param[1] + ' has been banned');
            }
        });
    }
    if (param[0] === '/unban' && param.length === 2) {
        banned.findOne({where: {username: param[1]}}).then(function(banned) {
            if (banned) {
                banned.destroy();
                user.findOne({where: {username: param[1]}}).then(function(bannedPlayer) {
                    if (bannedPlayer) {
                        bannedPlayer.banned = false;
                        bannedPlayer.save();
                    }
                });
                console.log(param[1] + ' has been unbanned');
            }
        });
    }
    if (param[0] === '/stop') {
        console.log('Stopping Server...');
        console.log("Goodbye :'\(");
        process.exit();
    }
    else
        if (param[0] === '/help') {
            process.stdout.write('\033c');
            console.log(
                '/kick [username]    - kick a player\n' +
                '/op [username]      - grant someone administrative power\n' +
                '/deop [username]    - revoke someones administrative power\n' +
                '/ban [username]     - ban a player or username\n' +
                '/unban [username]   - unban a player or username\n' +
                '/clear              - clear console\n' +
                '/stop               - stop server\n'
            );
        }
}

function updateSnake(socket, msg) {
    snakeGame.snakeUpdate(bySocket[socket.id].name, msg, socket);
}

function updateRPS(socket, msg) {
    rpsGame.rpsUpdate(bySocket[socket.id].name, socket, msg);
}

setInterval(function() {
    for (var zone in clients) {
        for (var name in clients[zone])
            clients[zone][name].record.save();
    }
}, 1000);

module.exports = {
    loginRequest: loginRequest,
    registerRequest: registerRequest,
    openNameRequest: openNameRequest,
    playerListRequest: playerListRequest,
    newClient: newClient,
    clientRemovalIO: clientRemovalIO,
    zoneRequest: zoneRequest,
    directionUpdate: directionUpdate,
    positionUpdate: positionUpdate,
    currentZone: currentZone,
    messagePost: messagePost,
    sendPM: sendPM,
    serverCommand: serverCommand,
    updateSnake: updateSnake,
    updateRPS: updateRPS
};
