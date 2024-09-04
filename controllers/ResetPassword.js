const mailSender = require("../utils/mailSender");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

exports.resetPasswordToken = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email is provided
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }

    // Check if user exists with this email
    const checkUserPresent = await User.findOne({ email });
    if (!checkUserPresent) {
      return res.status(404).json({
        success: false,
        message: 'Your email is not registered with us.',
      });
    }

    // Generate a secure token
    const token = crypto.randomUUID();

    // Update user with reset token and expiration time
    const updatedDetails = await User.findOneAndUpdate(
      { email },
      {
        resetPasswordToken: token,
        resetPasswordExpires: Date.now() + 5 * 60 * 1000, // Token expires in 5 minutes
      },
      { new: true }
    );

    if (!updatedDetails) {
      throw new Error('Failed to update user with reset token.');
    }

    // Create reset password URL
    const url = `${process.env.FRONTEND_URL}/update-password/${token}`;

    // Send the password reset email
    await mailSender(
      email,
      'Password Reset Link',
      `<p>You requested to reset your password. Click the link below to reset it:</p><a href="${url}">Reset Password</a><p>This link will expire in 5 minutes.</p>`
    );

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully. Please check your email to reset your password.',
      token: token,
    });
  } catch (error) {
    console.error('Error in resetPasswordToken:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while sending the reset password email.',
      error: error.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword, token } = req.body;

    if (!password || !confirmPassword || !token) {
      return res.status(400).json({
        success: false,
        message: 'Password, confirm password, and token are required.',
      });
    }

    if (password !== confirmPassword) {
      return res.json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    // Get user details from db using token
    const userDetails = await User.findOne({ resetPasswordToken: token });

    // If no user found - invalid token
    if (!userDetails) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    // Check if the token has expired
    if (userDetails.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Token is expired, please regenerate your token.',
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password and clear the reset token and expiration
    await User.findOneAndUpdate(
      { resetPasswordToken: token },
      {
        password: hashedPassword,
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpires: "",
        },
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    console.error('Error in resetPassword:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while resetting the password.',
      error: error.message,
    });
  }
};
