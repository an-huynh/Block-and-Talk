var Sequelize = require('sequelize');

module.exports = {};

module.exports.sequelize = new Sequelize('database', 'username', 'password', {
    dialect: 'sqlite',
    logging: false,
    storage: __dirname + '/../database/users.sqlite3'
});

module.exports.user = module.exports.sequelize.define('user', {
    username: {
        type: Sequelize.STRING,
        unique: true
    },
    password : Sequelize.STRING,
    posx     : Sequelize.INTEGER,
    posy     : Sequelize.INTEGER,
    color    : Sequelize.STRING,
    shape    : Sequelize.STRING,
    admin    : Sequelize.BOOLEAN,
    banned   : Sequelize.BOOLEAN
}, {
    instanceMethods : {
        asArray : function() {
            return {
                username : this.username,
                color : this.color,
                shape : this.shape,
                posx  : this.posx,
                posy  : this.posy
            };
        }
    }
});

module.exports.snakeScore = module.exports.sequelize.define('snakeScore', {
    username: Sequelize.STRING,
    score   : Sequelize.INTEGER
});

module.exports.friend = module.exports.sequelize.define('friend', {
    username : Sequelize.STRING,
    friend   : Sequelize.STRING,
});

module.exports.ban = module.exports.sequelize.define('ban', {
    username : {
        type: Sequelize.STRING,
        unique : true
    }
});
