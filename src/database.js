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
    admin    : Sequelize.BOOLEAN
});

module.exports.snakeScore = module.exports.sequelize.define('snakeScore', {
    username: Sequelize.STRING,
    score   : Sequelize.INTEGER
});

module.exports.friend = module.exports.sequelize.define('friend', {
    username : Sequelize.STRING,
    friend   : Sequelize.STRING,
});