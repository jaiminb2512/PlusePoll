const express = require('express');
const {
    createPoll,
    getAllPolls,
    getPollById,
    updatePoll,
    deletePoll,
    getMyPolls,
    togglePollPublish,
    getPollStats
} = require('../controllers/pollController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, getAllPolls);
router.get('/:pollId', optionalAuth, getPollById);
router.get('/:pollId/stats', optionalAuth, getPollStats);

router.post('/', authenticateToken, createPoll);
router.get('/my/polls', authenticateToken, getMyPolls);
router.put('/:pollId', authenticateToken, updatePoll);
router.delete('/:pollId', authenticateToken, deletePoll);
router.patch('/:pollId/publish', authenticateToken, togglePollPublish);

module.exports = router;
