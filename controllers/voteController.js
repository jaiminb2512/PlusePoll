const { PrismaClient } = require('@prisma/client');
const { successResponse, errorResponse } = require('../utils/response');

const prisma = new PrismaClient();

const addVote = async (req, res) => {
    try {
        const { pollId, pollOptionId } = req.body;
        const userId = req.user.id;

        if (!pollId || !pollOptionId) {
            return errorResponse(res, 'Poll ID and Poll Option ID are required', 400);
        }

        const poll = await prisma.poll.findUnique({
            where: { id: pollId },
            include: {
                options: true
            }
        });

        if (!poll) {
            return errorResponse(res, 'Poll not found', 404);
        }

        if (!poll.isPublished) {
            return errorResponse(res, 'Cannot vote on unpublished poll', 403);
        }

        const pollOption = await prisma.pollOption.findFirst({
            where: {
                id: pollOptionId,
                pollId: pollId
            }
        });

        if (!pollOption) {
            return errorResponse(res, 'Invalid poll option for this poll', 400);
        }

        const vote = await prisma.vote.create({
            data: {
                userId: userId,
                pollId: pollId,
                pollOptionId: pollOptionId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                poll: {
                    select: {
                        id: true,
                        question: true
                    }
                },
                pollOption: {
                    select: {
                        id: true,
                        text: true
                    }
                }
            }
        });

        return successResponse(res, vote, 'Vote added successfully', 201);
    } catch (error) {
        console.error('Add vote error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

const updateVote = async (req, res) => {
    try {
        const { pollId, pollOptionId } = req.body;
        const userId = req.user.id;

        if (!pollId || !pollOptionId) {
            return errorResponse(res, 'Poll ID and Poll Option ID are required', 400);
        }

        const existingVote = await prisma.vote.findUnique({
            where: {
                userId_pollOptionId: {
                    userId: userId,
                    pollOptionId: pollOptionId
                }
            }
        });

        if (!existingVote) {
            return errorResponse(res, 'No vote found to update', 404);
        }

        const pollOption = await prisma.pollOption.findFirst({
            where: {
                id: pollOptionId,
                pollId: pollId
            }
        });

        if (!pollOption) {
            return errorResponse(res, 'Invalid poll option for this poll', 400);
        }

        const updatedVote = await prisma.vote.update({
            where: {
                userId_pollOptionId: {
                    userId: userId,
                    pollOptionId: pollOptionId
                }
            },
            data: {
                pollOptionId: pollOptionId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                poll: {
                    select: {
                        id: true,
                        question: true
                    }
                },
                pollOption: {
                    select: {
                        id: true,
                        text: true
                    }
                }
            }
        });

        return successResponse(res, updatedVote, 'Vote updated successfully');
    } catch (error) {
        console.error('Update vote error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

const removeVote = async (req, res) => {
    try {
        const { pollOptionId } = req.params;
        const userId = req.user.id;

        const existingVote = await prisma.vote.findUnique({
            where: {
                userId_pollOptionId: {
                    userId: userId,
                    pollOptionId: pollOptionId
                }
            }
        });

        if (!existingVote) {
            return errorResponse(res, 'No vote found to remove', 404);
        }

        await prisma.vote.delete({
            where: {
                userId_pollOptionId: {
                    userId: userId,
                    pollOptionId: pollOptionId
                }
            }
        });

        return successResponse(res, null, 'Vote removed successfully');
    } catch (error) {
        console.error('Remove vote error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

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
                        select: {
                            id: true,
                            question: true,
                            isPublished: true,
                            createdAt: true
                        }
                    },
                    pollOption: {
                        select: {
                            id: true,
                            text: true
                        }
                    }
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

const getPollVotes = async (req, res) => {
    try {
        const { pollId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const poll = await prisma.poll.findUnique({
            where: { id: pollId }
        });

        if (!poll) {
            return errorResponse(res, 'Poll not found', 404);
        }

        const [votes, totalCount] = await Promise.all([
            prisma.vote.findMany({
                where: { pollId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    pollOption: {
                        select: {
                            id: true,
                            text: true
                        }
                    }
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

const getUserVoteForPoll = async (req, res) => {
    try {
        const { pollId } = req.params;
        const userId = req.user.id;

        const votes = await prisma.vote.findMany({
            where: {
                userId: userId,
                pollId: pollId
            },
            include: {
                pollOption: {
                    select: {
                        id: true,
                        text: true
                    }
                }
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
