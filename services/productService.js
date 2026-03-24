const Product = require("../models/Product");

exports.createProduct = async (data) => {
  return Product.create(data);
};

exports.getAllProducts = async ({
  category,
  includeInactive = false,
  featured,
  bestSeller,
  search,
  minPrice,
  maxPrice,
  sort = "latest",
  limit,
} = {}) => {
  const filter = {};

  if (!includeInactive) {
    filter.isActive = true;
  }

  if (category) {
    filter.category = category;
  }

  if (typeof featured === "boolean") {
    filter.featured = featured;
  }

  if (typeof bestSeller === "boolean") {
    filter.bestSeller = bestSeller;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  if (typeof minPrice === "number" || typeof maxPrice === "number") {
    filter.price = {};
    if (typeof minPrice === "number") filter.price.$gte = minPrice;
    if (typeof maxPrice === "number") filter.price.$lte = maxPrice;
  }

  const sortMap = {
    latest: { createdAt: -1 },
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
    rating: { rating: -1, createdAt: -1 },
    popular: { bestSeller: -1, featured: -1, createdAt: -1 },
    "stock-desc": { stock: -1, createdAt: -1 },
  };

  const query = Product.find(filter).sort(sortMap[sort] || sortMap.latest);

  if (Number.isFinite(limit) && limit > 0) {
    query.limit(limit);
  }

  return query;
};

exports.getProductById = async (id) => {
  return Product.findById(id);
};

exports.updateProduct = async (id, data) => {
  return Product.findByIdAndUpdate(id, data, { new: true });
};

exports.deleteProduct = async (id) => {
  return Product.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
};
