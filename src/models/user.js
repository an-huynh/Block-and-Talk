var Sequelize = require('sequelize');
var database = require(__dirname + '/database.js');

var user = database.define('user', {
    username: {
        type: Sequelize.STRING,
        unique: true
    },
    password : Sequelize.STRING,
    sectionX : Sequelize.INTEGER,
    sectionY : Sequelize.INTEGER,
    posX     : Sequelize.INTEGER,
    posY     : Sequelize.INTEGER,
    color    : Sequelize.STRING,
    shape    : Sequelize.STRING,
    admin    : Sequelize.BOOLEAN,
    banned   : Sequelize.BOOLEAN,
    stroke   : Sequelize.STRING
}, {
    instanceMethods : {
        asArray: function() {
            return {
                username : this.username,
                color    : this.color,
                shape    : this.shape,
                posX     : this.posX,
                posY     : this.posY,
                stroke   : this.stroke
            };
        }
    }
});

module.exports = user;
