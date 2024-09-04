const express = require('express');
const UserModel = require('../components/User');
const ProductModel = require('../models/Product');

const router = express.Router();

// Import the required controllers and middleware functions
const {
  login,
  signUp,
  sendOTP,
  changePassword,
} = require("../controllers/Auth")
const {
  resetPasswordToken,
  resetPassword,
} = require("../controllers/ResetPassword")

const { auth } = require("../middleware/auth")

router.post("/login", login)

// Route for user signup
router.post("/signup", signUp)

// Route for sending OTP to the user's email
router.post("/sendotp", sendOTP)

// Route for Changing the password
router.post("/changepassword", auth, changePassword)

// Route for generating a reset password token
router.post("/reset-password-token", resetPasswordToken)

// Route for resetting user's password after verification
router.post("/reset-password", resetPassword)

router.get('/getUsers', async (req, res) => {
  // The code to get users
  try {
    console.log('Received GET /getUsers request');
    const users = await UserModel.find({}, { password: 0, googleId: 0 });
    console.log('Users found:', users);
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: err.message });
  }
});

module.exports = router;
