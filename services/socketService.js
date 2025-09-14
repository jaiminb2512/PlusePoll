const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('./jwtService');

const prisma = new PrismaClient();

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = verifyToken(token);
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, name: true, email: true }
            });

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.userId = user.id;
            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User ${socket.user.name} connected with socket ID: ${socket.id}`);

        socket.on('join-poll', (pollId) => {
            socket.join(`poll-${pollId}`);
            console.log(`User ${socket.user.name} joined poll room: poll-${pollId}`);
        });

        socket.on('leave-poll', (pollId) => {
            socket.leave(`poll-${pollId}`);
            console.log(`User ${socket.user.name} left poll room: poll-${pollId}`);
        });

        socket.on('disconnect', () => {
            console.log(`User ${socket.user.name} disconnected`);
        });
    });

    return io;
};

const broadcastVoteUpdate = async (pollId) => {
    if (!io) {
        console.error('Socket.IO not initialized');
        return;
    }

    try {
        const poll = await prisma.poll.findUnique({
            where: { id: pollId },
            include: {
                options: {
                    include: {
                        _count: {
                            select: {
                                votes: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        votes: true
                    }
                }
            }
        });

        if (!poll) {
            console.error(`Poll ${pollId} not found for broadcast`);
            return;
        }

        const totalVotes = poll._count.votes;
        const optionsWithCounts = poll.options.map(option => ({
            id: option.id,
            text: option.text,
            voteCount: option._count.votes,
            percentage: totalVotes > 0 ? Math.round((option._count.votes / totalVotes) * 100) : 0
        }));

        const voteUpdate = {
            pollId: poll.id,
            question: poll.question,
            totalVotes,
            options: optionsWithCounts,
            timestamp: new Date().toISOString()
        };

        io.to(`poll-${pollId}`).emit('vote-update', voteUpdate);
        console.log(`Broadcasted vote update for poll ${pollId} to ${io.sockets.adapter.rooms.get(`poll-${pollId}`)?.size || 0} clients`);
    } catch (error) {
        console.error('Error broadcasting vote update:', error);
    }
};

const broadcastPollUpdate = async (pollId, updateType, data) => {
    if (!io) {
        console.error('Socket.IO not initialized');
        return;
    }

    try {
        const update = {
            pollId,
            updateType,
            data,
            timestamp: new Date().toISOString()
        };

        io.to(`poll-${pollId}`).emit('poll-update', update);
        console.log(`Broadcasted ${updateType} update for poll ${pollId}`);
    } catch (error) {
        console.error('Error broadcasting poll update:', error);
    }
};

const getConnectedUsers = () => {
    if (!io) return 0;
    return io.sockets.sockets.size;
};

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
