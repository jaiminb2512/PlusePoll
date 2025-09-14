const express = require('express');
const cookieParser = require('cookie-parser');
const http = require('http');
const { closePool } = require('./db');
const routes = require('./routes');
const { initializeSocket } = require('./services/socketService');
require('dotenv').config();

const app = express();


app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

const initializeDatabase = async () => {
    const { testConnection } = require('./db');
    const isConnected = await testConnection();
    if (!isConnected) {
        console.log('⚠️  Server starting without database connection');
    }
};

const PORT = process.env.PORT;

app.use('/api', routes);

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

const server = http.createServer(app);

initializeSocket(server);

server.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server initialized`);

    await initializeDatabase();
});
