const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Customer = require("../models/Customer");

const getUnitPrice = (product) => {
  if (typeof product.discountPrice === "number" && product.discountPrice > 0) {
    return product.discountPrice;
  }

  if (typeof product.salePrice === "number" && product.salePrice > 0) {
    return product.salePrice;
  }

  if (typeof product.price === "number" && product.price > 0) {
    return product.price;
  }

  return product.mrp || 0;
};

const getStock = (product) => (Number.isFinite(product?.stock) ? product.stock : 10);

exports.calculateCartTotal = async (customerId) => {
  const cart = await Cart.findOne({ customer: customerId }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    throw { statusCode: 400, message: "Cart is empty" };
  }

  let subtotal = 0;
  const items = [];

  for (const item of cart.items) {
    const product = await Product.findById(item.product._id);

    if (!product || !product.isActive) {
      throw { statusCode: 400, message: "Product unavailable" };
    }

    if (getStock(product) < item.quantity) {
      throw {
        statusCode: 400,
        message: `Insufficient stock for ${product.name}`,
      };
    }

    const price = getUnitPrice(product);
    const itemTotal = Number((price * item.quantity).toFixed(2));

    subtotal += itemTotal;

    items.push({
      product: product._id,
      name: product.name,
      price,
      quantity: item.quantity,
      total: itemTotal,
    });
  }

  const deliveryCharge = subtotal >= 15000 ? 0 : 350;
  const tax = Number((subtotal * 0.05).toFixed(2));
  const total = Number((subtotal + deliveryCharge + tax).toFixed(2));

  return { subtotal, deliveryCharge, tax, total, items };
};

exports.createOrderInDB = async ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  customer,
  items,
  customerDetails,
  amount,
  subtotal,
  deliveryCharge,
  tax,
  paymentMethod,
}) => {
  const order = await Order.create({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    customer,
    items,
    customerDetails,
    amount,
    subtotal,
    deliveryCharge,
    tax,
    paymentMethod,
    status: "Paid",
  });

  await Customer.findByIdAndUpdate(customer, {
    $addToSet: { orders: order._id },
  });

  await Promise.all(
    items.map(async (item) => {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    })
  );

  return order;
};
