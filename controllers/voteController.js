const { PrismaClient } = require('@prisma/client');
const { successResponse, errorResponse } = require('../utils/response');
const { broadcastVoteUpdate } = require('../services/socketService');

const prisma = new PrismaClient();

/**
 * Add a new vote
 * - Validates poll + poll option existence
 * - Prevents duplicate votes for the same option
 * - Broadcasts vote updates in real-time
 */
const addVote = async (req, res) => {
    try {
        const { pollId, pollOptionId } = req.body;
        const userId = req.user.id;

        // Basic validation
        if (!pollId || !pollOptionId) {
            return errorResponse(res, 'Poll ID and Poll Option ID are required', 400);
        }

        // Ensure poll exists
        const poll = await prisma.poll.findUnique({
            where: { id: pollId },
            include: { options: true }
        });

        if (!poll) {
            return errorResponse(res, 'Poll not found', 404);
        }

        // Only allow voting on published polls
        if (!poll.isPublished) {
            return errorResponse(res, 'Cannot vote on unpublished poll', 403);
        }

        // Ensure poll option belongs to this poll
        const pollOption = await prisma.pollOption.findFirst({
            where: { id: pollOptionId, pollId: pollId }
        });

        if (!pollOption) {
            return errorResponse(res, 'Invalid poll option for this poll', 400);
        }

        // Prevent user from voting for the same option more than once
        const existingVote = await prisma.vote.findUnique({
            where: {
                userId_pollOptionId: { userId, pollOptionId }
            }
        });

        if (existingVote) {
            return errorResponse(res, 'You have already voted for this option', 400);
        }

        // Create vote
        const vote = await prisma.vote.create({
            data: { userId, pollId, pollOptionId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                poll: { select: { id: true, question: true } },
                pollOption: { select: { id: true, text: true } }
            }
        });

        // Notify clients via WebSocket about updated results
        await broadcastVoteUpdate(pollId);

        return successResponse(res, vote, 'Vote added successfully', 201);
    } catch (error) {
        console.error('Add vote error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

/**
 * Update an existing vote
 * - Finds user’s vote for the given option
 * - Updates to a new poll option if valid
 */
const updateVote = async (req, res) => {
    try {
        const { pollId, pollOptionId } = req.body;
        const userId = req.user.id;

        if (!pollId || !pollOptionId) {
            return errorResponse(res, 'Poll ID and Poll Option ID are required', 400);
        }

        // Ensure vote exists
        const existingVote = await prisma.vote.findUnique({
            where: { userId_pollOptionId: { userId, pollOptionId } }
        });

        if (!existingVote) {
            return errorResponse(res, 'No vote found to update', 404);
        }

        // Ensure option belongs to this poll
        const pollOption = await prisma.pollOption.findFirst({
            where: { id: pollOptionId, pollId: pollId }
        });

        if (!pollOption) {
            return errorResponse(res, 'Invalid poll option for this poll', 400);
        }

        // Update vote
        const updatedVote = await prisma.vote.update({
            where: { userId_pollOptionId: { userId, pollOptionId } },
            data: { pollOptionId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                poll: { select: { id: true, question: true } },
                pollOption: { select: { id: true, text: true } }
            }
        });

        await broadcastVoteUpdate(pollId);

        return successResponse(res, updatedVote, 'Vote updated successfully');
    } catch (error) {
        console.error('Update vote error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

/**
 * Remove a user’s vote
 * - Ensures the vote exists before deletion
 * - Broadcasts updated poll results
 */
const removeVote = async (req, res) => {
    try {
        const { pollOptionId } = req.params;
        const userId = req.user.id;

        // Ensure vote exists
        const existingVote = await prisma.vote.findUnique({
            where: { userId_pollOptionId: { userId, pollOptionId } }
        });

        if (!existingVote) {
            return errorResponse(res, 'No vote found to remove', 404);
        }

        // Get poll ID for broadcasting updates later
        const poll = await prisma.pollOption.findUnique({
            where: { id: pollOptionId },
            select: { pollId: true }
        });

        // Delete vote
        await prisma.vote.delete({
            where: { userId_pollOptionId: { userId, pollOptionId } }
        });

        if (poll) {
            await broadcastVoteUpdate(poll.pollId);
        }

        return successResponse(res, null, 'Vote removed successfully');
    } catch (error) {
        console.error('Remove vote error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

/**
 * Get all votes by the current user
 * - Supports pagination
 */
const getUserVotes = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const userId = req.user.id;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [votes, totalCount] = await Promise.all([
            prisma.vote.findMany({
                where: { userId },
                include: {
                    poll: {
                        select: { id: true, question: true, isPublished: true, createdAt: true }
                    },
                    pollOption: { select: { id: true, text: true } }
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.vote.count({ where: { userId } })
        ]);

        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
        };

        return successResponse(res, { votes, pagination }, 'User votes retrieved successfully');
    } catch (error) {
        console.error('Get user votes error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

/**
 * Get all votes for a specific poll
 * - Supports pagination
 */
const getPollVotes = async (req, res) => {
    try {
        const { pollId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Ensure poll exists
        const poll = await prisma.poll.findUnique({ where: { id: pollId } });
        if (!poll) {
            return errorResponse(res, 'Poll not found', 404);
        }

        // Fetch votes with user + option details
        const [votes, totalCount] = await Promise.all([
            prisma.vote.findMany({
                where: { pollId },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    pollOption: { select: { id: true, text: true } }
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.vote.count({ where: { pollId } })
        ]);

        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
        };

        return successResponse(res, { votes, pagination }, 'Poll votes retrieved successfully');
    } catch (error) {
        console.error('Get poll votes error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

/**
 * Get the current user’s vote(s) for a specific poll
 */
const getUserVoteForPoll = async (req, res) => {
    try {
        const { pollId } = req.params;
        const userId = req.user.id;

        const votes = await prisma.vote.findMany({
            where: { userId, pollId },
            include: {
                pollOption: { select: { id: true, text: true } }
            }
        });

        return successResponse(res, votes, 'User votes for poll retrieved successfully');
    } catch (error) {
        console.error('Get user vote for poll error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

module.exports = {
    addVote,
    updateVote,
    removeVote,
    getUserVotes,
    getPollVotes,
    getUserVoteForPoll
};
