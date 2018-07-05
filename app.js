
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var session = require('express-session');

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
app.use(session({
    secret : 'keyboard cat',
    cookie : {maxAge : 1000* 60 * 60 * 24 * 7},
    resave : false,
    saveUninitialized : true
}));

// random Users
var rooms = [];
var connected = [];
var waitingQueue = [];
var users = [];


// college Arrays
var c_users = [];
var c_rooms = [];
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

        //<-------------------------- Disconnect College chat------------------------------------------->
        socket.broadcast.to(socket.room).emit('c_user disconnect');
        var c_online = c_users.indexOf(socket.id);
        if (c_online > -1) {
            c_users.splice(c_online, 1);
        }
        var c_roomss = c_rooms.find(x => x.id === socket.id);
        let c_roomsss = c_rooms.indexOf(c_roomss);
        if(c_roomsss > -1){
            c_rooms.splice(c_roomsss,1);
        }
        if(c_waitingQueue.length > 0){
            var c_waiting = c_waitingQueue.find(x => x.id === socket.id);
            let c_waitings = c_waitingQueue.indexOf(c_waiting);
            if(c_waitings > -1){
                c_waitingQueue.splice(c_waitings,1);
            }
        }
        if (socket.id == socket.randomRoom) {
            let indexx2 = c_connected.find(x => x.id === socket.id);
            let index2 = c_connected.indexOf(indexx2);
            if (index2 > -1) {
                c_connected.splice(index2, 1);
                let indexx3 = c_connected.find(x => x.id === socket.randomRoom);
                let index3 = c_connected.indexOf(indexx3);
                c_connected.splice(index3, 1);
                socket.leave(socket.room);
                socket.leave(socket.randomRoom);
                c_waitingQueue.push(indexx3);
                io.sockets.in(socket.room).emit('user status', {
                    msg: socket.username + ' is disconnected from this room',
                    user: 'SERVER'
                });
                io.sockets.in(socket.room).emit('disconnect_window', 'disconnect');
            }
        }
        else {
            let indexx2 = c_connected.find(x => x.id === socket.id);
            let index2 = c_connected.indexOf(indexx2);
            if (index2 > -1) {
                c_connected.splice(index2, 1);
                if(socket.room == socket.randomRoom){
                    var indexx3 = c_connected.find(x => x.id === socket.randomRoom);
                }
                else{
                    var room = io.sockets.adapter.rooms[socket.id];
                    match = Object.keys(room.sockets);
                    var indexx3 = c_connected.find(x => x.id === match[0]);
                }
                let index3 = c_connected.indexOf(indexx3);
                c_connected.splice(index3, 1);
                socket.leave(socket.room);
                socket.leave(socket.randomRoom);
                c_waitingQueue.push(indexx3);
                io.sockets.in(socket.room).emit('user status', {msg: socket.username + ' is disconnected from this room', user: 'SERVER'});
                io.sockets.in(socket.room).emit('disconnect_window', 'disconnect');
            }
        }

        //<-------------------------------Disconnect Random Chat ----------------------------------->

        socket.broadcast.to(socket.room).emit('user disconnect');

        var online = users.indexOf(socket.id);
        if (online > -1) {
            users.splice(online, 1);
        }

        var roomss = rooms.indexOf(socket.id);
        if (roomss > -1) {
            rooms.splice(roomss, 1);
        }
        var waiting = waitingQueue.indexOf(socket.id);
        if (waiting > -1) {
            waitingQueue.splice(waiting, 1);
        }
        if (socket.id == socket.randomRoom) {
            var index2 = connected.indexOf(socket.id);
            var index3 = connected.indexOf(socket.randomRoom);
            if (index2 > -1) {
                connected.splice(index2, 1);
                connected.splice(index3, 1);
                socket.leave(socket.room);
                socket.leave(socket.randomRoom);
                waitingQueue.push(socket.randomRoom);
                io.sockets.in(socket.room).emit('user status', {
                    msg: socket.username + ' is disconnected from this room',
                    user: 'SERVER'
                });
                io.sockets.in(socket.room).emit('disconnect_window', 'disconnect');
            }
        }
        else {
            var index2 = connected.indexOf(socket.id);
            var index3 = connected.indexOf(socket.randomRoom);
            if (index2 > -1) {
                connected.splice(index2, 1);
                connected.splice(index3, 1);
                socket.leave(socket.room);
                socket.leave(socket.randomRoom);
                waitingQueue.push(socket.id);
                io.sockets.in(socket.room).emit('user status', {msg: socket.username + ' is disconnected from this room', user: 'SERVER'});
                io.sockets.in(socket.room).emit('disconnect_window', 'disconnect');
            }
        }

    });

    //<---------------------------------------- For Random chat with Random user ------------------------------------>

    socket.on('new user', function (username, callback) {
        callback(true);
        socket.username = username;
        users.push(socket.id);
        rooms.push(socket.id);
        if (rooms.length == 1) {
            socket.room = socket.id;
            socket.join(socket.id);
            io.sockets.to(socket.id).emit('user status', {
                msg: 'You has connected to this room',
                user: 'SERVER'
            });
        }
        else {
            var random_room = random_number(rooms);
            socket.randomRoom = random_room;
            if (random_room == undefined) {
                random_room = random_number(rooms);
                socket.room = random_room;
                socket.join(random_room);
            }
            else {
                socket.room = random_room;
                socket.join(random_room);
            }
            var index1 = rooms.indexOf(socket.id);
            var index2 = rooms.indexOf(random_room);
            if (index1 > -1) {
                rooms.splice(index1, 1);
            }
            if (index2 > -1) {
                rooms.splice(index2, 1);
            }
            connected.push(socket.id);
            connected.push(random_room);
            io.sockets.to(random_room).emit('user status', {
                msg: 'You are connected with one stranger',
                user: 'SERVER'
            });
        }
    });

    socket.on('user disconnect',(data,callback)=>{
        callback(true);
        io.sockets.to(data).emit('user status', {msg: ' You have disconnect from room', user: 'SERVER'});
        socket.broadcast.to(socket.room).emit('user status', {msg: socket.username+' has disconnect from room', user: 'SERVER'});
        io.sockets.to(socket.room).emit('users online' , {length : users.length});
        var clients = io.sockets.adapter.rooms[socket.room];
        if(clients != undefined){
            if(clients.length == 1){
                var index2 = rooms.indexOf(data);
                rooms.splice(index2,1);
                socket.leave(data);
                waitingQueue.push(data);
            }
            for (var clientId in clients.sockets) {
                socket.leave(clientId);
                var index1 = connected.indexOf(clientId);
                connected.splice(index1,1);
                if(data != socket.room){
                    var index2 = connected.indexOf(data);
                    connected.splice(index2,1);
                    socket.leave(data);
                    waitingQueue.push(data);
                }
                waitingQueue.push(clientId);
            }
        }
        socket.broadcast.to(socket.room).emit('user disconnect');
    });

    socket.on('user reconnect',(data,callback)=>{
        callback(true);
        var index = waitingQueue.indexOf(data);
        if(index > -1){
            waitingQueue.splice(index,1);
        }
        rooms.push(data);
        if (rooms.length == 1) {
            socket.room = socket.id;
            socket.join(socket.id);
            io.sockets.to(socket.id).emit('user status', {
                msg: 'You has connected to this room',
                user: 'SERVER'
            });
        }
        else {
            var random_room = random_number(rooms);
            socket.randomRoom = random_room;
            if (random_room == undefined) {
                random_room = random_number(rooms);
                socket.room = random_room;
                socket.join(random_room);
            }
            else {
                socket.room = random_room;
                socket.join(random_room);
            }
            var index1 = rooms.indexOf(socket.id);
            if (index1 > -1) {
                rooms.splice(index1, 1);
            }
            var index2 = rooms.indexOf(random_room);
            if (index2 > -1) {
                rooms.splice(index2, 1);
            }
            connected.push(socket.id);
            connected.push(random_room);
            io.sockets.to(random_room).emit('user status', {
                msg: 'You are connected with one stranger',
                user: 'SERVER'
            });
        }
    });

    //<---------------------------------------- For Random College chat with College user ------------------------------------>

    socket.on('c_new user', function (form, callback) {
        callback(true);
        socket.username = form.username;
        socket.email = form.email;
        c_users.push(socket.id);
        c_rooms.push({
            id: socket.id,
            email: form.email
        });
        if (c_rooms.length == 1) {
            socket.room = socket.id;
            socket.join(socket.id);
            io.sockets.to(socket.id).emit('user status', {
                msg: 'You has connected to this room',
                user: 'SERVER'
            });
        }
        else {
            c_random_number(c_rooms, (random_room) => {
                if (random_room == socket.id) {
                    socket.room = socket.id;
                    socket.join(socket.id);
                    io.sockets.to(socket.id).emit('user status', {
                        msg: 'You has connected to this room',
                        user: 'SERVER'
                    });
                }
                else {
                    socket.randomRoom = random_room;
                    socket.room = random_room;
                    socket.join(random_room);
                    let obj1 = c_rooms.find(x => x.id === socket.id);
                    c_connected.push(obj1);
                    let index1 = c_rooms.indexOf(obj1);
                    if (index1 > -1) {
                        c_rooms.splice(index1, 1);
                    }
                    let obj2 = c_rooms.find(x => x.id === socket.room);
                    c_connected.push(obj2);
                    let index2 = c_rooms.indexOf(obj2);
                    if (index2 > -1) {
                        c_rooms.splice(index2, 1);
                    }
                    io.sockets.to(random_room).emit('user status', {
                        msg: 'You are connected with one stranger',
                        user: 'SERVER'
                    });
                }
            });
        }
    });

    socket.on('c_user disconnect',(data,callback)=>{
        callback(true);
        io.sockets.to(data).emit('user status', {msg: ' You have disconnect from room', user: 'SERVER'});
        socket.broadcast.to(socket.room).emit('user status', {msg: socket.username+' has disconnect from room', user: 'SERVER'});
        io.sockets.to(socket.room).emit('users online' , {c_length : c_users.length});
        var clients = io.sockets.adapter.rooms[socket.room];
        if(clients != undefined){
            if(clients.length == 1){
                let obj1 = c_rooms.find(x => x.id === socket.id);
                c_waitingQueue.push(obj1);
                let index1 = c_rooms.indexOf(obj1);
                c_rooms.splice(index1,1);
                socket.leave(data);
            }
            else{
                for (var clientId in clients.sockets) {
                    socket.leave(clientId);
                    let obj1 = c_connected.find(x => x.id === clientId);
                    let index1 = c_connected.indexOf(obj1);
                    c_connected.splice(index1, 1);
                    c_waitingQueue.push(obj1);
                    if (data != socket.room) {
                        let obj2 = c_connected.find(x => x.id === data);
                        c_waitingQueue.push(obj2);
                        var index2 = connected.indexOf(obj2);
                        c_connected.splice(index2, 1);
                        socket.leave(data);
                    }
                }
            }
        }
        socket.broadcast.to(socket.room).emit('c_user disconnect');
    });

    socket.on('c_user reconnect', function (data, callback) {
        callback(true);
        let obj22 = c_waitingQueue.find(x => x.id === data);
        c_waitingQueue.push(obj22);
        var index = c_waitingQueue.indexOf(obj22);
        if(index > -1){
            c_waitingQueue.splice(index,1);
        }
        c_rooms.push(obj22);
        if (c_rooms.length == 1) {
            socket.room = socket.id;
            socket.join(socket.id);
            io.sockets.to(socket.id).emit('user status', {
                msg: 'You has connected to this room',
                user: 'SERVER'
            });
        }
    else {
            c_random_number(c_rooms, (random_room) => {
                if (random_room == socket.id) {
                    socket.room = socket.id;
                    socket.join(socket.id);
                    io.sockets.to(socket.id).emit('user status', {
                        msg: 'You has connected to this room',
                        user: 'SERVER'
                    });
                }
                else {
                    socket.randomRoom = random_room;
                    socket.room = random_room;
                    socket.join(random_room);
                    let obj1 = c_rooms.find(x => x.id === socket.id);
                    c_connected.push(obj1);
                    let index1 = c_rooms.indexOf(obj1);
                    if (index1 > -1) {
                        c_rooms.splice(index1, 1);
                    }
                    let obj2 = c_rooms.find(x => x.id === socket.room);
                    c_connected.push(obj2);
                    let index2 = c_rooms.indexOf(obj2);
                    if (index2 > -1) {
                        c_rooms.splice(index2, 1);
                    }
                    io.sockets.to(random_room).emit('user status', {
                        msg: 'You are connected with one stranger',
                        user: 'SERVER'
                    });
                }
            });
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
        io.sockets.to(socket.room).emit('new message', {msg: data, user: socket.username});
    });

    socket.on('file submit', (msg)=> {
        var send = {
            username: socket.username,
            file: msg.file,
            fileName: msg.fileName
        };
        io.sockets.to(socket.room).emit('file submitted',send);
    });

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
                c_random_number(c_rooms, (data) => {
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

    function random_number(room) {
        var number = room[Math.floor(Math.random() * room.length)];
        if (number == socket.id) {
            number = random_number(rooms);
            return number;
        }
        else {
            return number;
        }
    }

});

//=============================Start server======================== //
http.listen(process.env.PORT || 3000);
console.log("server connected to 3000");

module.exports = app;

