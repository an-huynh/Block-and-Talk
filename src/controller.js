var model = require(__dirname + '/database.js').user;
var database = require(__dirname + '/database.js').sequelize;

database.sync();

var clients = {};

function as_array(record) {
    return {
        username : record.username,
        color    : record.color,
        shape    : record.shape,
        posx     : record.posx,
        posy     : record.posy
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
                posy     : 0
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
    clients[socket.handshake.session.userdata].direction = msg;
}

function client_addition(socket, record) {
    socket.broadcast.emit('player_addition', as_array(record));
}

module.exports.client_removal = function(socket) {
    if (socket.handshake.session.userdata) {
        clients[socket.handshake.session.userdata].record.save();
        socket.broadcast.emit('player_removal', socket.handshake.session.userdata);
        delete clients[socket.handshake.session.userdata];
    }
}

module.exports.player_list_request = function(socket) {
    var response = {};
    for (var key in clients)
        response[key] = as_array(clients[key].record);
    socket.emit('player_list_response', response);
}

module.exports.message_post = function(socket, msg) {
    var message = {
        username : socket.handshake.session.userdata,
        message  : msg
    };
    socket.broadcast.emit('message_post', message);
    socket.emit('message_post', message);
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
    var index = response.indexOf(socket.handshake.session.username);
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

setInterval(function() {
    for (var key in clients)
        clients[key].record.save();
}, 10000);
