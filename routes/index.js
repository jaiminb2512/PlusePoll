const express = require('express');
const { testConnection } = require('../db');
const { successResponse, healthResponse } = require('../utils/response');

const router = express.Router();

const userRoutes = require('./userRoutes');
const pollRoutes = require('./pollRoutes');

router.get('/', (req, res) => {
    return successResponse(res, { message: 'PulsePoll API is running' }, 'Welcome to PulsePoll API');
});

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

router.use('/users', userRoutes);
router.use('/polls', pollRoutes);

module.exports = router;