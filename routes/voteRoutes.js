const express = require('express');
const {
    addVote,
    updateVote,
    removeVote,
    getUserVotes,
    getPollVotes,
    getUserVoteForPoll
} = require('../controllers/voteController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, addVote);
router.put('/', authenticateToken, updateVote);
router.delete('/:pollOptionId', authenticateToken, removeVote);
router.get('/my', authenticateToken, getUserVotes);
router.get('/poll/:pollId', authenticateToken, getPollVotes);
router.get('/poll/:pollId/my', authenticateToken, getUserVoteForPoll);

module.exports = router;
