var Sequelize = require('sequelize');
var database = require(__dirname + '/database.js');

var friend = database.define('friend', {
    username : Sequelize.STRING,
    friend   : Sequelize.STRING,
});

module.exports = friend;