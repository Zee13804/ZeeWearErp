const express = require('express');
const router = express.Router();
const {
  createArticle,
  getAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  getArticleFilterOptions,
} = require('../controllers/articleController');
const { authenticate, authorize, requirePermission } = require('../middleware/authMiddleware');

router.get('/filter-options', getArticleFilterOptions);
router.post('/', requirePermission('action:create'), createArticle);
router.get('/', getAllArticles);
router.get('/:id', getArticleById);
router.put('/:id', requirePermission('action:edit'), updateArticle);
router.delete('/:id', authenticate, authorize('admin'), requirePermission('action:delete'), deleteArticle);

module.exports = router;
