const express = require('express');
const ProductModel = require('../models/Product');
const multer = require('multer');

const router = express.Router();


// Set up multer for handling image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/image/:id', async (req, res) => {
  try {
    const product = await ProductModel.findById(req.params.id);

    if (!product || !product.image || !product.imageType) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.set('Content-Type', product.imageType);
    res.send(product.image);
  } catch (error) {
    console.error('Error retrieving image:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


router.post('/addProduct', upload.single('image'), async (req, res) => {
  console.log("/addProduct request received");
  try {
    const {
      name,
      price,
      discountPercentage,
      offerCode,
      offerDiscount,
      colors,
      sizes,
      availablePinCodes,
      category,
      brand,
      productLabel,
      launchedIn,
      material,
      occasion,
      work,
      pattern,
      fit,
      inventory
    } = req.body;

    const originalPrice = price / (1 - discountPercentage / 100);

    const newProduct = new ProductModel({
      name,
      price,
      discountPercentage,
      originalPrice,
      offerCode,
      offerDiscount,
      colors,
      sizes,
      availablePinCodes,
      category,
      brand,
      productLabel,
      launchedIn,
      material,
      occasion,
      work,
      pattern,
      fit,
      inventory,
      image: req.file ? req.file.buffer : undefined,
      imageType: req.file ? req.file.mimetype : undefined,
    });

    await newProduct.save();

    res.status(201).json({
      message: 'Product added successfully',
      productId: newProduct._id,
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.use('/uploads', express.static('uploads'));

router.get('/filterProducts', async (req, res) => {
  try {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      size,
      discount,
      productLabel,
      launchedIn,
      color,
      material,
      occasion,
      work,
      pattern,
      fit
    } = req.query;

    let filter = {};

    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (size) filter.sizes = size;
    if (discount) filter.discountPercentage = { $gte: Number(discount) };
    if (productLabel) filter.productLabel = productLabel;
    if (launchedIn) filter.launchedIn = launchedIn;
    if (color) filter.colors = color;
    if (material) filter.material = material;
    if (occasion) filter.occasion = occasion;
    if (work) filter.work = work;
    if (pattern) filter.pattern = pattern;
    if (fit) filter.fit = fit;

    // Find products excluding the image field
    const products = await ProductModel.find(filter).select('-image');

    res.json(products);
  } catch (error) {
    console.error('Error filtering products:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


router.get('/product/:id', async (req, res) => {
  try {
    const product = await ProductModel.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Convert the image buffer to a base64-encoded string for the URL
    const imageUrl = product.image ? `data:${product.imageType};base64,${product.image.toString('base64')}` : null;

    res.json({ ...product.toObject(), imageUrl });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.get('/check-delivery/:productId/:pinCode', async (req, res) => {
  // The code to check delivery availability
  try {
    const product = await ProductModel.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const isAvailable = product.availablePinCodes.includes(req.params.pinCode);
    res.json({ isAvailable });
  } catch (error) {
    console.error('Error checking delivery:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
});

router.get('/test-product/:id', async (req, res) => {
  try {
    const product = await ProductModel.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error finding product:', error);
    res.status(500).json({ message: 'Error finding product', error: error.message });
  }
});

module.exports = router;

