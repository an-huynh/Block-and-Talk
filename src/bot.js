var user = require(__dirname + '/models/user.js');
var bot;
var dummy = {};

function addToClientList(clientList) {
    user.findOne({where: {
        username: 'bot'
    }}).then(function(entity) {
        if (entity) {
            var zone = entity.sectionX + '_' + entity.sectionY;
            clientList[zone][entity.username] = {};
            clientList[zone][entity.username].record = entity;
            clientList[zone][entity.username].direction = null;
            clientList[zone][entity.username].player = false;
            clientList[zone][entity.username].trapped = false;
            bot = entity;
            setInterval(directionUpdate, 1000, clientList);
        }
        else {
            user.create({
                username: 'bot',
                color: 'blue',
                shape: 'triangle',
                stroke: 'red',
                sectionX: 0,
                sectionY: 0,
                posX: 0,
                posY: 0
            }).then(function(entity) {
                var zone = entity.sectionX + '_' + entity.sectionY;
                clientList[zone][entity.username] = {};
                clientList[zone][entity.username].record = entity;
                clientList[zone][entity.username].direction = null;
                clientList[zone][entity.username].player = false;
                clientList[zone][entity.username].trapped = false;
                bot = entity;
                setInterval(directionUpdate, 1000, clientList);
            });
        }
    });
};

function addBoringBots(clientList) {
    for (i = 0; i < 30; ++i) {
        addBoringBot(clientList, i);
    }
}

function addBoringBot(clientList, i) {
    user.findOne({where: {
        username: 'bot' + i
    }}).then(function(entity) {
        console.log(i);
        if (entity) {
            var zone = entity.sectionX + '_' + entity.sectionY;
            clientList[zone][entity.username] = {};
            clientList[zone][entity.username].record = entity;
            clientList[zone][entity.username].direction = null;
            clientList[zone][entity.username].player = false;
            clientList[zone][entity.username].trapped = true;
            dummy[i] = entity;
            setInterval(dummyUpdate, 1000 + i, clientList, i);
        }
        else {
            var stuff = {};
            if (i === 0) {
                stuff.color = 'blue';
                stuff.shape = 'star';
                stuff.stroke = 'green';
            }
            else if (i === 1) {
                stuff.color = 'green';
                stuff.shape = 'square';
                stuff.stroke = 'blue';
            }
            else if (i === 2) {
                stuff.color = 'orange';
                stuff.shape = 'triangle';
                stuff.stroke = 'white';
            }
            else if (i === 3) {
                stuff.color = 'white';
                stuff.shape = 'star';
                stuff.stroke = 'yellow';
            }
            else {
                stuff.color = 'red';
                stuff.shape = 'pentagram';
                stuff.stroke = 'black';
            }
            user.create({
                username: 'bot' + i,
                color: stuff.color,
                shape: stuff.shape,
                stroke: stuff.stroke,
                sectionX: 0,
                sectionY: 2,
                posX: 0,
                posY: 0
            }).then(function(entity) {
                entity.save();
                var trapped = false;
                if (i > 3) {
                    trapped = true;
                }
                var zone = entity.sectionX + '_' + entity.sectionY;
                clientList[zone][entity.username] = {};
                clientList[zone][entity.username].record = entity;
                clientList[zone][entity.username].direction = null;
                clientList[zone][entity.username].player = false;
                clientList[zone][entity.username].trapped = trapped;
                dummy[i] = entity;
                setInterval(dummyUpdate, 1000 + i, clientList, i);
            });
        }
    });
}

function directionUpdate(clientList) {
    var zone = bot.sectionX + '_' + bot.sectionY;
    var direction = null;
    switch (Math.floor(Math.random() * 9)) {
        case 0: direction = 'up'; break;
        case 1: direction = 'up-right'; break;
        case 2: direction = 'right'; break;
        case 3: direction = 'down-right'; break;
        case 4: direction = 'down'; break;
        case 5: direction = 'down-left'; break;
        case 6: direction = 'left'; break;
        case 7: direction = 'up-left'; break;
        case 8: direction = null;
    }
    clientList[zone][bot.username].direction = direction;
}

function dummyUpdate(clientList, botNum) {
    var zone = dummy[botNum].sectionX + '_' + dummy[botNum].sectionY;
    var direction = null;
    switch (Math.floor(Math.random() * 9)) {
        case 0: direction = 'up'; break;
        case 1: direction = 'up-right'; break;
        case 2: direction = 'right'; break;
        case 3: direction = 'down-right'; break;
        case 4: direction = 'down'; break;
        case 5: direction = 'down-left'; break;
        case 6: direction = 'left'; break;
        case 7: direction = 'up-left'; break;
        case 8: direction = null;
    }
    clientList[zone][dummy[botNum].username].direction = direction;
}

module.exports = {
    add: addToClientList,
    addBoringBots: addBoringBots
};
