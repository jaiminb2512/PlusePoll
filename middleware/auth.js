const { verifyToken } = require('../services/jwtService');
const { PrismaClient } = require('@prisma/client');
const { errorResponse } = require('../utils/response');

const prisma = new PrismaClient();

const authenticateToken = async (req, res, next) => {
    try {
        let token = req.cookies?.accessToken || req.cookies?.token;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return errorResponse(res, 'Access token required', 401);
        }

        const decoded = verifyToken(token);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            return errorResponse(res, 'User not found', 401);
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return errorResponse(res, 'Invalid or expired token', 401);
    }
};

const optionalAuth = async (req, res, next) => {
    try {
        let token = req.cookies?.accessToken || req.cookies?.token;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (token) {
            const decoded = verifyToken(token);
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            if (user) {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        return errorResponse(res, 'Invalid or expired token', 401);
    }
};

const checkOwnership = (resourceUserIdField = 'authorId') => {
    return (req, res, next) => {
        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
        const currentUserId = req.user.id;

        if (resourceUserId !== currentUserId) {
            return errorResponse(res, 'Access denied. You can only access your own resources.', 403);
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    optionalAuth,
    checkOwnership
};
