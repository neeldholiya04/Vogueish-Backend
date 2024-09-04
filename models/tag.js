const mongoose = require('mongoose');
const CategorySchema = new mongoose.Schema({
  Mens: {
    type: String,
    require: true,
  },
  Women: {
    type: String,
    reqire: true,
  },
  Kids: {
    type: String,
    reqire: true,
  },
  Brand: {
    type: String,
    require: true,
  },
});
module.exports = mongoose.model('Category', CategorySchema);
