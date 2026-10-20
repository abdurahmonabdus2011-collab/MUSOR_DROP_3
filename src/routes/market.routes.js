const { Router } = require('express');

const {
  getListings,
  createListing,
  buyListing,
  cancelListing
} = require('../controllers/market.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');

const router = Router();

// GET /api/market — hamma bozordagi faol e'lonlarni ko'rsin, agar token bo'lsa req.user tushadi
router.get('/', optionalAuth, getListings);
router.get('/mine', authenticate, getListings);

// Mana arkan bo'ylab avval authenticate o'tadi
router.use(authenticate);

router.post('/', createListing);
router.post('/:id/buy', buyListing);
router.delete('/:id', cancelListing);

module.exports = router;
