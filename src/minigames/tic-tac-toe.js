var playerChallenge = {};
var game;

function ttoChallenge(name, targetName, socket, targetID) {
    playerChallenge[name] = {};
    playerChallenge[name].opponent = targetName;
    playerChallenge[name].id = socket.id;
    if (playerChallenge[targetName] && playerChallenge[targetName] === name) {
        socket.emit('startTTO', '');
        socket.broadcast.to
    }
    
}

function rpsChallenge(name, targetName, socket) {
    rpsPlayer[name] = {};
    rpsPlayer[name].target = targetName;
    rpsPlayer[name].id = socket.id;
    if (rpsPlayer[targetName] && rpsPlayer[targetName].target === name) {
        socket.emit('startRPS', '');
        socket.broadcast.to(targetID).emit('startRPS', '');
        rpsChoice[name] = null;
        rpsChoice[targetName] = null;
    }
    else
        socket.broadcast.to(targetID).emit('newMessage', {
            username: 'Server',
            message: name + ' has challenged you to rps! enter /rps ' + name + ' to accept'
        });
}