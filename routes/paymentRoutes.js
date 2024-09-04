const express = require('express');
const router = express.Router();
const { createPaymentIntent, stripeWebhook } = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

router.post('/create-payment-intent', auth, createPaymentIntent);
router.post('/webhook', express.raw({type: 'application/json'}), stripeWebhook);

module.exports = router;