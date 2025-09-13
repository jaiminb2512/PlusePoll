const express = require('express');
const { testConnection } = require('../db');
const { successResponse, healthResponse } = require('../utils/response');

const router = express.Router();

// Import route modules
const userRoutes = require('./userRoutes');

// Root endpoint
router.get('/', (req, res) => {
    return successResponse(res, { message: 'PulsePoll API is running' }, 'Welcome to PulsePoll API');
});

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const isConnected = await testConnection();
        const healthData = {
            status: 'OK',
            database: isConnected ? 'Connected and API is Running..' : 'Disconnected',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
        };

        return healthResponse(res, healthData, isConnected);
    } catch (error) {
        const healthData = {
            status: 'Error',
            database: 'Error',
            error: error.message,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
        };

        return healthResponse(res, healthData, false);
    }
});

// Mount route modules
router.use('/users', userRoutes);

// TODO: Add more route modules here as you create them
// router.use('/polls', pollRoutes);
// router.use('/votes', voteRoutes);

module.exports = router;
