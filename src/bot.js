var user = require(__dirname + '/models/user.js');
var bot;

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
                bot = entity;
                setInterval(directionUpdate, 1000, clientList);
            });
        }
    });
};

function updateBot(reference) {
    bot = reference;
}

function startBot(clientList) {
    setInterval(directionUpdate(clientList), 1000);
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

module.exports = {
    add: addToClientList,
};
