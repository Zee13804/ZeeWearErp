const express = require('express');
const router = express.Router();
const {
  createVariant,
  getAllVariants,
  getVariantBySku,
  getVariantByBarcode,
  updateVariant,
  deleteVariant,
  generateBarcodeForVariant,
} = require('../controllers/variantController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.post('/', createVariant);
router.get('/', getAllVariants);
router.get('/barcode/:barcode', authenticate, getVariantByBarcode);
router.post('/generate-barcode/:sku', authenticate, generateBarcodeForVariant);
router.get('/:sku', getVariantBySku);
router.put('/:sku', updateVariant);
router.delete('/:sku', authenticate, deleteVariant);

module.exports = router;
