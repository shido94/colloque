
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var compress_images = require('compress-images');
var fs = require("fs");


// var session = require('express-session');

var app = express();

// to hide X-Powered-By for Security,Save Bandwidth in ExpressJS(node.js)
app.disable('x-powered-by');

var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// if saveUninitialized : false than it will store session till the instance is in existence
// secret is hashing secret
// secret should be that much complex that one couldnt guess it easily

// app.use(session({
//     secret : 'keyboard cat',
//     cookie : {maxAge : 1000* 60 * 60 * 24 * 7},
//     resave : false,
//     saveUninitialized : true
// }));

// random Users
var roomsArray = [];
var connected = [];
var waitingQueue = [];
var users = [];


// college Arrays
var c_users = [];
var c_roomsArray = [];
var c_connected = [];
var c_waitingQueue = [];

app.get('/', (req, res) => {
    res.render('main');
});

app.get('/col_signup', (req, res) => {
    res.render('c_register');
});

app.get('/ran_signup', (req, res) => {
    res.render('r_register');
});


io.on("connection",(socket)=> {

    socket.on('disconnect', function () {


        socket.broadcast.to(socket.room).emit
        ('user status', {
            msg: socket.username + ' has disconnect from room',
            user: 'SERVER'
        });
        //<-------------------------- Disconnect College chat------------------------------------------->
        socket.broadcast.to(socket.room).emit('c_user disconnect');
        let c_onlineUsers = c_users.indexOf(socket.id);
        if (c_onlineUsers > -1) {
            c_users.splice(c_onlineUsers, 1);
        }

        let c_RoomsId = c_roomsArray.find(x => x.id === socket.id);
        let c_roomsUser = c_roomsArray.indexOf(c_RoomsId);
        if(c_roomsUser > -1){
            c_roomsArray.splice(c_roomsUser,1);
        }
        if(c_waitingQueue.length > 0){
            let waiting = c_waitingQueue.find(x => x.id === socket.id);
            let c_waitingUser = c_waitingQueue.indexOf(waiting);
            if(c_waitingUser > -1){
                c_waitingQueue.splice(c_waitingUser,1);
            }
        }

        let checkCollegeConnected = c_connected.indexOf(socket.id);
        if (socket.id !== socket.room && checkCollegeConnected > -1) {
            let userIndex = c_connected.indexOf(socket.id);
            if (userIndex > -1) {
                c_connected.splice(userIndex, 1);
                let secondUserIndex = c_connected.indexOf(socket.room);
                c_connected.splice(secondUserIndex, 1);
                c_waitingQueue.push(socket.room);
                socket.leave(socket.id, (err) => {
                    if(!err){
                        socket.leave(socket.room, (err) => {
                            if(!err) {
                                io.sockets.in(socket.room).emit('disconnect_window', 'disconnect');
                            }
                        });
                    }
                });
            }
        }
        if (socket.id === socket.room && checkCollegeConnected > -1) {
            let idIndex = c_connected.indexOf(socket.id);
            let other = io.sockets.adapter.rooms[socket.id];
            let match = Object.keys(other.sockets);
            let otherIndex = c_connected.indexOf(match[0]);
            c_waitingQueue.push({
                id: match[0],
                email: socket.email
            });

            socket.leave(socket.id, (err) => {
                if(!err) {
                    c_connected.splice(idIndex,1);
                }
            });

            socket.leave(match[0], (err) => {
                if(!err) {
                    c_connected.splice(otherIndex,1);
                }
            });

            io.sockets.in(socket.randomRoom).emit('user status', {msg: socket.username + ' is disconnected from this room', user: 'SERVER'});
            io.sockets.in(socket.randomRoom).emit('disconnect_window', 'disconnect');
        }


        //<-------------------------------Disconnect Random Chat ----------------------------------->

        socket.broadcast.to(socket.room).emit('user disconnect');

        let online = users.indexOf(socket.id);
        if (online > -1) {
            users.splice(online, 1);
        }

        let roomsArrays = roomsArray.indexOf(socket.id);
        if (roomsArrays > -1) {
            roomsArray.splice(roomsArrays, 1);
        }
        let waiting = waitingQueue.indexOf(socket.id);
        if (waiting > -1) {
            waitingQueue.splice(waiting, 1);
        }
        let checkConnected = connected.indexOf(socket.id);

        if(socket.id !== socket.room && checkConnected > -1) {
            let idIndex = connected.indexOf(socket.id);
            connected.splice(idIndex,1);

            waitingQueue.push(socket.room);

            let otherIndex = c_connected.indexOf(socket.room);

            socket.leave(socket.id, (err) => {
                if (!err) {
                    socket.leave(socket.room, (err) => {
                        if(!err) {
                            connected.splice(otherIndex,1);
                        }
                    })
                }
            })
        }

        if(socket.id === socket.room && checkConnected > -1) {
            let idIndex = connected.indexOf(socket.id);
            let other = io.sockets.adapter.rooms[socket.id];
            let match = Object.keys(other.sockets);
            let otherIndex = c_connected.indexOf(match[0]);
            waitingQueue.push(match[0]);


            socket.leave(socket.id, (err) => {
                if(!err) {
                    c_connected.splice(idIndex,1);
                }
            });

            socket.leave(match[0], (err) => {
                if(!err) {
                    c_connected.splice(otherIndex,1);
                }
            });

            io.sockets.in(socket.randomRoom).emit('user status', {msg: socket.username + ' is disconnected from this room', user: 'SERVER'});
            io.sockets.in(socket.randomRoom).emit('disconnect_window', 'disconnect');

        }

    });

    //<---------------------------------------- For Random chat with Random user ------------------------------------>

    socket.on('new user', function (username, callback) {
        if(username === ''){
            callback(false);
        }
        else {
            callback(true);
            socket.username = username;
            users.push(socket.id);
            roomsArray.push(socket.id);

            onRandomConnect(roomsArray.length);

        }
    });

    socket.on('user disconnect',(data,callback)=>{
        callback(true);
        io.sockets.to(data).emit('user status', {msg: ' You have disconnect from room', user: 'SERVER'});
        socket.broadcast.to(socket.randomRoom).emit('user status', {msg: socket.username+' has disconnect from room', user: 'SERVER'});
        io.sockets.to(socket.randomRoom).emit('users online' , {length : users.length});

        socket.broadcast.to(socket.room).emit('user disconnect');

        let ids = io.sockets.adapter.rooms[socket.room];
        if(ids.length > 0) {
            let clients = Object.keys(ids.sockets);
            if (clients.length === 1 ) {
                let user = roomsArray.indexOf(socket.id);
                waitingQueue.push(data);
                socket.leave(socket.id, function (err) {
                    if(!err){
                        roomsArray.splice(user,1);
                    }
                });
            }
            if (clients.length === 2 ) {
                let firstUserId = clients[0];
                let secondUserId = clients[1];
                waitingQueue.push(firstUserId, secondUserId);
                socket.leave(firstUserId, function (err) {
                    if(!err){
                        let user1 = connected.indexOf(firstUserId);
                        connected.splice(user1,1);
                    }
                });
                socket.leave(secondUserId, function (err) {
                    if(!err){
                        let user2 = connected.indexOf(secondUserId);
                        connected.splice(user2,1);
                    }
                });
            }
        }
    });

    socket.on('user reconnect',(data,callback)=>{
        callback(true);
        roomsArray.push(data);
        let userIndex = waitingQueue.indexOf(data);
        if(userIndex > -1){
            waitingQueue.splice(userIndex,1);
        }
        onRandomConnect(roomsArray.length);

    });

    //<---------------------------------------- For Random College chat with College user ------------------------------------>

    socket.on('c_new user', function (form, callback) {
        socket.username = form.username;
        socket.email = form.email;

        if(!socket.username || !socket.email){
            callback(false);
        }
        else{
            callback(true);
            c_users.push(socket.id);
            c_roomsArray.push({
                id: socket.id,
                email: form.email
            });

            onCollegeConnect(c_roomsArray.length);

        }
    });

    socket.on('c_user disconnect',(data,callback)=>{
        callback(true);
        io.sockets.to(data).emit('user status', {msg: ' You disconnect yourself from room', user: 'SERVER'});
        socket.broadcast.to(socket.randomRoom).emit('user status', {msg: socket.username+' has disconnected from room', user: 'SERVER'});
        io.sockets.to(socket.randomRoom).emit('users online' , {c_length : c_users.length});
        let ids = io.sockets.adapter.rooms[socket.randomRoom];
        let clients = Object.keys(ids.sockets);

        socket.broadcast.to(socket.randomRoom).emit('c_user disconnect');

        if(clients.length === 1) {
            c_waitingQueue.push({
                id: socket.id,
                email: socket.email
            });
            socket.leave(socket.id, function (err) {
                if(!err){
                    let User = c_roomsArray.find(x => x.id === data);
                    let user = c_roomsArray.indexOf(User);
                    c_roomsArray.splice(user,1);
                }
            });
        }
        if(clients.length === 2) {
            let firstUserId = clients[0];
            let secondUserId =  clients[1];

            c_waitingQueue.push({
                id: firstUserId,
                email: socket.email
            });
            c_waitingQueue.push({
                id: secondUserId,
                email: socket.email
            });
            socket.leave(firstUserId, function (err) {
                if(!err){
                    let user1 = c_connected.indexOf(firstUserId);
                    c_connected.splice(user1,1);
                }
            });
            socket.leave(secondUserId, function (err) {
                if(!err){
                    let user2 = c_connected.indexOf(secondUserId);
                    c_connected.splice(user2,1);
                }
            });
        }
    });

    socket.on('c_user reconnect', function (data, callback) {
        callback(true);

        let user = c_waitingQueue.find(x => x.id === data);
        let userId = c_waitingQueue.indexOf(user);
        if(userId > -1){
            c_waitingQueue.splice(userId,1);

            c_roomsArray.push({
                id: data,
                email: socket.email
            });
            onCollegeConnect(c_roomsArray.length);

        }
    });

    //<------------------------- Common for both ---------------------------->

    socket.on('typing', function (data) {
        if(data == false){
            socket.broadcast.to(socket.room).emit('typing');
        }
        else{
            socket.broadcast.to(socket.room).emit('typing', socket.username+ ' is '+ data);
        }
    });

    //send message
    socket.on('send message', function (data) {
        io.sockets.to(socket.randomRoom).emit('new message', {msg: data.message, user: socket.username, sender: data.sender});
    });

    socket.on('file submit', (msg)=> {
        console.log(msg);


        let send = {
            username: socket.username,
            file: msg.message.file,
            fileName: msg.message.fileName,
            sender: msg.sender
        };

        let size = MyFun(msg.message.fileName);

        io.sockets.to(socket.randomRoom).emit('file submitted',send);
    });


    function MyFun(){
        compress_images('src/img/**/*.{jpg,JPG,jpeg,JPEG,png,svg,gif}', 'build/img/', {compress_force: false, statistic: true, autoupdate: true}, false,
            {jpg: {engine: 'mozjpeg', command: ['-quality', '60']}},
            {png: {engine: 'pngquant', command: ['--quality=20-50']}},
            {svg: {engine: 'svgo', command: '--multipass'}},
            {gif: {engine: 'gifsicle', command: ['--colors', '64', '--use-col=web']}}, function(){
            });
    }

    function onRandomConnect(length) {
        if (length === 1) {
            socket.randomRoom = socket.id;
            socket.room = socket.id;
            socket.join(socket.id);
            io.sockets.to(socket.id).emit('user status', {
                msg: 'Please wait while we connect you',
                user: 'SERVER'
            });
        }
        if (length === 2) {
            random_number(roomsArray, (random_room) => {
                socket.randomRoom = random_room;
                socket.room = random_room;
                socket.join(random_room);
                let roomArray = io.sockets.adapter.rooms[random_room];
                let usersId = Object.keys(roomArray.sockets);
                let firstUserId = usersId[0];
                let secondUserId = usersId[1];
                connected.push(firstUserId,secondUserId);
                let user1 = roomsArray.indexOf(firstUserId);
                if (user1 > -1) {
                    roomsArray.splice(user1, 1);
                }
                let user2 = roomsArray.indexOf(secondUserId);
                if (user2 > -1) {
                    roomsArray.splice(user2, 1);
                }
                io.sockets.to(random_room).emit('user status', {
                    msg: 'You are connected with one stranger',
                    user: 'SERVER'
                });
            });
        }
        if(length > 2) {
            socket.join(socket.id);
            io.sockets.to(socket.id).emit('user status', {
                msg: 'Please wait while we connect you',
                user: 'SERVER'
            });
        }
    }

    function onCollegeConnect(length) {
        if (length === 1) {
            socket.randomRoom = socket.id;
            socket.room = socket.id;
            socket.join(socket.id);
            io.sockets.to(socket.room).emit('user status', {
                msg: 'Please wait while we connect you',
                user: 'SERVER'
            });
        }
        if(length === 2) {
            c_random_number(c_roomsArray, (random_room) => {
                if (random_room === socket.id) {
                    socket.room = random_room;
                    socket.join(socket.room);
                    io.sockets.to(socket.room).emit('user status', {
                        msg: 'Please wait while we connect you',
                        user: 'SERVER'
                    });
                }
                else {
                    socket.join(random_room);
                    socket.randomRoom = random_room;

                    let roomArray = io.sockets.adapter.rooms[random_room];
                    let usersId = Object.keys(roomArray.sockets);
                    let firstUserId = usersId[0];
                    let secondUserId = usersId[1];

                    c_connected.push(firstUserId, secondUserId);
                    let User1 = c_roomsArray.find(x => x.id ===firstUserId);
                    let user1 = c_roomsArray.indexOf(User1);
                    if (user1 > -1) {
                        c_roomsArray.splice(user1, 1);
                    }

                    let User2 = c_roomsArray.find(x => x.id === secondUserId);
                    let user2 = c_roomsArray.indexOf(User2);
                    if (user2 > -1) {
                        c_roomsArray.splice(user2, 1);
                    }
                    io.sockets.to(random_room).emit('user status', {
                        msg: 'You are connected with one stranger',
                        user: 'SERVER'
                    });
                }
            });
        }
        if (length > 2) {
            socket.join(socket.id);
            io.sockets.to(socket.id).emit('user status', {
                msg: 'Please wait while we connect you',
                user: 'SERVER'
            });
        }
    }

    function c_random_number(room,callback) {
        var same_coll = [];
        room.forEach(each_room => {
            let socket_email = socket.email.split('@');
            let room_chars = each_room.email.split('@');
            if (socket_email[1] == room_chars[1]) {
                same_coll.push(each_room.id);
            }
        });
        var number = same_coll[Math.floor(Math.random() * same_coll.length)];
        if (same_coll.length > 1) {
            if (number == socket.id) {
                c_random_number(c_roomsArray, (data) => {
                    callback(data);
                });
            }
            else {
                callback(number);
            }
        }
        else {
            callback(socket.id);
        }
    }

    function random_number(room, callback) {
        var number = room[Math.floor(Math.random() * room.length)];
        if (number == socket.id) {
            random_number(roomsArray, (number) => {
                callback(number)
            });
        }
        else {
            callback(number);
        }
    }

});

//=============================Start server======================== //
http.listen(process.env.PORT || 3000);
console.log("server connected to 3000");

module.exports = app;

