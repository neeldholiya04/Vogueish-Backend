// This has to be updated after login... at the time of checkout.
const mongoose = require('mongoose');
const profileSchema = new mongoose.Schema({
  gender: {
    type: String,
  },
  dateofbirth: {
    type: String,
  },
  about: {
    type: String,
  },
  contactNumber: {
    type: Number,
    trim: true,
  },
  Address: {
    type: String,
    Number,
    require: true,
  },
});
module.exports = mongoose.model('Profile', profileSchema);
