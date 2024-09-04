const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

exports.auth = async (req, res, next) => {
  try {
    // Extract token from cookies, body, or headers
    const token =
      req.cookies?.token ||
      req.body?.token ||
      req.header('Authorization')?.replace('Bearer ', '');

    // Check if token is present
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing. Please log in and try again.',
      });
    }

    // Verify the token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // Check if user exists in the database
      const userExists = await User.findById(decoded.id);
      if (!userExists) {
        return res.status(401).json({
          success: false,
          message: 'User associated with this token no longer exists. Please log in again.',
        });
      }

      next();
    } catch (error) {
      // Handle token verification errors
      let errorMessage = 'Invalid authentication token. Please log in again.';
      if (error.name === 'TokenExpiredError') {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Invalid token. Please log in again.';
      }

      return res.status(401).json({
        success: false,
        message: errorMessage,
      });
    }
  } catch (error) {
    console.error('Error occurred during authentication:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during authentication. Please try again later.',
    });
  }
};