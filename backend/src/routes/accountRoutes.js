const express = require('express');
const router = express.Router();
const { authenticate, authorize, authorizeAccounting } = require('../middleware/authMiddleware');
const {
  getAccounts, createAccount, updateAccount, deleteAccount,
  getAccountLedger,
  getTransfers, createTransfer, deleteTransfer,
} = require('../controllers/accountController');

const adminAuth = [authenticate, authorize('admin')];
const accAuth = [authenticate, authorizeAccounting];

router.get('/', ...accAuth, getAccounts);
router.post('/', ...adminAuth, createAccount);
router.get('/:id/ledger', ...accAuth, getAccountLedger);
router.put('/:id', ...adminAuth, updateAccount);
router.delete('/:id', ...adminAuth, deleteAccount);

router.get('/transfers', ...accAuth, getTransfers);
router.post('/transfers', ...accAuth, createTransfer);
router.delete('/transfers/:id', ...adminAuth, deleteTransfer);

module.exports = router;
