const express = require('express');
const { testConnection, closePool } = require('./db');
const { successResponse, healthResponse, errorResponse } = require('./utils/response');

const app = express();

// Middleware
app.use(express.json());

// Test database connection on startup
const initializeDatabase = async () => {
    const isConnected = await testConnection();
    if (!isConnected) {
        console.log('⚠️  Server starting without database connection');
    }
};

// Start server
const PORT = 5000;

// Root endpoint
app.get('/', (req, res) => {
    return successResponse(res, { message: 'PulsePoll API is running' }, 'Welcome to PulsePoll API');
});

app.get('/health', async (req, res) => {
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

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    await closePool();
    process.exit(0);
});

app.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);

    // Initialize database connection
    await initializeDatabase();
});
