const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    originalPrice: { type: Number },
    offerCode: { type: String },
    offerDiscount: { type: Number },
    colors: [String],
    sizes: [String],
    availablePinCodes: [String],
    category: { type: String },
    brand: { type: String },
    productLabel: { type: String },
    launchedIn: { type: Date },
    material: { type: String },
    occasion: { type: String },
    work: { type: String },
    pattern: { type: String },
    image: { type: Buffer }, // Or use a String if storing the image URL
    imageType: { type: String },
    fit: { type: String },
    inventory: { type: Number, required: true, min: 0 },
  },
  { versionKey: false },
);

// Registering the model as 'Product'
const ProductModel = mongoose.model('Product', ProductSchema, 'Products');

module.exports = ProductModel;
