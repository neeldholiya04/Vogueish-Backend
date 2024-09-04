const StripeService = require("../services/stripeService");
const stripe = require("../config/stripe");
const { AppError } = require("../utils/errors");
// const { sendPaymentSuccessEmail, sendPaymentFailureEmail } = require('../utils/emailService');

exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { items, userId, shippingAddress, pinCode } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError("Invalid items array", 400);
    }

    const result = await StripeService.createPaymentIntent(
      items,
      userId,
      shippingAddress,
      pinCode
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.stripeWebhook = async (req, res) => {
  console.log("Webhook received");
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const orderId = event.data.object.metadata.orderId;
    const userId = event.data.object.metadata.userId;

    switch (event.type) {
      case "payment_intent.created":
        const session = await StripeService.processOrderPayment(
          orderId,
          userId,
          event
        );
        return res.redirect(303, session.url);

      case "payment_intent.succeeded":
        console.log(
          `PaymentIntent succeeded: ${event.data.object.id} for order ${orderId}`
        );
        const order = await StripeService.handlePaymentIntentSucceeded(
          event.data.object,
          orderId
        );
        if (order && !order.isTemporary) {
          // await sendPaymentSuccessEmail(order.user.email, order.totalAmount, order._id);
        }
        break;
      case "payment_intent.payment_failed":
        console.log(
          `PaymentIntent failed: ${event.data.object.id} for order ${orderId}`
        );
        const failedOrder = await StripeService.handlePaymentIntentFailed(
          event.data.object,
          orderId
        );
        if (failedOrder && !failedOrder.isTemporary) {
          // await sendPaymentFailureEmail(failedOrder.user.email, failedOrder.totalAmount, failedOrder._id);
        }
        break;
      case "charge.updated":
        console.log(`Charge updated: ${event.data.object.id}`);
        break;
      case "charge.succeeded":
        console.log(`Charge succeeded: ${event.data.object.id}`);
        break;
      case "charge.failed":
        console.log(`Charge failed: ${event.data.object.id}`);
        break;
      case "charge.dispute.created":
        console.log(`Dispute created: ${event.data.object.id}`);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(200).send("Webhook processed with errors");
  }
};
