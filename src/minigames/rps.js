var rpsPlayer = {};
var rpsChoice = {};

function rpsChallenge(name, targetName, socket, targetID) {
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

function rpsUpdate(name, socket, choice) {
    if (name in rpsChoice) {
        rpsChoice[name] = choice;
        if (rpsChoice[rpsPlayer[name].target]) {
            var player1Choice = rpsChoice[name];
            var player2Choice = rpsChoice[rpsPlayer[name].target];
            var result;
            if (player1Choice && player2Choice && player1Choice === player2Choice)
                result = 'tied';
            else if (player1Choice === 'Rock' && player2Choice === 'Scissors')
                result = 'won';
            else if (player1Choice === 'Scissors' && player2Choice === 'Paper')
                result = 'won';
            else if (player1Choice === 'Paper' && player2Choice === 'Rock')
                result = 'won';
            else if (player1Choice === 'Rock' && player2Choice === 'Paper')
                result = 'lost';
            else if (player1Choice === 'Scissors' && player2Choice === 'Rock')
                result = 'lost';
            else if (player1Choice === 'Paper' && player2Choice === 'Scissors')
                result = 'lost';
            console.log(result);
            if (result === 'won') {
                socket.emit('rpsResult', result);
                socket.broadcast.to(rpsPlayer[rpsPlayer[name].target].id).emit('rpsResult', 'lost');
            }
            else if (result === 'lost') {
                socket.emit('rpsResult', result);
                socket.broadcast.to(rpsPlayer[rpsPlayer[name].target].id).emit('rpsResult', 'won');
            }
            else {
                socket.emit('rpsResult', result);
                socket.broadcast.to(rpsPlayer[rpsPlayer[name].target].id).emit('rpsResult', result);
            }
            delete rpsPlayer[rpsPlayer[name].target];
            delete rpsChoice[rpsPlayer[name].target];
            delete rpsPlayer[name];
            delete rpsChoice[name]
        }
    }
}

function removePlayer(name, socket) {
    if (name in rpsPlayer) {
        if (rpsPlayer[rpsPlayer[name].target].target === name) {
            socket.to(rpsPlayer[rpsPlayer[name].target].id).emit('rpsResult', 'won');
            delete rpsPlayer[rpsPlayer[name].target];
            delete rpsChoice[rpsPlayer[name].target];
            delete rpsPlayer[name];
            delete rpsChoice[name]
        }
        delete rpsPlayer[name];
        delete rpsChoice[name]
    }
}

module.exports = {
    rpsChallenge: rpsChallenge,
    rpsUpdate: rpsUpdate,
    rpsRemove: removePlayer
}
