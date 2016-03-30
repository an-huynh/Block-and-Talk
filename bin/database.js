var Sequelize = require('sequelize');

module.exports = {};

module.exports.sequelize = new Sequelize('database', 'username', 'password', {
    dialect: 'sqlite',
    storage: __dirname + '/../database/users.sqlite3'
});

module.exports.user = module.exports.sequelize.define('user', {
    username: {
        type: Sequelize.STRING,
        unique: true
    },
    posx  : Sequelize.INTEGER,
    posy  : Sequelize.INTEGER,
    color : Sequelize.STRING
});
