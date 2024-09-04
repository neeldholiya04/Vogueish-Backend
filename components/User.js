const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String },
    googleId: { type: String },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Products' }],
  },
  { versionKey: false },
);

const UserModel = mongoose.model('Users', UserSchema, 'Users');

module.exports = UserModel;
