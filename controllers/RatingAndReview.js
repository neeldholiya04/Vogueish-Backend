const User = require('../models/user');
const mailSender = require('../utilis/mailSender');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

exports.resetPasswordToken = async (req, res) => {
  try {
    // Get email from request body
    const email = req.body.email;

    // Check if user exists with this email
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.json({
        success: false,
        message: `Your email is not registered with us`,
      });
    }

    // Generate token
    const token = crypto.randomUUID();

    // Update user by adding token and expiration time
    const updatedDetails = await User.findOneAndUpdate(
      { email: email },
      {
        token: token,
        resetPasswordExpires: Date.now() + 5 * 60 * 1000,
      },
      { new: true },
    );

    // Create URL
    const url = `https://localhost:3000/update-password/${token}`;

    // Send mail containing URL
    await mailSender(
      email,
      'Password reset link',
      `Password reset link: ${url}`,
    );

    // Return response
    return res.json({
      success: true,
      message:
        'Email sent successfully. Please check your mail and change your password.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Something went wrong while sending the reset password mail`,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword, token } = req.body;

    // Validator
    if (password !== confirmPassword) {
      return res.json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    // Get user details from db using token
    const userDetails = await User.findOne({ token: token });

    // If no - invalid token
    if (!userDetails) {
      return res.json({
        success: false,
        message: `Invalid token`,
      });
    }

    // Token time checking
    if (userDetails.resetPasswordExpires < Date.now()) {
      return res.json({
        success: false,
        message: `Token is expired, please regenerate your token`,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await User.findOneAndUpdate(
      { token: token },
      { password: hashedPassword },
      { new: true },
    );

    return res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while resetting the password',
    });
  }
};
