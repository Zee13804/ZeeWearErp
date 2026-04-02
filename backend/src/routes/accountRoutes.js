const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  getAccounts, createAccount, updateAccount, deleteAccount,
  getAccountLedger,
  getTransfers, createTransfer, deleteTransfer,
} = require('../controllers/accountController');

const adminAuth = [authenticate, authorize('admin')];

router.get('/', ...adminAuth, getAccounts);
router.post('/', ...adminAuth, createAccount);
router.get('/:id/ledger', ...adminAuth, getAccountLedger);
router.put('/:id', ...adminAuth, updateAccount);
router.delete('/:id', ...adminAuth, deleteAccount);

router.get('/transfers', ...adminAuth, getTransfers);
router.post('/transfers', ...adminAuth, createTransfer);
router.delete('/transfers/:id', ...adminAuth, deleteTransfer);

module.exports = router;
