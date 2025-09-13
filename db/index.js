const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

const pool = new Pool(dbConfig);

// Test the database connection
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Database connected successfully');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Query error:', error);
        throw error;
    }
};

const getClient = async () => {
    return await pool.connect();
};

const closePool = async () => {
    try {
        await pool.end();
        console.log('🔌 Database pool closed');
    } catch (error) {
        console.error('Error closing database pool:', error);
    }
};

module.exports = {
    pool,
    query,
    getClient,
    testConnection,
    closePool
};
