const Product = require("../models/Product");

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 48;

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
  page,
  pageSize,
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

  const projection =
    "name category description price discountPrice mrp salePrice stock images video rating bestSeller featured isActive specifications createdAt updatedAt";
  const query = Product.find(filter)
    .sort(sortMap[sort] || sortMap.latest)
    .select(projection);

  const normalizedPage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : null;
  const normalizedPageSize = Number.isFinite(pageSize)
    ? Math.min(Math.max(1, Math.trunc(pageSize)), MAX_PAGE_SIZE)
    : null;
  const wantsPagination = normalizedPage !== null || normalizedPageSize !== null;

  if (wantsPagination) {
    const currentPage = normalizedPage || 1;
    const currentPageSize = normalizedPageSize || DEFAULT_PAGE_SIZE;
    const skip = (currentPage - 1) * currentPageSize;

    const [items, total] = await Promise.all([
      query.skip(skip).limit(currentPageSize).lean(),
      Product.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: currentPage,
      pageSize: currentPageSize,
      hasMore: skip + items.length < total,
    };
  }

  if (Number.isFinite(limit) && limit > 0) {
    query.limit(limit);
  }

  return query.lean();
};

exports.getProductById = async (id) => {
  return Product.findById(id);
};

exports.updateProduct = async (id, data) => {
  return Product.findByIdAndUpdate(id, data, { new: true });
};

exports.deleteProduct = async (id) => {
  return Product.findByIdAndDelete(id);
};
