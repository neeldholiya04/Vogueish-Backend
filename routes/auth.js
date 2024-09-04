const express = require('express');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const UserModel = require('../components/User');
const mongoose = require('mongoose');
const router = express.Router();

const GOOGLE_CLIENT_ID =process.env.GOOGLE_CLIENT_ID
console.log("GOOGLE_CLIENT_ID: ",GOOGLE_CLIENT_ID)
const client = new OAuth2Client(GOOGLE_CLIENT_ID);
// const mongoURI = process.env.MONGO_URI;
//UserModel
/*
  const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String },
    googleId: { type: String },
  }, { versionKey: false });
*/ 


router.post('/google-signup', async (req, res) => {
  // The code for Google signup
  try {
    const { token, username, email } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const { sub } = ticket.getPayload();

    let user = await UserModel.findOne({ email });
    if (user) {
      return res
        .status(200)
        .json({ message: 'User already exists', userId: user._id });
    }

    user = new UserModel({
      username,
      email,
      googleId: sub,
    });

    await user.save();
    res
      .status(201)
      .json({ message: 'User created successfully', userId: user._id });
  } catch (error) {
    console.error('Error in Google signup:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
});

router.post('/signup', async (req, res) => {
  // The code for normal email password signup
  console.log('Signup request received');
  try {
    const { username, email, password } = req.body;

    const existingUser = await UserModel.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'Username or Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UserModel({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error in signup:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
});
router.post('/signin', async (req, res) => {
  // The code for user signin
  try {
    const { username, password } = req.body;

    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Please sign in with Google' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    res.json({ message: 'Sign in successful', userId: user._id });
  } catch (error) {
    console.error('Error in signin:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;
