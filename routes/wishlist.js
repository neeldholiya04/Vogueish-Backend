const express = require('express');
const UserModel = require('../components/User');
const ProductModel = require('../models/Product');

const router = express.Router();

router.post('/add-to-wishlist/:productId', async (req, res) => {
  try {
    const { userId } = req.body; // Assume userId is sent in the request body
    const { productId } = req.params;

    const user = await UserModel.findById(userId);
    const product = await ProductModel.findById(productId);

    if (!user || !product) {
      return res.status(404).json({ message: 'User or Product not found' });
    }

    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    res
      .status(200)
      .json({ message: 'Product added to wishlist', wishlist: user.wishlist });
  } catch (error) {
    console.error('Error adding product to wishlist:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
});

router.post('/remove-from-wishlist/:productId', async (req, res) => {
  try {
    const { userId } = req.body; // Assume userId is sent in the request body
    const { productId } = req.params;

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
    await user.save();

    res
      .status(200)
      .json({
        message: 'Product removed from wishlist',
        wishlist: user.wishlist,
      });
  } catch (error) {
    console.error('Error removing product from wishlist:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
});

router.get('/wishlist/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await UserModel.findById(userId).populate('wishlist');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ wishlist: user.wishlist });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;

module.exports = router;
