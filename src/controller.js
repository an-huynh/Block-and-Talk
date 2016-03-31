var Model = require(__dirname + '/database.js').user;
var database = require(__dirname + '/database.js').sequelize;

database.sync();

function as_array(user) {
    return {
        username : user.username,
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
        username : msg
    }}).then(function(user) {
        if (!user) {
            Model.create({
                username : msg,
                posx : 0,
                posy : 0,
                color: '#475893'
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
                    if (user.posx != 0) {
                        user.posx = user.posx - 1;
                        movement = true;
                    }
                    break;
                case 'right':
                    if (user.posx != 350) {
                        user.posx = user.posx + 1;
                        movement = true;
                    }
                    break;
                case 'up':
                    if (user.posy != 0) {
                        user.posy = user.posy - 1;
                        movement = true;
                    }
                    break;
                case 'down':
                    if (user.posy != 230) {
                        user.posy = user.posy + 1;
                        movement = true;
                    }
                    break;
            }
            if (movement) {
                user.save();
                io.emit('move_response', as_array(user));
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
    var response = [];
    Model.findAll().then(function(users) {
        users.forEach(function(user) {
            response.push(as_array(user));
        });
        socket.emit('update_response', response);
    });
}

module.exports.message_request = function(io, msg) {
    if (msg['message'] !== '') {
        io.emit('chat_message', msg);
    }
}
