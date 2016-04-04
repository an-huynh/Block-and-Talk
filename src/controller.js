var Model = require(__dirname + '/database.js').user;
var database = require(__dirname + '/database.js').sequelize;

database.sync();

function as_array(user) {
    return {
        posx : user.posx,
        posy : user.posy,
        color : user.color
    };
}



/**
 * check if user exists if it does send back username,
 * if not, send back false to represent user does not exist
 *
 * @param socket    socket to client requesting login
 * @param msg       username
 */
module.exports.login_request = function(socket, msg) {
    Model.findOne({where : {
        username : msg
    }}).then(function(user) {
        if (user) {
            socket.emit('login_response', msg);
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
                posx : 0,
                posy : 0,
                color: msg['color']
            }).then(function(user) {
                user.save();
                socket.emit('register_response', user.username);
                module.exports.update_client(io);
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
module.exports.move_request = function(io, msg) {
    console.log('test');
    Model.findOne({
        where : {username : msg['username']}
    }).then(function(user) {
        if (user) {
            movement = false;
            switch(msg['direction']) {
                case 'left':
                    if (user.posx > 0) {
                        user.posx = user.posx - 1;
                        movement = true;
                    }
                    break;
                case 'right':
                    if (user.posx < 350) {
                        user.posx = user.posx + 1;
                        movement = true;
                    }
                    break;
                case 'up':
                    if (user.posy > 0) {
                        user.posy = user.posy - 1;
                        movement = true;
                    }
                    break;
                case 'down':
                    if (user.posy < 230) {
                        user.posy = user.posy + 1;
                        movement = true;
                    }
                    break;
                case 'up-left':
                    if (user.posy > 0 && user.posx > 0) {
                        user.posy = user.posy - 0.707106781187;
                        user.posx = user.posx - 0.707106781187;
                        movement = true;
                    }
                    break;
                case 'up-right':
                    if (user.posy > 0 && user.posx < 360) {
                        user.posy = user.posy - 0.707106781187;
                        user.posx = user.posx + 0.707106781187;
                        movement = true;
                    }
                    break;
                case 'down-left':
                    if (user.posy < 230 && user.posx > 0) {
                        user.posy = user.posy + 0.707106781187;
                        user.posx = user.posx - 0.707106781187;
                        movement = true;
                    }
                    break;
                case 'down-right':
                    if (user.posy < 230 && user.posx < 360) {
                        user.posy = user.posy + 0.707106781187;
                        user.posx = user.posx + 0.707106781187;
                        movement = true;
                    }
                    break;
            }
            if (movement) {
                user.save();
                var response = {
                    username : user.username,
                    array : as_array(user)
                };
                io.emit('move_response', response);
            }
        }
    });
}

/**
 * update client or clients by sending list of
 * all players
 *
 * @param socket        socket to client/clients
 */
module.exports.update_client = function(socket) {
    var response = {};
    Model.findAll().then(function(users) {
        users.forEach(function(user) {
            response[user.username] = as_array(user);
        });
        socket.emit('update_response', response);
    });
}

module.exports.message_request = function(io, msg) {
    if (msg['message'] !== '') {
        io.emit('chat_message', msg);
    }
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
    })
}
