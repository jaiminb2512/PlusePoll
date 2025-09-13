const express = require('express');
const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    changePassword,
    deleteUser
} = require('../controllers/userController');

const router = express.Router();

// User authentication routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// User management routes
router.get('/:userId', getUserProfile);
router.put('/:userId', updateUserProfile);
router.put('/:userId/password', changePassword);
router.delete('/:userId', deleteUser);

module.exports = router;
