const cartService = require("../services/cartService");
const {
  addToCartSchema,
  updateQuantitySchema,
} = require("../validations/cartValidation");
const { successResponse } = require("../utils/apiResponse");

exports.getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.customer._id);

    return successResponse(res, 200, cart || {}, "Cart fetched");
  } catch (err) {
    next(err);
  }
};

exports.add = async (req, res, next) => {
  try {
    const { error } = addToCartSchema.validate(req.body);
    if (error)
      throw { statusCode: 400, message: error.details[0].message };

    const cart = await cartService.addToCart(
      req.customer._id,
      req.body.productId,
      req.body.quantity
    );

    return successResponse(res, 200, cart, "Added to cart");
  } catch (err) {
    next(err);
  }
};

exports.updateQuantity = async (req, res, next) => {
  try {
    const { error } = updateQuantitySchema.validate(req.body);
    if (error)
      throw { statusCode: 400, message: error.details[0].message };

    const cart = await cartService.updateQuantity(
      req.customer._id,
      req.params.productId,
      req.body.quantity
    );

    return successResponse(res, 200, cart, "Quantity updated");
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const cart = await cartService.removeItem(
      req.customer._id,
      req.params.productId
    );

    return successResponse(res, 200, cart, "Item removed");
  } catch (err) {
    next(err);
  }
};
