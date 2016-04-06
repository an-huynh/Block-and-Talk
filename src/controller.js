var Model = require(__dirname + '/database.js').user;
var database = require(__dirname + '/database.js').sequelize;

database.sync();

var clients = {};

function as_array(user) {
    return {
        posx : user.posx,
        posy : user.posy,
        color : user.color,
        shape : user.shape
    };
}



/**
 * check if user exists if it does send back username,
 * if not, send back false to represent user does not exist
 *
 * @param socket    socket to client requesting login
 * @param msg       username
 */
module.exports.login_request = function(socket, io, msg) {
    Model.findOne({where : {
        username : msg.username,
        password : msg.password
    }}).then(function(user) {
        if (user) {
            socket.handshake.session.userdata = user.username;
            clients[socket.handshake.session.userdata] = {};
            clients[socket.handshake.session.userdata].record = user;
            clients[socket.handshake.session.userdata].id = socket.id;
            socket.emit('login_response', true);
            module.exports.update_client(io);
            playerListUpdate(socket, socket.handshake.session.userdata);
        }
        else {
            socket.emit('login_response', false);
        }
    });
}

/**
 * attempt to add user to database, will emit false through socket
 * if user already exist in database. If user is created, send
 * list of users to every client to update player list
 *
 * @param socket        socket to client requesting register
 * @param io            sockets to all clients connected
 * @param msg           username
 */
module.exports.register_request = function(socket, io, msg) {
    Model.findOne({where : {
        username : msg['username']
    }}).then(function(user) {
        if (!user) {
            Model.create({
                username : msg['username'],
                password : msg['password'],
                posx : 0,
                posy : 0,
                color: msg['color'],
                shape: msg['shape']
            }).then(function(user) {
                user.save();
                socket.handshake.session.userdata = user.username;
                clients[socket.handshake.session.userdata] = {};
                clients[socket.handshake.session.userdata].record = user;
                clients[socket.handshake.session.userdata].id = socket.id;
                socket.emit('register_response', true);
                module.exports.update_client(io);
                playerListUpdate(socket, socket.handshake.session.userdata);
            })
        }
        else {
            socket.emit('register_response', false);
        }
    })
}

/**
 * update the position of a user depending on
 * direction noted by msg
 *
 * @param io        sockets to all clients
 * @param msg       associative array containing user requesting
 *                  move and direction of move
 */
module.exports.move_request = function(socket, msg) {
    clients[socket.handshake.session.userdata].record.deltaX = msg['deltaX'];
    clients[socket.handshake.session.userdata].record.deltaY = msg['deltaY'];
}

/**
 * update client or clients by sending list of
 * all players
 *
 * @param socket        socket to client/clients
 */
module.exports.update_client = function(socket) {
    var response = {};
    for (var key in clients) {
        response[key] = as_array(clients[key].record);
    }
    socket.emit('update_response', response);
}

module.exports.message_request = function(socket, io, msg) {
    var message = {
        username : socket.handshake.session.userdata,
        message : msg
    };
    io.emit('chat_message', message);
}

module.exports.open_name_request = function(socket, msg) {
    Model.findOne({where : {
        username : msg
    }}).then(function(user) {
        if (!user) {
            socket.emit('open_name_response', msg);
        }
        else {
            socket.emit('open_name_response', false);
        }
    });
}

module.exports.remove_client = function(socket, io) {
    if (socket.handshake.session.userdata) {
        socket.broadcast.emit('player_list_removal', socket.handshake.session.userdata);
        clients[socket.handshake.session.userdata].record.deltaX = null;
        clients[socket.handshake.session.userdata].record.deltaY = null;
        clients[socket.handshake.session.userdata].record.save();
        delete clients[socket.handshake.session.userdata];
    }
    module.exports.update_client(io);
}

module.exports.update_position = function(io) {
    var movement = false;
    for (var key in clients) {
        var direction = null;
        if (clients[key].record.deltaX || clients[key].record.deltaY) {
            if (clients[key].record.deltaX && !clients[key].record.deltaY) {
                direction = clients[key].record.deltaX;
            }
            if (clients[key].record.deltaY && !clients[key].record.deltaX) {
                direction = clients[key].record.deltaY;
            }
            if (clients[key].record.deltaX && clients[key].record.deltaY) {
                if (clients[key].record.deltaX == 'left' && clients[key].record.deltaY == 'up') {
                    direction = 'up-left';
                }
                else if (clients[key].record.deltaX == 'right' && clients[key].record.deltaY == 'up') {
                    direction = 'up-right';
                }
                else if (clients[key].record.deltaX == 'left' && clients[key].record.deltaY == 'down') {
                    direction = 'down-left';
                }
                else if (clients[key].record.deltaX == 'right' && clients[key].record.deltaY == 'down') {
                    direction = 'down-right';
                }
            }
        }
        switch(direction) {
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
        module.exports.update_client(io);
}

module.exports.playerListRequest = function(socket) {
    var response = [];
    for (var key in clients) {
        if (key !== socket.handshake.session.userdata) {
            response.push(key);
        }
    }
    socket.emit('player_list_response', response);
}

function playerListUpdate(socket, name) {
    var message = [name];
    socket.broadcast.emit('player_list_response', message);
}

module.exports.private_message = function(socket, msg) {
    msg.sender = socket.handshake.session.userdata;
    socket.broadcast.to(clients[msg['username']].id).emit('private_message_response', msg);
    socket.emit('private_message_response', msg);
}

setInterval(function() {
    for (var key in clients) {
        clients[key].record.save();
    }
}, 10000);
