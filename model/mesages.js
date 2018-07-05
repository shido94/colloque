var mongoose  = require('mongoose');
var Schema = mongoose.Schema;

var Message = new Schema({
    chatId: {type: String},
    sender_id: {type: String},
    //subject: {type: String},
    message: {
        sender_name : {type : String},
        message: {type: String},
        //messageId: {type: String},
        //author_id: {type: String},
        //attatchments: [x,y,z],
        //read: {type: String},
    }
},{
    timestamps: true
}
);

module.exports = mongoose.model('message',Message);