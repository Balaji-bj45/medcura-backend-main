const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const mongoose = require("mongoose");

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

const isDuplicateKeyError = (error) => error?.code === 11000;

const usesUnsupportedTransactions = (error) =>
  typeof error?.message === "string" &&
  (error.message.includes("Transaction numbers are only allowed") ||
    error.message.includes("replica set member") ||
    error.message.includes("mongos"));

const findExistingOrder = async ({
  razorpayOrderId,
  razorpayPaymentId,
  customer,
  session,
}) => {
  const orConditions = [];

  if (razorpayPaymentId) {
    orConditions.push({ razorpayPaymentId });
  }

  if (razorpayOrderId) {
    orConditions.push({ razorpayOrderId, customer });
  }

  if (orConditions.length === 0) return null;

  return Order.findOne({ $or: orConditions }).session(session || null);
};

const reserveInventory = async (items, session) => {
  const reservedItems = [];

  for (const item of items) {
    const updateResult = await Product.updateOne(
      {
        _id: item.product,
        isActive: true,
        stock: { $gte: item.quantity },
      },
      { $inc: { stock: -item.quantity } },
      session ? { session } : undefined
    );

    if (!updateResult.modifiedCount) {
      throw {
        statusCode: 409,
        message: `Insufficient stock for ${item.name}`,
      };
    }

    reservedItems.push(item);
  }

  return reservedItems;
};

const restoreInventory = async (items, session) => {
  await Promise.all(
    items.map((item) =>
      Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } },
        session ? { session } : undefined
      )
    )
  );
};

const persistOrder = async (payload, session) => {
  const [order] = await Order.create([payload], session ? { session } : undefined);

  await Customer.findByIdAndUpdate(
    payload.customer,
    { $addToSet: { orders: order._id } },
    session ? { session } : undefined
  );

  await Cart.deleteOne({ customer: payload.customer }, session ? { session } : undefined);

  return order;
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
  const payload = {
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
  };

  const existingOrder = await findExistingOrder({
    razorpayOrderId,
    razorpayPaymentId,
    customer,
  });

  if (existingOrder) {
    return existingOrder;
  }

  const session = await mongoose.startSession();

  try {
    let committedOrder = null;

    await session.withTransaction(async () => {
      const duplicateOrder = await findExistingOrder({
        razorpayOrderId,
        razorpayPaymentId,
        customer,
        session,
      });

      if (duplicateOrder) {
        committedOrder = duplicateOrder;
        return;
      }

      await reserveInventory(items, session);
      committedOrder = await persistOrder(payload, session);
    });

    return committedOrder;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const duplicateOrder = await findExistingOrder({
        razorpayOrderId,
        razorpayPaymentId,
        customer,
      });
      if (duplicateOrder) return duplicateOrder;
    }

    if (!usesUnsupportedTransactions(error)) {
      throw error;
    }
  } finally {
    await session.endSession();
  }

  const reservedItems = await reserveInventory(items);

  try {
    return await persistOrder(payload);
  } catch (error) {
    await restoreInventory(reservedItems);

    if (isDuplicateKeyError(error)) {
      const duplicateOrder = await findExistingOrder({
        razorpayOrderId,
        razorpayPaymentId,
        customer,
      });
      if (duplicateOrder) return duplicateOrder;
    }

    throw error;
  }
};
