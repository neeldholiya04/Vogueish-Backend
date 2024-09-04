const stripe = require("../config/stripe");
const Order = require("../models/order");
const User = require("../models/user");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const { AppError } = require("../utils/errors");

class StripeService {
  async createPaymentIntent(items, userId, shippingAddress, pinCode) {
    console.log(`Creating PaymentIntent for user ${userId}`);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let totalAmount = 0;
      const orderProducts = [];

      console.log(`Finding user ${userId}`);
      for (const item of items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          throw new AppError(`Product not found: ${item.productId}`, 404);
        }

        if (!product.availablePinCodes.includes(pinCode)) {
          throw new AppError(
            `Product ${product.name} is not available in your area`,
            400
          );
        }

        if (
          !product.colors.includes(item.color) ||
          !product.sizes.includes(item.size)
        ) {
          throw new AppError(
            `Selected color or size is not available for ${product.name}`,
            400
          );
        }

        if (product.inventory < item.quantity) {
          throw new AppError(`Not enough inventory for ${product.name}`, 400);
        }

        let price = product.price;
        if (product.offerCode && product.offerCode === item.appliedOfferCode) {
          price -= product.offerDiscount;
        }

        totalAmount += price * item.quantity;
        orderProducts.push({
          product: product._id,
          quantity: item.quantity,
          price: price,
          color: item.color,
          size: item.size,
        });

        product.inventory -= item.quantity;
        await product.save({ session });
      }

      // Create and save the order initially to generate orderId
      const order = new Order({
        user: userId,
        products: orderProducts,
        totalAmount,
        status: "pending",
        shippingAddress,
        pinCode,
      });

      await order.save({ session });

      console.log(`Order ${order.id} created with totalAmount: ${totalAmount}`);

      // Generate the payment intent with the order ID in the metadata
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100),
        currency: "usd",
        metadata: {
          userId: userId,
          orderId: order.id,
          isTestPayment: "false",
        },
      });
      console.log("PaymentIntent created in Service: ", paymentIntent.id);

      // Assign the paymentIntentId to the order
      order.paymentIntentId = paymentIntent.id;

      // Update and save the order with the paymentIntentId
      await order.save({ session });

      await session.commitTransaction();

      return { clientSecret: paymentIntent.client_secret, orderId: order._id };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      console.log("PaymentIntent created");
      session.endSession();
    }
  }

  //   async confirmPayment(paymentIntentId) {
  //     console.log(`Confirming payment for PaymentIntent: ${paymentIntentId}`);
  //     const session = await mongoose.startSession();
  //     session.startTransaction();

  //     try {
  //       const paymentIntent = await stripe.paymentIntents.retrieve(
  //         paymentIntentId
  //       );

  //       const order = await Order.findOne({ paymentIntentId })
  //         .populate("products.product")
  //         .session(session);
  //       if (!order) {
  //         throw new AppError("Order not found", 404);
  //       }

  //       console.log(`Order found in ConfirmPayment: ${order}`);

  //       if (paymentIntent.status !== "succeeded") {
  //         throw new AppError("Payment not succeeded", 400);
  //       }

  //       if (order.status === "completed") {
  //         throw new AppError("Order already completed", 400);
  //       }

  //       order.status = "completed";
  //       await order.save({ session });

  //       await session.commitTransaction();
  //       return order;
  //     } catch (error) {
  //       await session.abortTransaction();
  //       throw error;
  //     } finally {
  //       session.endSession();
  //     }
  //   }

  //   async createCheckoutSession(orderId, userId) {

  //     try {
  //         const order = await Order.findById(orderId).populate('products.product');

  //         if (!order) {
  //             throw new AppError("Order not found", 404);
  //         }

  //         const customer = await User.findById(userId); // Assuming you have a User model to get customer details
  //         if (!customer) {
  //             throw new AppError("Customer not found", 404);
  //         }

  //         const session = await stripe.checkout.sessions.create({
  //             payment_method_types: ["card"],
  //             line_items: order.products.map((item) => ({
  //                 price_data: {
  //                     currency: "usd",
  //                     product_data: {
  //                         name: item.product.name,
  //                     },
  //                     unit_amount: item.product.price * 100, // Stripe expects the amount in cents
  //                 },
  //                 quantity: item.quantity,
  //             })),
  //             mode: "payment",
  //             customer_email: customer.email,
  //             metadata: {
  //                 orderId: order._id.toString(),
  //                 customerName: customer.name,
  //                 customerEmail: customer.email,
  //                 customerContact: customer.contactNumber, // Assuming contactNumber is a field in your User model
  //                 orderDetails: JSON.stringify(order.products.map((item) => ({
  //                     productId: item.product._id.toString(),
  //                     productName: item.product.name,
  //                     quantity: item.quantity,
  //                     price: item.product.price,
  //                     color: item.color,
  //                     size: item.size,
  //                 }))),
  //             },
  //             shipping: {
  //                 name: customer.name,
  //                 address: {
  //                     line1: order.shippingAddress.line1,
  //                     line2: order.shippingAddress.line2,
  //                     city: order.shippingAddress.city,
  //                     state: order.shippingAddress.state,
  //                     postal_code: order.shippingAddress.postalCode,
  //                     country: order.shippingAddress.country,
  //                 },
  //             },

  //             success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
  //             cancel_url: `${process.env.FRONTEND_URL}/cancel`,
  //         });
  //         console.log(`Checkout session created: ${session.url}`);
  //         // res.redirect(session.url);
  //         return { sessionId: session.id, url: session.url };
  //     } catch (error) {
  //         console.error(`Error creating checkout session: ${error.message}`);
  //         throw error;
  //     }
  // }
  async processOrderPayment(orderId, userId, event) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the order
      const order = await Order.findById(orderId)
        .populate("products.product")
        .session(session);
      if (!order) {
        throw new AppError("Order not found", 404);
      }

      // Find the customer
      const customer = await User.findById(userId);
      if (!customer) {
        throw new AppError("Customer not found", 404);
      }

      if (order.status === "completed") {
        throw new AppError("Order already completed", 400);
      }

      // Create the checkout session
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: order.products.map((item) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.product.name,
            },
            unit_amount: item.product.price * 100, // Stripe expects the amount in cents
          },
          quantity: item.quantity,
        })),
        mode: "payment",
        customer_email: customer.email,
        metadata: {
          orderId: order._id.toString(),
          customerName: customer.name,
          customerEmail: customer.email,
          customerContact: customer.contactNumber,
          orderDetails: JSON.stringify(
            order.products.map((item) => ({
              productId: item.product._id.toString(),
              productName: item.product.name,
              quantity: item.quantity,
              price: item.product.price,
              color: item.color,
              size: item.size,
            }))
          ),
        },
        shipping: {
          name: customer.name,
          address: {
            line1: order.shippingAddress.line1,
            line2: order.shippingAddress.line2,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            postal_code: order.shippingAddress.postalCode,
            country: order.shippingAddress.country,
          },
        },
        success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      });

      console.log(`Event in processOrderPayment: ${JSON.stringify(event)}`);
      console.log(`Checkout session created: ${checkoutSession.url}`);

      // Store the checkout session ID in the order for later verification
      order.checkoutSessionId = checkoutSession.id;
      await order.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      return { sessionId: checkoutSession.id, url: checkoutSession.url, event: event };
    } catch (error) {
      await session.abortTransaction();
      console.error(`Error processing payment: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async handlePaymentIntentSucceeded(paymentIntent, orderId) {
    console.log("orderId in Success " + orderId);
    console.log(
      `Processing successful payment for PaymentIntent: ${paymentIntent.id}`
    );

    let order = await this.findOrderWithRetry(paymentIntent, orderId);

    if (!order) {
      if (
        paymentIntent.metadata.isTestPayment === "true" ||
        !paymentIntent.metadata.orderId
      ) {
        console.log("Creating temporary order for test payment");
        order = await this.createTemporaryOrder(paymentIntent);
      } else {
        console.error(
          "Order not found for non-test payment. This should not happen."
        );
        return;
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      order.status = "completed";
      await order.save({ session });

      if (!order.isTemporary) {
        for (const item of order.products) {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { inventory: -item.quantity } },
            { session }
          );
        }
      }

      await session.commitTransaction();
      console.log(`Order ${order._id} marked as completed`);
      return order;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async handlePaymentIntentFailed(paymentIntent, orderId) {
    console.log("orderId in Failed " + orderId);
    console.log(
      `Processing failed payment for PaymentIntent: ${paymentIntent.id}`
    );
    const order = await this.findOrderWithRetry(paymentIntent, orderId);
    if (!order) {
      console.error(
        `Order not found for failed PaymentIntent: ${paymentIntent.id}`
      );
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      order.status = "failed";
      await order.save({ session });

      // Restore inventory
      if (!order.isTemporary) {
        for (const item of order.products) {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { inventory: item.quantity } },
            { session }
          );
        }
      }

      await session.commitTransaction();
      console.log(`Order ${order._id} marked as failed`);
      return order;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async findOrderWithRetry(paymentIntent, retries = 3, orderId) {
    for (let i = 0; i < retries; i++) {
      const order = await Order.findOne(orderId).populate("products.product");
      console.log("order in retry: " + order);
      if (order) {
        console.log(
          `Order found for PaymentIntent ${paymentIntent.id} with id ${
            order._id
          } on attempt ${i + 1}`
        );
        return order;
      }
      console.log(
        `Order not found for PaymentIntent ${paymentIntent.id} on attempt ${
          i + 1
        }. Retrying...`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.error(
      `Order not found for PaymentIntent ${paymentIntent.id} after ${retries} attempts`
    );
    return null;
  }

  async createTemporaryOrder(paymentIntent) {
    const order = new Order({
      user: new mongoose.Types.ObjectId(), // Generates a valid but random ObjectId
      totalAmount: paymentIntent.amount / 100,
      status: "pending",
      paymentIntentId: paymentIntent.id,
      shippingAddress: paymentIntent.shipping
        ? JSON.stringify(paymentIntent.shipping)
        : "Test Address",
      pinCode: paymentIntent.shipping?.address?.postal_code || "000000",
      products: [
        {
          product: new mongoose.Types.ObjectId(), // Generates a valid ObjectId for test product
          quantity: 1,
          price: paymentIntent.amount / 100,
        },
      ],
      isTemporary: true,
    });

    await order.save();
    console.log(
      `Created temporary order ${order._id} for test PaymentIntent ${paymentIntent.id}`
    );
    return order;
  }
}

module.exports = new StripeService();
