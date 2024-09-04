const express = require('express');
const cors = require('./config/cors');
const mongoose = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/User.js')
const productRoutes = require('./routes/Product.js');
const wishlistRoutes = require('./routes/wishlist');
const paymentRoutes = require('./routes/paymentRoutes');
const errorHandler = require('./middleware/errorHandler');
const dotenv = require("dotenv")

dotenv.config();

const app = express();

// Apply CORS middleware
app.use(cors);

// Stripe webhook route
app.post('/api/payments/webhook', express.raw({type: 'application/json'}), paymentRoutes);

// Body parsing middleware for other routes
app.use(express.json());

// Routes
app.use('/api/v1/hello', (req, res) => {
  console.log('Hello World!');
  res.send('Hello World!');
  return;
});
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/product', productRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/payments', paymentRoutes);

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});