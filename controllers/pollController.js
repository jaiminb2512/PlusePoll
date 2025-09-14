const { PrismaClient } = require('@prisma/client');
const { successResponse, errorResponse } = require('../utils/response');

const prisma = new PrismaClient();

const createPoll = async (req, res) => {
    try {
        const { question, options, isPublished = false } = req.body;
        const authorId = req.user.id;

        if (!question || !options || !Array.isArray(options) || options.length < 2) {
            return errorResponse(res, 'Question and at least 2 options are required', 400);
        }

        for (const option of options) {
            if (!option.text || typeof option.text !== 'string' || option.text.trim().length === 0) {
                return errorResponse(res, 'All options must have valid text', 400);
            }
        }

        const poll = await prisma.$transaction(async (tx) => {
            const newPoll = await tx.poll.create({
                data: {
                    question: question.trim(),
                    isPublished,
                    authorId
                }
            });

            const pollOptions = await Promise.all(
                options.map(option =>
                    tx.pollOption.create({
                        data: {
                            text: option.text.trim(),
                            pollId: newPoll.id
                        }
                    })
                )
            );

            return {
                ...newPoll,
                options: pollOptions
            };
        });

        return successResponse(res, poll, 'Poll created successfully', 201);
    } catch (error) {
        console.error('Create poll error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

const getAllPolls = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            authorId,
            isPublished,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const whereClause = {};

        if (search) {
            whereClause.question = {
                contains: search,
                mode: 'insensitive'
            };
        }

        if (authorId) {
            whereClause.authorId = authorId;
        }

        if (isPublished !== undefined) {
            whereClause.isPublished = isPublished === 'true';
        }

        const allowedSortFields = ['createdAt', 'updatedAt', 'question'];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const orderBy = { [sortField]: sortOrder };

        const [polls, totalCount] = await Promise.all([
            prisma.poll.findMany({
                where: whereClause,
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
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
                },
                skip,
                take: parseInt(limit),
                orderBy
            }),
            prisma.poll.count({ where: whereClause })
        ]);

        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
        };

        return successResponse(res, { polls, pagination }, 'Polls retrieved successfully');
    } catch (error) {
        console.error('Get all polls error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

const getPollById = async (req, res) => {
    try {
        const { pollId } = req.params;

        const poll = await prisma.poll.findUnique({
            where: { id: pollId },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
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
            return errorResponse(res, 'Poll not found', 404);
        }

        return successResponse(res, poll, 'Poll retrieved successfully');
    } catch (error) {
        console.error('Get poll by ID error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

const updatePoll = async (req, res) => {
    try {
        const { pollId } = req.params;
        const { question, isPublished } = req.body;
        const userId = req.user.id;

        const existingPoll = await prisma.poll.findUnique({
            where: { id: pollId }
        });

        if (!existingPoll) {
            return errorResponse(res, 'Poll not found', 404);
        }

        if (existingPoll.authorId !== userId) {
            return errorResponse(res, 'You can only update your own polls', 403);
        }

        const updatedPoll = await prisma.poll.update({
            where: { id: pollId },
            data: {
                ...(question && { question: question.trim() }),
                ...(isPublished !== undefined && { isPublished })
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
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

        return successResponse(res, updatedPoll, 'Poll updated successfully');
    } catch (error) {
        console.error('Update poll error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

const deletePoll = async (req, res) => {
    try {
        const { pollId } = req.params;
        const userId = req.user.id;

        const existingPoll = await prisma.poll.findUnique({
            where: { id: pollId }
        });

        if (!existingPoll) {
            return errorResponse(res, 'Poll not found', 404);
        }

        if (existingPoll.authorId !== userId) {
            return errorResponse(res, 'You can only delete your own polls', 403);
        }

        await prisma.poll.delete({
            where: { id: pollId }
        });

        return successResponse(res, null, 'Poll deleted successfully');
    } catch (error) {
        console.error('Delete poll error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

const getMyPolls = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            isPublished,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const userId = req.user.id;

        const whereClause = { authorId: userId };

        if (isPublished !== undefined) {
            whereClause.isPublished = isPublished === 'true';
        }

        const allowedSortFields = ['createdAt', 'updatedAt', 'question'];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const orderBy = { [sortField]: sortOrder };

        const [polls, totalCount] = await Promise.all([
            prisma.poll.findMany({
                where: whereClause,
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
                },
                skip,
                take: parseInt(limit),
                orderBy
            }),
            prisma.poll.count({ where: whereClause })
        ]);

        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
        };

        return successResponse(res, { polls, pagination }, 'Your polls retrieved successfully');
    } catch (error) {
        console.error('Get my polls error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

const togglePollPublish = async (req, res) => {
    try {
        const { pollId } = req.params;
        const { isPublished } = req.body;
        const userId = req.user.id;

        const existingPoll = await prisma.poll.findUnique({
            where: { id: pollId }
        });

        if (!existingPoll) {
            return errorResponse(res, 'Poll not found', 404);
        }

        if (existingPoll.authorId !== userId) {
            return errorResponse(res, 'You can only modify your own polls', 403);
        }

        const updatedPoll = await prisma.poll.update({
            where: { id: pollId },
            data: { isPublished },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
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

        const message = isPublished ? 'Poll published successfully' : 'Poll unpublished successfully';
        return successResponse(res, updatedPoll, message);
    } catch (error) {
        console.error('Toggle poll publish error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

const getPollStats = async (req, res) => {
    try {
        const { pollId } = req.params;

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
            return errorResponse(res, 'Poll not found', 404);
        }

        const totalVotes = poll._count.votes;
        const optionsWithPercentages = poll.options.map(option => ({
            ...option,
            voteCount: option._count.votes,
            percentage: totalVotes > 0 ? Math.round((option._count.votes / totalVotes) * 100) : 0
        }));

        const stats = {
            pollId: poll.id,
            question: poll.question,
            totalVotes,
            options: optionsWithPercentages,
            createdAt: poll.createdAt,
            updatedAt: poll.updatedAt
        };

        return successResponse(res, stats, 'Poll statistics retrieved successfully');
    } catch (error) {
        console.error('Get poll stats error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

module.exports = {
    createPoll,
    getAllPolls,
    getPollById,
    updatePoll,
    deletePoll,
    getMyPolls,
    togglePollPublish,
    getPollStats
};
