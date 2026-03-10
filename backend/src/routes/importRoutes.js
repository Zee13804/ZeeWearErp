const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { importVariantsExcel, downloadImportTemplate } = require('../controllers/importController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `import-${uniqueSuffix}.xlsx`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/variants', authenticate, authorize('admin', 'store'), upload.single('file'), importVariantsExcel);
router.get('/template/variants', authenticate, downloadImportTemplate);

module.exports = router;
