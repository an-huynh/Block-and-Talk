var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var controller = require(__dirname + '/src/controller.js');

app.use(express.static('static'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/html/index.html');
});

io.on('connection', function(socket) {
    console.log('A user has connected');
    socket.on('login_request', function(msg) {
        controller.login_request(socket, msg);
    });
    socket.on('register_request', function(msg) {
        controller.register_request(socket, io, msg);
    })
    socket.on('move_request', function(msg) {
        console.log('moving');
        controller.move_request(io, msg);
    });
    socket.on('update_request', function(msg) {
        controller.update_client(socket);
    });
    socket.on('message_request', function(msg) {
        controller.message_request(io, msg);
    });
    socket.on('open_name_request', function(msg) {
        controller.open_name_request(socket, msg);
    });
})


http.listen(3000, function() {
    console.log('listening on *:3000');
});
