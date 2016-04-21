var database = require(__dirname + '/models/database.js');
var user = require(__dirname + '/models/user.js');
var snakeScore = require(__dirname + '/models/snakescore.js');
var friend = require(__dirname + '/models/friend.js');
var banned = require(__dirname + '/models/ban.js');
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
        if (player && !(player.username in byName)) {
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
        }
        else
            socket.emit('loginResponse', false);
    });
}

function registerRequest(socket, msg) {
    if (/^[a-z0-9_]+$/i.text(msg.username) && msg.password.length >= 6) {
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
                        });
                    else
                        socket.emit('registerResponse', false);
                });
            else
                socket.emit('registerResponse', false);
        });
    }
    else
        socket.emit('registerResponse', false);
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

function clientRemoval(socket) {
    if (socket.id in bySocket) {
        socket.broadcast.emit('playerRemoval', bySocket[socket.id].name);
        delete clients[bySocket[socket.id].zone][bySocket[socket.id].name];
        var id = socket.id;
        delete byName[bySocket[socket.id].name];
        delete bySocket[id];
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
                clients[zone][key].record.posX -= 1;
                if (clients[zone][key].record.posX < 0)
                    zoneChange(io, zone, key);
            }
            else if (clients[zone][key].direction === 'right') {
                clients[zone][key].record.posX += 1;
                if (clients[zone][key].record.posX > 700)
                    zoneChange(io, zone, key);
            }
            else if (clients[zone][key].direction === 'up') {
                clients[zone][key].record.posY -= 1;
                if (clients[zone][key].record.posY < 0)
                    zoneChange(io, zone, key);
            }
            else if (clients[zone][key].direction === 'down') {
                clients[zone][key].record.posY += 1;
                if (clients[zone][key].record.posY > 460)
                    zoneChange(io, zone, key);
            }
            else if (clients[zone][key].direction === 'up-left') {
                clients[zone][key].record.posX -= 1;
                clients[zone][key].record.posY -= 1;
                if (clients[zone][key].record.posX < 0 || clients[zone][key].record.posY < 0)
                    zoneChange(io, zone, key);
            }
            else if (clients[zone][key].direction === 'up-right') {
                clients[zone][key].record.posX += 1;
                clients[zone][key].record.posY -= 1;
                if (clients[zone][key].record.posX > 700 || clients[zone][key].record.posY < 0)
                    zoneChange(io, zone, key);
            }
            else if (clients[zone][key].direction === 'down-left') {
                clients[zone][key].record.posX -= 1;
                clients[zone][key].record.posY += 1;
                if (clients[zone][key].record.posX < 0 || clients[zone][key].record.posY > 460)
                    zoneChange(io, zone, key);
            }
            else if (clients[zone][key].direction === 'down-right') {
                clients[zone][key].record.posX += 1;
                clients[zone][key].record.posY += 1;
                if (clients[zone][key].record.posX > 700 || clients[zone][key].record.posY > 460)
                    zoneChange(io, zone, key);
            }
        }
        zoneUpdate(io, zone);
    }
}

function currentZone(socket) {
    socket.emit('currentZone', bySocket[socket.id].zone);
}

function zoneChange(io, zone, name) {
    if (clients[zone][name].record.posX < 0) {
        if (clients[zone][name].record.posY < 0) {
            var newZone = clients[zone][name].record.sectionX - 1 + '_' + (clients[zone][name].record.sectionY - 1);
            if (!(newZone in clients)) {
                clients[newZone] = {};
            }
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
        else if (clients[zone][name].record.posY > 460) {
            var newZone = clients[zone][name].record.sectionX - 1 + '_' + (clients[zone][name].record.sectionY + 1);
            if (!(newZone in clients)) {
                clients[newZone] = {};
            }
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
        else {
            var newZone = clients[zone][name].record.sectionX - 1 + '_' + clients[zone][name].record.sectionY;
            if (!(newZone in clients)) {
                clients[newZone] = {};
            }
            clients[zone][name].record.sectionX -= 1;
            clients[zone][name].record.posX = 700;
            clients[newZone][name] = objectAssign(clients[zone][name]);
            io.to(byName[name].socketID).emit('currentZone', newZone);
            bySocket[byName[name].socketID].zone = newZone;
            byName[name].zone = newZone;
            delete clients[zone][name];
        }
    }
    else if (clients[zone][name].record.posX > 700) {
        if (clients[zone][name].record.posY < 0) {
            var newZone = clients[zone][name].record.sectionX + 1 + '_' + (clients[zone][name].record.sectionY - 1);
            if (!(newZone in clients)) {
                clients[newZone] = {};
            }
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
        else if (clients[zone][name].record.posY > 460) {
            var newZone = clients[zone][name].record.sectionX + 1 + '_' + (clients[zone][name].record.sectionY + 1);
             if (!(newZone in clients)) {
                clients[newZone] = {};
            }
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
        else {
            var newZone = clients[zone][name].record.sectionX + 1 + '_' + clients[zone][name].record.sectionY;
            if (!(newZone in clients)) {
                clients[newZone] = {};
            }
            clients[zone][name].record.sectionX += 1;
            clients[zone][name].record.posX = 0;
            clients[newZone][name] = objectAssign(clients[zone][name]);
            io.to(byName[name].socketID).emit('currentZone', newZone);
            bySocket[byName[name].socketID].zone = newZone;
            byName[name].zone = newZone;
            delete clients[zone][name];
        }
    }
    else if (clients[zone][name].record.posY < 0) {
        var newZone = clients[zone][name].record.sectionX + '_' + (clients[zone][name].record.sectionY - 1);
        if (!(newZone in clients)) {
            clients[newZone] = {};
        }
        clients[zone][name].record.sectionY -= 1;
        clients[zone][name].record.posY = 460;
        clients[newZone][name] = objectAssign(clients[zone][name]);
        io.to(byName[name].socketID).emit('currentZone', newZone);
        bySocket[byName[name].socketID].zone = newZone;
        byName[name].zone = newZone;
        delete clients[zone][name];
    }
    else if (clients[zone][name].record.posY > 460) {
        var newZone = clients[zone][name].record.sectionX + '_' + (clients[zone][name].record.sectionY + 1);
        if (!(newZone in clients)) {
           clients[newZone] = {};
        }
        clients[zone][name].record.sectionY += 1;
        clients[zone][name].record.posY = 0;
        clients[newZone][name] = objectAssign(clients[zone][name]);
        io.to(byName[name].socketID).emit('currentZone', newZone);
        bySocket[byName[name].socketID].zone = newZone;
        byName[name].zone = newZone;
        delete clients[zone][name];
    }
}

function commandAttempt(username, param, socket) {
    if (param[0] === '/friend') {
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
}

function serverCommand(param) {
    if(param[0] === '/admin') {
        if (param[1] in byName) {
            if (clients[byName[param[1]].zone][param[1]].record.admin == false) {
                clients[byName[param[1]].zone][param[1]].record.admin = true;
                console.log(param[1] + ' has been made an administrator');
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
                        console.log(player.username + ' has been made an administrator');
                    }
                    else
                        console.log(player.username + ' is already an administrator');
                }
                else
                    console.log(param[1] + ' does not exist');
            });
        }
    }
    if(param[0] === '/clear')
        process.stdout.write('\033c');
}

module.exports = {
    loginRequest: loginRequest,
    registerRequest: registerRequest,
    openNameRequest: openNameRequest,
    playerListRequest: playerListRequest,
    newClient: newClient,
    clientRemoval: clientRemoval,
    zoneRequest: zoneRequest,
    directionUpdate: directionUpdate,
    positionUpdate: positionUpdate,
    currentZone: currentZone,
    messagePost: messagePost,
    sendPM: sendPM,
    serverCommand: serverCommand
};
