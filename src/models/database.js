var Sequelize = require('sequelize');

var database = new Sequelize('database','username','password', {
    dialect: 'sqlite',
    logging: false,
    storage: __dirname + '/../../database/users.sqlite3'
});

module.exports = database;
