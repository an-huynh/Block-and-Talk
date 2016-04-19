var Sequelize = require('sequelize');
var database = require(__dirname + '/database.js');

var ban = database.define('ban', {
    username: {
        type: Sequelize.STRING,
        unique : true
    }
});

module.exports = ban;