const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, authorize('admin', 'dev'), getAllUsers);
router.post('/', authenticate, authorize('dev'), createUser);
router.put('/:id', authenticate, authorize('dev'), updateUser);
router.delete('/:id', authenticate, authorize('dev'), deleteUser);

module.exports = router;
