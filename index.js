'use strict';

console.log('----------------Servidor Orquestra---------------');

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');
var cors = require('cors');
var ipaddr = 'localhost';

var roomList = [];
var clientsList = [];
var numClients;

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8080,ipaddr);

var express = require('express')
var app2 = express()
app2.listen(3000,ipaddr, function () {
  console.log('INFO: Arquivos disponibilizados através da porta: 3000!');
})
app2.use(express.static('public'),cors)

var io = socketIO.listen(app);

io.sockets.on('connection', function(socket) {

    socket.on('message', function(data) {

        var message = data.payload;
        var roomID = data.roomID;

        console.log('Message RoomID: ' + roomID);

        var room = foundRoom(roomID);

        if(socket === room.getClientsList()[0]){
            console.log('INFO: Messagem Iniciador -> Peer');
            // Se eu sou o iniciador, eu estou enviando mensagens com o ultimo peer;
            room.getClientsList()[room.getNumClients() - 1].emit('message',message);            
        }else{
            console.log('INFO: Mensagem Peer -> Iniciador');
            // Se eu sou o peer, eu estou enviado mensagens com o iniciador;
            room.getClientsList()[0].emit('message',message);            
        }

    });

    socket.on('create or join', function(roomID) {

        var room = foundRoom(roomID);

        if(room !== null){
            console.log('INFO: Esta sala já foi criada!');
            room.clientsListPush(socket);
            room.nClientsIncrement();
        }else{
            console.log('INFO: Criando a sala: ' + roomID);
            room = new Room(roomID);
            roomList.push(room);
            room.clientsListPush(socket);
            room.nClientsIncrement();
        }

        //clientsList.push(socket);   
        //numClients = io.sockets.sockets.length;
    
        console.log('INFO: Sala ' + room.getRoomID() + ' possui agora ' + room.getNumClients() + ' cliente(s)');

        if (room.getNumClients() === 1) {
            room.getClientsList()[0].join(room.getRoomID());
            room.getClientsList()[0].emit('created', roomID, room.getClientsList()[0].id);
        }else if(room.getNumClients() <= 5) {
            room.getClientsList()[room.getNumClients() - 1].join(room.getRoomID());
            console.log('INFO: Cliente ' + socket.id + ' entrou na sala: ' + room.getRoomID());
            room.getClientsList()[room.getNumClients() - 1].emit('joined', room.getRoomID(), socket.id);
            room.getClientsList()[0].emit('ready', roomID); 
        } else { 
            room.getClientsList()[room.getNumClients() - 1].emit('full', room.getRoomID());
        }
    });

    socket.on('ipaddr', function() {
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
            ifaces[dev].forEach(function(details) {
                if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
                    socket.emit('ipaddr', details.address);
                }
            });
        }
    });

    socket.on('bye', function(){
        console.log('received bye');
    });

});


var Room = function(id){

    this.id = id;
    this.clientsList = [];
    this.nClients = 0;

    this.getRoomID = function(){
        return this.id;
    }

    this.getClientsList = function(){
        return this.clientsList;
    }

    this.getNumClients = function(){
        return this.nClients;
    }
 
    this.clientsListPush = function(client){
        this.clientsList.push(client);
    }

    this.nClientsIncrement = function(){
       this.nClients++;
    }
};

function foundRoom(roomID){

    if(roomList.length > 0){
        for(var i = 0; i < roomList.length; i++){
            if(roomList[i].getRoomID() === roomID){
                return roomList[i];
            }
        }
    }    
    return null;
}

