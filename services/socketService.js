const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('./jwtService');

const prisma = new PrismaClient();

let io; // Global Socket.IO instance

/**
 * Initialize Socket.IO server
 * - Attaches Socket.IO to HTTP server
 * - Secures with CORS + JWT authentication
 * - Handles join/leave poll rooms
 */
const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL, // frontend URL
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    /**
     * Middleware: Authenticate socket connection
     * - Expects JWT token via `auth.token` or `Authorization` header
     * - Validates user against database
     */
    io.use(async (socket, next) => {
        try {
            // Try to extract token from handshake auth or headers
            const token =
                socket.handshake.auth.token ||
                socket.handshake.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            // Verify token and fetch user
            const decoded = verifyToken(token);
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, name: true, email: true }
            });

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            // Attach user info to socket for later use
            socket.userId = user.id;
            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    /**
     * Connection event handlers
     */
    io.on('connection', (socket) => {
        console.log(`User ${socket.user.name} connected with socket ID: ${socket.id}`);

        // Join a poll room (for receiving live updates)
        socket.on('join-poll', (pollId) => {
            socket.join(`poll-${pollId}`);
            console.log(`User ${socket.user.name} joined poll room: poll-${pollId}`);
        });

        // Leave a poll room
        socket.on('leave-poll', (pollId) => {
            socket.leave(`poll-${pollId}`);
            console.log(`User ${socket.user.name} left poll room: poll-${pollId}`);
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`User ${socket.user.name} disconnected`);
        });
    });

    return io;
};

/**
 * Broadcast updated vote counts for a poll
 * - Fetches latest poll + option vote counts from DB
 * - Emits results to all clients in the poll room
 */
const broadcastVoteUpdate = async (pollId) => {
    if (!io) {
        console.error('Socket.IO not initialized');
        return;
    }

    try {
        // Get poll with vote counts
        const poll = await prisma.poll.findUnique({
            where: { id: pollId },
            include: {
                options: {
                    include: {
                        _count: { select: { votes: true } }
                    }
                },
                _count: { select: { votes: true } }
            }
        });

        if (!poll) {
            console.error(`Poll ${pollId} not found for broadcast`);
            return;
        }

        // Calculate total votes + percentages
        const totalVotes = poll._count.votes;
        const optionsWithCounts = poll.options.map(option => ({
            id: option.id,
            text: option.text,
            voteCount: option._count.votes,
            percentage:
                totalVotes > 0
                    ? Math.round((option._count.votes / totalVotes) * 100)
                    : 0
        }));

        // Build update payload
        const voteUpdate = {
            pollId: poll.id,
            question: poll.question,
            totalVotes,
            options: optionsWithCounts,
            timestamp: new Date().toISOString()
        };

        // Send update to all users in poll room
        io.to(`poll-${pollId}`).emit('vote-update', voteUpdate);
        console.log(
            `Broadcasted vote update for poll ${pollId} to ${io.sockets.adapter.rooms.get(`poll-${pollId}`)?.size || 0
            } clients`
        );
    } catch (error) {
        console.error('Error broadcasting vote update:', error);
    }
};

/**
 * Broadcast a generic poll update (e.g., published/unpublished/edited)
 */
const broadcastPollUpdate = async (pollId, updateType, data) => {
    if (!io) {
        console.error('Socket.IO not initialized');
        return;
    }

    try {
        const update = {
            pollId,
            updateType, // e.g., "published", "unpublished", "deleted"
            data,
            timestamp: new Date().toISOString()
        };

        io.to(`poll-${pollId}`).emit('poll-update', update);
        console.log(`Broadcasted ${updateType} update for poll ${pollId}`);
    } catch (error) {
        console.error('Error broadcasting poll update:', error);
    }
};

/**
 * Get total number of connected users (across all rooms)
 */
const getConnectedUsers = () => {
    if (!io) return 0;
    return io.sockets.sockets.size;
};

/**
 * Get number of users connected to a specific poll room
 */
const getPollRoomUsers = (pollId) => {
    if (!io) return 0;
    const room = io.sockets.adapter.rooms.get(`poll-${pollId}`);
    return room ? room.size : 0;
};

module.exports = {
    initializeSocket,
    broadcastVoteUpdate,
    broadcastPollUpdate,
    getConnectedUsers,
    getPollRoomUsers
};
