const express = require('express');
const { closePool } = require('./db');
const routes = require('./routes');

const app = express();

// Middleware
app.use(express.json());

// Test database connection on startup
const initializeDatabase = async () => {
    const { testConnection } = require('./db');
    const isConnected = await testConnection();
    if (!isConnected) {
        console.log('⚠️  Server starting without database connection');
    }
};

// Start server
const PORT = 5000;

// Mount all routes
app.use('/api', routes);

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
