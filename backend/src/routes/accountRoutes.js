const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  getAccounts, createAccount, updateAccount, deleteAccount,
  getAccountLedger,
  getTransfers, createTransfer, deleteTransfer,
} = require('../controllers/accountController');

const adminAuth = [authenticate, authorize('admin')];

router.get('/', authenticate, getAccounts);
router.post('/', ...adminAuth, createAccount);
router.get('/:id/ledger', authenticate, getAccountLedger);
router.put('/:id', ...adminAuth, updateAccount);
router.delete('/:id', ...adminAuth, deleteAccount);

router.get('/transfers', authenticate, getTransfers);
router.post('/transfers', ...adminAuth, createTransfer);
router.delete('/transfers/:id', ...adminAuth, deleteTransfer);

module.exports = router;
