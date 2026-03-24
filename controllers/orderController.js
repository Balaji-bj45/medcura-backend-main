const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const orderService = require("../services/orderService");
const { checkoutSchema } = require("../validations/orderValidation");
const { successResponse } = require("../utils/apiResponse");
const Cart = require("../models/Cart");
const Order = require("../models/Order");

exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const customerId = req.customer._id;

    const { error } = checkoutSchema.validate(req.body);
    if (error)
      throw { statusCode: 400, message: error.details[0].message };

    const { total, subtotal, deliveryCharge, tax } =
      await orderService.calculateCartTotal(customerId);

    const razorpayOrder = await razorpay.orders.create({
      amount: total * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    const responsePayload = {
      ...razorpayOrder,
      breakdown: {
        subtotal,
        deliveryCharge,
        tax,
        total,
      },
    };

    return successResponse(
      res,
      200,
      responsePayload,
      "Razorpay order created"
    );
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const customerId = req.customer._id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      name,
      email,
      phone,
      address,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature)
      throw { statusCode: 400, message: "Invalid payment signature" };

    const { total, subtotal, deliveryCharge, tax, items } =
      await orderService.calculateCartTotal(customerId);

    const order = await orderService.createOrderInDB({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      customer: customerId,
      items,
      customerDetails: { name, email, phone, address },
      amount: total,
      subtotal,
      deliveryCharge,
      tax,
      paymentMethod: req.body.paymentMethod || "Razorpay",
    });

    await Cart.deleteOne({ customer: customerId });

    return successResponse(res, 200, order, "Payment verified & order placed");
  } catch (err) {
    next(err);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      customer: req.customer._id,
    })
      .populate("items.product")
      .sort({ createdAt: -1 });

    return successResponse(res, 200, orders, "My orders fetched");
  } catch (err) {
    next(err);
  }
};

exports.getMyOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.customer._id,
    }).populate("items.product");

    if (!order) {
      throw { statusCode: 404, message: "Order not found" };
    }

    return successResponse(res, 200, order, "Order fetched");
  } catch (err) {
    next(err);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("customer", "email")
      .populate("items.product", "name category")
      .sort({ createdAt: -1 });

    return successResponse(res, 200, orders, "Orders fetched");
  } catch (err) {
    next(err);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer", "email")
      .populate("items.product", "name category images");

    if (!order)
      throw { statusCode: 404, message: "Order not found" };

    return successResponse(res, 200, order, "Order fetched");
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const allowedStatuses = ["Paid", "Processing", "Shipped", "Delivered", "Cancelled"];
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      throw {
        statusCode: 400,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      };
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("customer", "email")
      .populate("items.product", "name category images");

    if (!order)
      throw { statusCode: 404, message: "Order not found" };

    return successResponse(res, 200, order, "Order status updated");
  } catch (err) {
    next(err);
  }
};
