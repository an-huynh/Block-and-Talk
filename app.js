var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var controller = require(__dirname + '/src/controller.js');

process.stdout.write('\033c');

app.use(express.static('static'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/html/index.html');
});

io.on('connection', function(socket) {
    socket.on('loginRequest', function(msg) {
        controller.loginRequest(socket, msg);
    });
    socket.on('registerRequest', function(msg) {
        controller.registerRequest(socket, msg);
    });
    socket.on('openNameRequest', function(msg) {
        controller.openNameRequest(socket, msg);
    });
    socket.on('playerListRequest', function(msg) {
        controller.playerListRequest(socket);
    })
    socket.on('directionUpdate', function(msg) {
        controller.directionUpdate(socket, msg);
    });
    socket.on('zoneRequest', function(msg) {
        controller.zoneRequest(socket);
    });
    socket.on('currentZoneRequest', function(msg) {
        controller.currentZone(socket);
    });
    socket.on('messagePost', function(msg) {
        controller.messagePost(socket, msg);
    });
    socket.on('pmPost', function(msg) {
        controller.sendPM(socket, msg);
    });
    socket.on('snakeUpdate', function(msg) {
        controller.updateSnake(socket, msg);
    });
    socket.on('rpsUpdate', function(msg) {
        controller.updateRPS(socket, msg);
    })
    socket.on('disconnect', function(msg) {
        controller.clientRemovalIO(io, socket.id);
    });
});

setInterval(controller.positionUpdate, 1000 / 120, io);

http.listen(3000, function() {
    console.log('Starting Server...');
    console.log('listening on *:3000');
});

process.stdin.setEncoding('utf-8');
process.stdin.on('data', function(msg) {
    if (msg.trim() === '/exit') {
        console.log('Stopping Server...');
        console.log('Goodbye :D');
        process.exit();
    }
    else
        controller.serverCommand(io, msg.trim().split(' '));
});

process.on('SIGINT', function() {
    console.log('goodbye');
    process.exit();
});
