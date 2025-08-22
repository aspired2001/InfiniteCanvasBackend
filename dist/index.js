"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/index.ts
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const rooms = new Map();
const userColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8E8', '#F7DC6F'];
// Generate random room ID
const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};
// Get available color for user
const getAvailableColor = (room) => {
    const usedColors = Array.from(room.users.values()).map(user => user.color);
    return userColors.find(color => !usedColors.includes(color)) || userColors[0];
};
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('create_room', (username) => {
        let roomId = generateRoomId();
        while (rooms.has(roomId)) {
            roomId = generateRoomId();
        }
        const room = {
            id: roomId,
            users: new Map(),
            canvasState: [],
            lastUpdate: Date.now()
        };
        const user = {
            id: socket.id,
            name: username,
            color: getAvailableColor(room),
            cursor: null,
            isDrawing: false
        };
        room.users.set(socket.id, user);
        rooms.set(roomId, room);
        socket.join(roomId);
        socket.emit('room_created', { roomId, user });
        console.log(`Room ${roomId} created by ${username}`);
    });
    socket.on('join_room', ({ roomId, username }) => {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('room_error', 'Room not found');
            return;
        }
        if (room.users.size >= 10) {
            socket.emit('room_error', 'Room is full');
            return;
        }
        const user = {
            id: socket.id,
            name: username,
            color: getAvailableColor(room),
            cursor: null,
            isDrawing: false
        };
        room.users.set(socket.id, user);
        socket.join(roomId);
        // Send room state to new user
        socket.emit('room_joined', {
            roomId,
            user,
            users: Array.from(room.users.values()),
            canvasState: room.canvasState
        });
        // Notify other users
        socket.to(roomId).emit('user_joined', user);
        console.log(`${username} joined room ${roomId}`);
    });
    socket.on('canvas_update', (data) => {
        const room = rooms.get(data.roomId);
        if (!room)
            return;
        // FIXED: Always update canvas state for real-time collaboration
        room.canvasState = data.elements;
        room.lastUpdate = data.timestamp;
        console.log(`Canvas updated in room ${data.roomId}: ${data.elements.length} elements`);
        // Broadcast to other users in room immediately
        socket.to(data.roomId).emit('canvas_updated', {
            elements: data.elements,
            userId: socket.id,
            timestamp: data.timestamp
        });
    });
    socket.on('cursor_move', (data) => {
        const room = rooms.get(data.roomId);
        if (!room)
            return;
        const user = room.users.get(socket.id);
        if (user) {
            user.cursor = { x: data.x, y: data.y };
            // Broadcast cursor position immediately
            socket.to(data.roomId).emit('cursor_updated', {
                userId: socket.id,
                cursor: user.cursor,
                color: user.color,
                name: user.name,
                isDrawing: user.isDrawing
            });
        }
    });
    socket.on('drawing_start', (data) => {
        const room = rooms.get(data.roomId);
        if (!room)
            return;
        const user = room.users.get(socket.id);
        if (user) {
            user.isDrawing = true;
            socket.to(data.roomId).emit('user_drawing_start', {
                userId: socket.id,
                color: user.color,
                name: user.name
            });
        }
    });
    socket.on('drawing_end', (data) => {
        const room = rooms.get(data.roomId);
        if (!room)
            return;
        const user = room.users.get(socket.id);
        if (user) {
            user.isDrawing = false;
            socket.to(data.roomId).emit('user_drawing_end', {
                userId: socket.id
            });
        }
    });
    socket.on('request_sync', (roomId) => {
        const room = rooms.get(roomId);
        if (!room)
            return;
        socket.emit('sync_response', {
            canvasState: room.canvasState,
            timestamp: room.lastUpdate,
            users: Array.from(room.users.values())
        });
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Remove user from all rooms
        for (const [roomId, room] of rooms.entries()) {
            if (room.users.has(socket.id)) {
                const user = room.users.get(socket.id);
                room.users.delete(socket.id);
                if (room.users.size === 0) {
                    // Delete empty room
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} deleted`);
                }
                else {
                    // Notify other users
                    socket.to(roomId).emit('user_left', { userId: socket.id, name: user?.name });
                }
                break;
            }
        }
    });
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
