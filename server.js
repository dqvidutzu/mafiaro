const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = 3000;
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

const cardRoles = {
    queen: "queen (dama)",
    ace: "assassin",
    king: "police",
    joker: "doctor",
    "2ofhearts": "2ofhearts (cupidon)",
    civilian: "civilian"
};

const cardImages = {
    queen: "queenofhearts.png",
    ace: "aceofspades.png",
    king: "kingofclubs.png",
    joker: "joker.png",
    "2ofhearts": "2ofhearts.png",
    civilian: "fourofclubs.png"
};




io.on('connection', (socket) => {
    console.log('user connected:', socket.id);
    socket.on('createRoom', ({ maxPlayers }) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomCode] = {
        host: socket.id,
        players: [socket.id],
        maxPlayers,
    };
    socket.join(roomCode);
    console.log(`room created: ${roomCode}, max players: ${maxPlayers}`);
    socket.emit('roomCreated', { code: roomCode, hostId: socket.id });
});

    // Join Room
    socket.on('joinRoom', (roomCode) => {
        const normalizedRoomCode = roomCode.toUpperCase();
        const room = rooms[normalizedRoomCode];
        if (room) {
            if (room.players.length >= room.maxPlayers) {
                return socket.emit('error', 'room is full');
            }
            room.players.push(socket.id);
            socket.join(normalizedRoomCode);
            console.log(`user ${socket.id} joined room: ${normalizedRoomCode}`);
            io.to(normalizedRoomCode).emit('updatePlayers', { players: room.players, hostId: room.host });
            socket.emit('waitingForHost');
        } else {
            socket.emit('error', 'room does not exist');
        }
    });
    socket.on('startGame', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return socket.emit('error', 'room not found');
        if (socket.id !== room.host) return socket.emit('error', 'you are not host');

        const playerCount = room.players.length;
       const cards = playerCount > 10
    ? [
        { type: 'queen', count: 1 },
        { type: 'ace', count: 2 },
        { type: 'king', count: 2 },
        { type: 'joker', count: 1 },
        { type: '2ofhearts', count: 1 },
        { type: 'civilian', count: playerCount - 7 }
      ]
    : [
        { type: 'queen', count: 1 },
        { type: 'ace', count: 1 },
        { type: 'king', count: 1 },
        { type: 'joker', count: 1 },
        { type: '2ofhearts', count: 1 },
        { type: 'civilian', count: playerCount - 5 }
      ];



        const shuffledPlayers = [...room.players].sort(() => Math.random() - 0.5);
        const assignedCards = [];

        cards.forEach(card => {
            for (let i = 0; i < card.count; i++) {
                assignedCards.push(card.type);
            }
        });

        assignedCards.sort(() => Math.random() - 0.5);

        shuffledPlayers.forEach((id, index) => {
    const cardType = assignedCards[index];
    const role = cardRoles[cardType];
    const image = cardImages[cardType];
    io.to(id).emit('yourCard', { card: cardType, role, image });
});


        console.log(`game started in room ${roomCode}. cards assigned`);
    });
    socket.on('kickPlayer', ({ roomCode, playerId }) => {
        const room = rooms[roomCode];
        if (!room) return socket.emit('error', 'room not found');
        if (socket.id !== room.host) return socket.emit('error', 'must be host');

        room.players = room.players.filter((id) => id !== playerId);
        io.to(playerId).emit('kicked'); // Notify kicked player
        io.to(roomCode).emit('updatePlayers', { players: room.players, hostId: room.host });
    });
    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        for (const [roomCode, room] of Object.entries(rooms)) {
            room.players = room.players.filter((id) => id !== socket.id);
            if (room.players.length === 0) delete rooms[roomCode];
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
