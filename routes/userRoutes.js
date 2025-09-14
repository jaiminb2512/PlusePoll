const express = require('express');
const {
    registerUser,
    loginUser,
    logoutUser,
    refreshToken,
    getCurrentUser,
    getUserProfile,
    updateUserProfile,
    changePassword,
    deleteUser
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/refresh-token', refreshToken);

router.get('/me', authenticateToken, getCurrentUser);
router.get('/:userId', authenticateToken, getUserProfile);
router.put('/:userId', authenticateToken, updateUserProfile);
router.put('/:userId/password', authenticateToken, changePassword);
router.delete('/:userId', authenticateToken, deleteUser);

module.exports = router;
