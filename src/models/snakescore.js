var Sequelize = require('sequelize');
var database = require(__dirname + '/database.js');

var snakescore = database.define('snakescore', {
    username: Sequelize.STRING,
    score   : Sequelize.INTEGER
}, {
    instanceMethods : {
        asArray: function() {
            return {
                username: this.username,
                score: this.score
            };
        }
    }
});

module.exports = snakescore;