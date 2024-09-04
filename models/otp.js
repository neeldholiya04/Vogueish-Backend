const mongoose = require('mongoose');
const mailsender = require('../utils/mailSender');
const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    expires: '5m',
  },
});
async function sendVerificationEmail(email, otp) {
  try {
    const mailResponse = await mailsender(
      email,
      'Verification email from Voguish',
      otp,
    );
    console.log('Email sent Successfully', mailResponse);
  } catch (error) {
    console.log('Error occured while sending email', error);
    throw error;
  }
}
OTPSchema.pre('save', async function (next) {
  await sendVerificationEmail(this.email, this.otp);
  next();
});
// export module
module.exports = mongoose.model('OTP', OTPSchema);
