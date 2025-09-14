const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { successResponse, errorResponse } = require('../utils/response');
const { generateTokens, verifyToken } = require('../services/jwtService');

const prisma = new PrismaClient();

// Register a new user
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return errorResponse(res, 'Name, email, and password are required', 400);
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return errorResponse(res, 'User with this email already exists', 409);
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return successResponse(res, user, 'User registered successfully', 201);
    } catch (error) {
        console.error('Register user error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

// Login user
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return errorResponse(res, 'Email and password are required', 400);
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return errorResponse(res, 'Invalid email or password', 401);
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return errorResponse(res, 'Invalid email or password', 401);
        }

        // Generate JWT tokens
        const tokens = generateTokens(user);

        // Set cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        };

        res.cookie('accessToken', tokens.accessToken, cookieOptions);
        res.cookie('refreshToken', tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        // Return user data (excluding password)
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        return successResponse(res, userData, 'Login successful');
    } catch (error) {
        console.error('Login user error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

// Get user profile
const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true,
                polls: {
                    select: {
                        id: true,
                        question: true,
                        isPublished: true,
                        createdAt: true,
                        _count: {
                            select: {
                                votes: true
                            }
                        }
                    }
                },
                votes: {
                    select: {
                        id: true,
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
                        },
                        createdAt: true
                    }
                }
            }
        });

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        return successResponse(res, user, 'User profile retrieved successfully');
    } catch (error) {
        console.error('Get user profile error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

// Update user profile
const updateUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return errorResponse(res, 'User not found', 404);
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== existingUser.email) {
            const emailExists = await prisma.user.findUnique({
                where: { email }
            });

            if (emailExists) {
                return errorResponse(res, 'Email already in use', 409);
            }
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name && { name }),
                ...(email && { email })
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return successResponse(res, updatedUser, 'User profile updated successfully');
    } catch (error) {
        console.error('Update user profile error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { userId } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return errorResponse(res, 'Current password and new password are required', 400);
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValidPassword) {
            return errorResponse(res, 'Current password is incorrect', 401);
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash }
        });

        return successResponse(res, null, 'Password changed successfully');
    } catch (error) {
        console.error('Change password error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

// Delete user account
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        // Delete user (cascade will handle related records)
        await prisma.user.delete({
            where: { id: userId }
        });

        return successResponse(res, null, 'User account deleted successfully');
    } catch (error) {
        console.error('Delete user error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};


// Logout user
const logoutUser = async (req, res) => {
    try {
        // Clear cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        return successResponse(res, null, 'Logout successful');
    } catch (error) {
        console.error('Logout user error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

// Refresh token
const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return errorResponse(res, 'Refresh token required', 401);
        }

        // Verify refresh token
        const decoded = verifyToken(refreshToken);

        // Get user from database
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

        // Generate new tokens
        const tokens = generateTokens(user);

        // Set new cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        };

        res.cookie('accessToken', tokens.accessToken, cookieOptions);
        res.cookie('refreshToken', tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        return successResponse(res, { user }, 'Token refreshed successfully');
    } catch (error) {
        console.error('Refresh token error:', error);
        return errorResponse(res, 'Invalid or expired refresh token', 401);
    }
};

// Get current user (from token)
const getCurrentUser = async (req, res) => {
    try {
        // User is already attached to req by auth middleware
        return successResponse(res, req.user, 'Current user retrieved successfully');
    } catch (error) {
        console.error('Get current user error:', error);
        return errorResponse(res, 'Internal server error', 500);
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshToken,
    getCurrentUser,
    getUserProfile,
    updateUserProfile,
    changePassword,
    deleteUser
};
