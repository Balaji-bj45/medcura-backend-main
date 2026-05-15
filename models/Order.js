const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    razorpayOrderId: {
      type: String,
      required: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: String,
        price: Number,
        quantity: Number,
      },
    ],

    customerDetails: {
      name: String,
      email: String,
      phone: String,
      address: String,
    },

    amount: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      default: "Razorpay",
    },

    status: {
      type: String,
      enum: ["Paid", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Paid",
    },
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ razorpayOrderId: 1 }, { unique: true });
orderSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Order", orderSchema);
