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
    posx     : Sequelize.INTEGER,
    posy     : Sequelize.INTEGER,
    color    : Sequelize.STRING,
    shape    : Sequelize.STRING,
    admin    : Sequelize.BOOLEAN,
    banned   : Sequelize.BOOLEAN
}, {
    instanceMethods : {
        asArray: function() {
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

module.exports = user;