const productService = require("../services/productService");
const {
  createProductSchema,
  updateProductSchema,
} = require("../validations/productValidation");
const { successResponse } = require("../utils/apiResponse");

const normalizeMediaPath = (filePath) => {
  if (!filePath) return filePath;
  const normalized = filePath.replace(/\\/g, "/").trim();

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  if (normalized.startsWith("/uploads/products/")) {
    return normalized.replace("/uploads/products/", "/uploads/Products/");
  }

  if (normalized.startsWith("/uploads/Products/")) {
    return normalized;
  }

  if (normalized.startsWith("uploads/products/")) {
    return `/${normalized.replace("uploads/products/", "uploads/Products/")}`;
  }

  if (normalized.startsWith("uploads/Products/")) {
    return `/${normalized}`;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  return `/uploads/Products/${normalized}`;
};

const normalizeProductMedia = (product) => {
  if (!product) return product;
  const plain = typeof product.toObject === "function" ? product.toObject() : product;
  const price = typeof plain.price === "number" ? plain.price : plain.mrp;
  const discountPrice =
    typeof plain.discountPrice === "number" ? plain.discountPrice : plain.salePrice;
  const effectivePrice =
    typeof discountPrice === "number" && discountPrice > 0 ? discountPrice : price;

  return {
    ...plain,
    price,
    discountPrice,
    mrp: price,
    salePrice: effectivePrice,
    effectivePrice,
    stock: Number.isFinite(plain.stock) ? plain.stock : 10,
    bestSeller: Boolean(plain.bestSeller),
    featured: Boolean(plain.featured),
    rating: Number.isFinite(plain.rating) ? plain.rating : 0,
    specifications: Array.isArray(plain.specifications) ? plain.specifications : [],
    images: Array.isArray(plain.images) ? plain.images.map(normalizeMediaPath) : [],
    video: normalizeMediaPath(plain.video),
  };
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const parseNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseSpecifications = (input) => {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((item) => ({
        key: item?.key?.toString().trim(),
        value: item?.value?.toString().trim(),
      }))
      .filter((item) => item.key && item.value);
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => ({
            key: item?.key?.toString().trim(),
            value: item?.value?.toString().trim(),
          }))
          .filter((item) => item.key && item.value);
      }
    } catch (error) {
      const linePairs = trimmed
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [key, ...rest] = line.split(":");
          return {
            key: key?.trim(),
            value: rest.join(":").trim(),
          };
        })
        .filter((item) => item.key && item.value);

      return linePairs;
    }
  }

  return [];
};

const mapUploadedMedia = (req, fallbackImages = [], fallbackVideo = null) => {
  const hasNewImages = Array.isArray(req.files?.images) && req.files.images.length > 0;
  const hasNewVideo = Array.isArray(req.files?.video) && req.files.video.length > 0;

  const images = hasNewImages
    ? req.files.images.map((file) => normalizeMediaPath(`/uploads/Products/${file.filename}`))
    : (fallbackImages || []).map(normalizeMediaPath);

  const video = hasNewVideo
    ? normalizeMediaPath(`/uploads/Products/${req.files.video[0].filename}`)
    : normalizeMediaPath(fallbackVideo);

  return { images, video };
};

exports.create = async (req, res, next) => {
  try {
    const { images, video } = mapUploadedMedia(req, [], null);
    const price = parseNumber(req.body.price ?? req.body.mrp);
    const discountPriceRaw = req.body.discountPrice ?? req.body.salePrice;
    const parsedDiscountPrice =
      discountPriceRaw === undefined || discountPriceRaw === ""
        ? null
        : parseNumber(discountPriceRaw, null);
    const rating = parseNumber(req.body.rating, 4.5);

    const productData = {
      name: req.body.name,
      description: req.body.description,
      price,
      discountPrice: parsedDiscountPrice,
      mrp: price,
      salePrice: parsedDiscountPrice ?? price,
      stock: parseNumber(req.body.stock, 10),
      category: req.body.category,
      bestSeller: parseBoolean(req.body.bestSeller, false),
      featured: parseBoolean(req.body.featured, false),
      rating,
      specifications: parseSpecifications(req.body.specifications),
      images,
      video,
      isActive: parseBoolean(req.body.isActive, true),
    };

    const { error } = createProductSchema.validate(productData);
    if (error)
      throw { statusCode: 400, message: error.details[0].message };

    const product = await productService.createProduct(productData);

    return successResponse(res, 201, normalizeProductMedia(product), "Product created");
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const {
      category,
      includeInactive,
      featured,
      bestSeller,
      search,
      minPrice,
      maxPrice,
      sort,
      limit,
    } = req.query;
    const isAdminRequest = req.user?.role === "admin";
    const forceIncludeInactive = req.forceIncludeInactive === true;

    const products = await productService.getAllProducts({
      category,
      includeInactive:
        isAdminRequest && (forceIncludeInactive || includeInactive === "true"),
      featured: featured === undefined ? undefined : parseBoolean(featured),
      bestSeller: bestSeller === undefined ? undefined : parseBoolean(bestSeller),
      search: search?.trim(),
      minPrice: minPrice !== undefined ? parseNumber(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? parseNumber(maxPrice) : undefined,
      sort,
      limit: limit !== undefined ? parseInt(limit, 10) : undefined,
    });

    return successResponse(res, 200, products.map(normalizeProductMedia), "Products fetched");
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);

    if (!product)
      throw { statusCode: 404, message: "Product not found" };

    return successResponse(res, 200, normalizeProductMedia(product), "Product fetched");
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await productService.getProductById(req.params.id);
    if (!existing)
      throw { statusCode: 404, message: "Product not found" };

    const { images, video } = mapUploadedMedia(
      req,
      existing.images || [],
      existing.video || null
    );
    const price = parseNumber(req.body.price ?? req.body.mrp, existing.price ?? existing.mrp);
    const discountPriceInput = req.body.discountPrice ?? req.body.salePrice;
    const discountPrice =
      discountPriceInput === undefined || discountPriceInput === ""
        ? existing.discountPrice ?? existing.salePrice ?? null
        : parseNumber(discountPriceInput, null);

    const payload = {
      name: req.body.name,
      description: req.body.description,
      price,
      discountPrice,
      mrp: price,
      salePrice: discountPrice ?? price,
      stock: parseNumber(req.body.stock, existing.stock ?? 10),
      category: req.body.category,
      bestSeller: parseBoolean(req.body.bestSeller, existing.bestSeller),
      featured: parseBoolean(req.body.featured, existing.featured),
      rating: parseNumber(req.body.rating, existing.rating ?? 4.5),
      isActive: parseBoolean(req.body.isActive, existing.isActive),
      specifications:
        req.body.specifications !== undefined
          ? parseSpecifications(req.body.specifications)
          : existing.specifications || [],
      images,
      video,
    };

    const { error } = updateProductSchema.validate(payload);
    if (error)
      throw { statusCode: 400, message: error.details[0].message };

    const product = await productService.updateProduct(req.params.id, payload);

    return successResponse(res, 200, normalizeProductMedia(product), "Product updated");
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);

    return successResponse(res, 200, null, "Product deleted");
  } catch (err) {
    next(err);
  }
};
