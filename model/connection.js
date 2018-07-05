var mongoose  = require('mongoose');
var Schema = mongoose.Schema;

var Participant = new Schema({
    participants : [{ type: String , trim : true}]
});

module.exports = mongoose.model('participant',Participant);