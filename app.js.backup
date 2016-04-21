var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var session = require('express-session')({
    secret: 'my-secret',
    resave: true,
    saveUninitialized: true
});
var sharedSession = require('express-socket.io-session');
var controller = require(__dirname + '/src/controller.js');

app.use(express.static('static'));
app.use(session);

io.use(sharedSession(session));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/html/index.html');
});

io.on('connection', function(socket) {
    console.log('a user has connected.');
    socket.on('login_request', function(msg) {
        controller.login_request(socket, msg);
    });
    socket.on('register_request', function(msg) {
        controller.register_request(socket, msg);
    });
    socket.on('open_name_request', function(msg) {
        controller.open_name_request(socket, msg);
    });
    socket.on('direction_update', function(msg) {
        controller.direction_update(socket, msg);
    });
    socket.on('player_position_request', function(msg) {
        controller.player_position_request(socket);
    });
    socket.on('message_post', function(msg) {
        controller.message_post(io, socket, msg);
    });
    socket.on('private_message_post', function(msg) {
        controller.private_message_post(socket, msg);
    });
    socket.on('player_list_request', function(msg) {
        controller.player_list_request(socket);
    });
    socket.on('snake_direction_update', function(msg) {
        controller.snake_direction_update(socket, msg);
    });
    socket.on('rps_update', function(msg) {
        controller.rps_update(socket, msg);
    });
    socket.on('disconnect', function(msg) {
        console.log('a user has disconnected');
        controller.client_removal(socket);
    });
});
setInterval(controller.positionUpdate, 1000 / 60, io);

http.listen(3000, function() {
    console.log('listening on *:3000');
});

process.on('SIGINT', function() {
    controller.saveClients();
    console.log('goodbye');
    process.exit();
});
