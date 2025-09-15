const { verifyToken } = require('../services/jwtService');
const { PrismaClient } = require('@prisma/client');
const { errorResponse } = require('../utils/response');

const prisma = new PrismaClient();

/**
 * Authentication middleware
 * - Ensures request has a valid JWT (from cookie or Authorization header).
 * - Looks up user in DB and attaches it to req.user.
 * - Rejects request if no token or invalid token.
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Try to read token from cookies first
        let token = req.cookies?.accessToken || req.cookies?.token;

        // If not in cookies, try Authorization header ("Bearer <token>")
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        // If no token found at all → reject request
        if (!token) {
            return errorResponse(res, 'Access token required', 401);
        }

        // Verify token validity and extract payload
        const decoded = verifyToken(token);

        // Fetch user from DB to ensure they still exist
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

        // Attach user object to request for later handlers
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return errorResponse(res, 'Invalid or expired token', 401);
    }
};

/**
 * Optional authentication middleware
 * - Similar to authenticateToken, but does not reject if no token.
 * - If token is present and valid → attaches user to req.user.
 * - If token is missing/invalid → continues without user.
 */
const optionalAuth = async (req, res, next) => {
    try {
        let token = req.cookies?.accessToken || req.cookies?.token;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        // If token exists, try to verify and attach user
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

        // Always continue, even if no token
        next();
    } catch (error) {
        return errorResponse(res, 'Invalid or expired token', 401);
    }
};

/**
 * Ownership check middleware factory
 * - Ensures the logged-in user owns the resource they are trying to modify.
 * - Default checks against `authorId`, but can be customized by passing a field.
 *
 * Example:
 *   app.put('/polls/:authorId', authenticateToken, checkOwnership('authorId'), ...)
 */
const checkOwnership = (resourceUserIdField = 'authorId') => {
    return (req, res, next) => {
        // Get the resource owner ID either from params or body
        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
        const currentUserId = req.user.id;

        // Deny if the resource does not belong to current user
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
