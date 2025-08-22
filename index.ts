// server/index.ts
import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

interface User {
    id: string;
    name: string;
    color: string;
    cursor: { x: number; y: number } | null;
    isDrawing: boolean;
}

interface Room {
    id: string;
    users: Map<string, User>;
    canvasState: any[];
    lastUpdate: number;
}

const rooms = new Map<string, Room>();
const userColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8E8', '#F7DC6F'];

// Generate random room ID
const generateRoomId = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Get available color for user
const getAvailableColor = (room: Room): string => {
    const usedColors = Array.from(room.users.values()).map(user => user.color);
    return userColors.find(color => !usedColors.includes(color)) || userColors[0];
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', (username: string) => {
        let roomId = generateRoomId();
        while (rooms.has(roomId)) {
            roomId = generateRoomId();
        }

        const room: Room = {
            id: roomId,
            users: new Map(),
            canvasState: [],
            lastUpdate: Date.now()
        };

        const user: User = {
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

    socket.on('join_room', ({ roomId, username }: { roomId: string, username: string }) => {
        const room = rooms.get(roomId);

        if (!room) {
            socket.emit('room_error', 'Room not found');
            return;
        }

        if (room.users.size >= 10) {
            socket.emit('room_error', 'Room is full');
            return;
        }

        const user: User = {
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

    socket.on('canvas_update', (data: { roomId: string, elements: any[], timestamp: number }) => {
        const room = rooms.get(data.roomId);
        if (!room) return;

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

    socket.on('cursor_move', (data: { roomId: string, x: number, y: number }) => {
        const room = rooms.get(data.roomId);
        if (!room) return;

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

    socket.on('drawing_start', (data: { roomId: string }) => {
        const room = rooms.get(data.roomId);
        if (!room) return;

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

    socket.on('drawing_end', (data: { roomId: string }) => {
        const room = rooms.get(data.roomId);
        if (!room) return;

        const user = room.users.get(socket.id);
        if (user) {
            user.isDrawing = false;
            socket.to(data.roomId).emit('user_drawing_end', {
                userId: socket.id
            });
        }
    });

    socket.on('request_sync', (roomId: string) => {
        const room = rooms.get(roomId);
        if (!room) return;

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
                } else {
                    // Notify other users
                    socket.to(roomId).emit('user_left', { userId: socket.id, name: user?.name });
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3001;

// Ensure PORT is a number
const portNumber = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

server.listen(portNumber, '0.0.0.0', () => {
    console.log(`Server running on port ${portNumber}`);
});

export default app;