const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');
const { createAccessory, getAllAccessories, accessoryIn, accessoryOut, getAccessoryMovements, updateAccessory, deleteAccessory, uploadAccessoryImage, deleteAccessoryImage } = require('../controllers/accessoryController');
const { authenticate, authorize, requirePermission } = require('../middleware/authMiddleware');

const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
const memStorage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files (jpg, jpeg, png, webp, gif) are allowed'), false);
};
const upload = multer({ storage: memStorage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const MAX_SIZE_BYTES = 40 * 1024;
const compressImage = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const outputFilename = `acc-${uniqueSuffix}.webp`;
    const outputPath = path.join(uploadsDir, outputFilename);
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const buffer = req.file.buffer;
    const steps = [
      { quality: 70, width: 800 }, { quality: 50, width: 600 },
      { quality: 35, width: 500 }, { quality: 25, width: 400 },
      { quality: 15, width: 300 }, { quality: 10, width: 200 },
    ];
    let outputBuffer;
    for (const step of steps) {
      outputBuffer = await sharp(buffer).rotate().resize(step.width, null, { withoutEnlargement: true }).webp({ quality: step.quality }).toBuffer();
      if (outputBuffer.length <= MAX_SIZE_BYTES) break;
    }
    if (outputBuffer.length > MAX_SIZE_BYTES) {
      return res.status(413).json({ error: 'Image too large. Even after compression it exceeds 40KB.' });
    }
    fs.writeFileSync(outputPath, outputBuffer);
    req.file.filename = outputFilename;
    req.file.path = outputPath;
    req.file.size = outputBuffer.length;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compress image' });
  }
};

router.post('/', authenticate, authorize('admin', 'store'), requirePermission('action:create'), createAccessory);
router.get('/', authenticate, getAllAccessories);
router.post('/in', authenticate, authorize('admin', 'store'), requirePermission('action:stock_in'), accessoryIn);
router.post('/out', authenticate, authorize('admin', 'store'), requirePermission('action:stock_out'), accessoryOut);
router.get('/movements', authenticate, getAccessoryMovements);
router.post('/:id/image', authenticate, authorize('admin', 'store'), requirePermission('action:edit'), upload.single('image'), compressImage, uploadAccessoryImage);
router.delete('/:id/image', authenticate, authorize('admin', 'store'), requirePermission('action:edit'), deleteAccessoryImage);
router.put('/:id', authenticate, authorize('admin', 'store'), requirePermission('action:edit'), updateAccessory);
router.delete('/:id', authenticate, authorize('admin'), requirePermission('action:delete'), deleteAccessory);

module.exports = router;
