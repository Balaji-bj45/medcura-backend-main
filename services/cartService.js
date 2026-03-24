const Cart = require("../models/Cart");
const Product = require("../models/Product");

const getEffectivePrice = (product) => {
  if (typeof product.discountPrice === "number") return product.discountPrice;
  if (typeof product.salePrice === "number") return product.salePrice;
  if (typeof product.price === "number") return product.price;
  return product.mrp || 0;
};

const getStock = (product) => (Number.isFinite(product?.stock) ? product.stock : 10);

const normalizeCartItem = (item) => {
  if (!item?.product) return item;
  const plainItem = typeof item.toObject === "function" ? item.toObject() : item;
  const product =
    typeof item.product.toObject === "function"
      ? item.product.toObject()
      : item.product;

  return {
    ...plainItem,
    product: {
      ...product,
      price: typeof product.price === "number" ? product.price : product.mrp,
      discountPrice:
        typeof product.discountPrice === "number"
          ? product.discountPrice
          : product.salePrice,
      effectivePrice: getEffectivePrice(product),
      stock: getStock(product),
    },
  };
};

const populateCart = async (cart) => {
  if (!cart) return null;
  const populated = await cart.populate("items.product");
  const items = Array.isArray(populated.items)
    ? populated.items.map(normalizeCartItem)
    : [];

  return {
    ...populated.toObject(),
    items,
  };
};

exports.getCart = async (customerId) => {
  const cart = await Cart.findOne({ customer: customerId });
  return populateCart(cart);
};

exports.addToCart = async (customerId, productId, quantity) => {
  const product = await Product.findById(productId);
  if (!product || !product.isActive)
    throw { statusCode: 404, message: "Product unavailable" };

  let cart = await Cart.findOne({ customer: customerId });

  if (!cart) {
    if (quantity > getStock(product)) {
      throw { statusCode: 400, message: "Requested quantity exceeds stock" };
    }

    cart = await Cart.create({
      customer: customerId,
      items: [{ product: productId, quantity }],
    });
    return populateCart(cart);
  }

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  if (existingItem) {
    const nextQuantity = existingItem.quantity + quantity;
    if (nextQuantity > getStock(product)) {
      throw { statusCode: 400, message: "Requested quantity exceeds stock" };
    }
    existingItem.quantity = nextQuantity;
  } else {
    if (quantity > getStock(product)) {
      throw { statusCode: 400, message: "Requested quantity exceeds stock" };
    }
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();
  return populateCart(cart);
};

exports.updateQuantity = async (customerId, productId, quantity) => {
  const cart = await Cart.findOne({ customer: customerId });
  if (!cart) throw { statusCode: 404, message: "Cart not found" };

  const item = cart.items.find(
    (i) => i.product.toString() === productId
  );

  if (!item) throw { statusCode: 404, message: "Item not found" };
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw { statusCode: 404, message: "Product unavailable" };
  }

  if (quantity > getStock(product)) {
    throw { statusCode: 400, message: "Requested quantity exceeds stock" };
  }

  item.quantity = quantity;

  await cart.save();
  return populateCart(cart);
};

exports.removeItem = async (customerId, productId) => {
  const cart = await Cart.findOne({ customer: customerId });
  if (!cart) throw { statusCode: 404, message: "Cart not found" };

  cart.items = cart.items.filter(
    (i) => i.product.toString() !== productId
  );

  await cart.save();
  return populateCart(cart);
};

exports.clearCart = async (customerId) => {
  await Cart.deleteOne({ customer: customerId });
};
