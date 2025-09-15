const jwt = require('jsonwebtoken');

// Load secret + expiration settings from environment
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';    // default: 7 days
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'; // default: 30 days

/**
 * Generate a short-lived access token
 * - Contains user payload (id, email, name)
 * - Expires quickly (e.g., 7 days or configured value)
 * - Used for API authorization
 */
const generateAccessToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'pulsepoll-api',   // who issued the token
        audience: 'pulsepoll-users' // intended audience
    });
};

/**
 * Generate a long-lived refresh token
 * - Same payload but longer expiration (e.g., 30 days)
 * - Used to request new access tokens
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'pulsepoll-api',
        audience: 'pulsepoll-users'
    });
};

/**
 * Verify a token
 * - Ensures token is valid, not expired, and issued by this app
 * - Returns decoded payload if valid
 * - Throws error if invalid/expired
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'pulsepoll-api',
            audience: 'pulsepoll-users'
        });
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

/**
 * Generate both access + refresh tokens for a given user
 * - User payload includes id, email, and name
 */
const generateTokens = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        name: user.name
    };

    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload)
    };
};

/**
 * Decode a token without verifying
 * - Useful for debugging\
 */
const decodeToken = (token) => {
    return jwt.decode(token);
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateTokens,
    verifyToken,
    decodeToken,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN
};
