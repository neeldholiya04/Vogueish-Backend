const { body, validationResult } = require('express-validator');

exports.validatePaymentIntent = [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('items.*.color').isString().notEmpty().withMessage('Color is required'),
  body('items.*.size').isString().notEmpty().withMessage('Size is required'),
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('shippingAddress').isObject().withMessage('Shipping address must be an object'),
  body('shippingAddress.line1').isString().notEmpty().withMessage('Address line 1 is required'),
  body('shippingAddress.city').isString().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').isString().notEmpty().withMessage('State is required'),
  body('shippingAddress.postalCode').isString().notEmpty().withMessage('Postal code is required'),
  body('shippingAddress.country').isString().notEmpty().withMessage('Country is required'),
  body('pinCode').isString().notEmpty().withMessage('Pin code is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.errors = errors.array().map(err => ({ field: err.param, message: err.msg }));
      return next(error);
    }
    next();
  }
];