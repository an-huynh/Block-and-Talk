var Sequelize = require('sequelize');

var database = new Sequelize('database','username','password', {
    dialect: 'sqlite',
    loggin: false,
    storage: __dirname + '/../../database/users.sqlite3'
});

model.exports = database;