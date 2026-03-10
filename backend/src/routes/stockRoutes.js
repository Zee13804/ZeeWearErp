const express = require('express');
const router = express.Router();
const { stockIn, stockOut, getStockMovements } = require('../controllers/stockController');
const { authenticate, authorize, requirePermission } = require('../middleware/authMiddleware');

router.post('/in', authenticate, authorize('admin', 'store'), requirePermission('action:stock_in'), stockIn);
router.post('/out', authenticate, authorize('admin', 'store'), requirePermission('action:stock_out'), stockOut);
router.get('/movements', authenticate, getStockMovements);

module.exports = router;
