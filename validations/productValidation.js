const Joi = require("joi");

const specificationSchema = Joi.object({
  key: Joi.string().trim().min(1).required(),
  value: Joi.string().trim().min(1).required(),
});

const baseProductSchema = {
  name: Joi.string().trim().min(3).required(),
  description: Joi.string().trim().min(10).required(),
  category: Joi.string().trim().min(2).required(),
  price: Joi.number().positive().required(),
  discountPrice: Joi.number().min(0).allow(null).optional(),
  // Legacy compatibility fields from previous admin forms.
  mrp: Joi.number().positive().optional(),
  salePrice: Joi.number().min(0).allow(null).optional(),
  stock: Joi.number().integer().min(0).required(),
  images: Joi.array().items(Joi.string()).min(1).required(),
  video: Joi.string().allow(null, "").optional(),
  specifications: Joi.array().items(specificationSchema).default([]),
  bestSeller: Joi.boolean().optional(),
  featured: Joi.boolean().optional(),
  rating: Joi.number().min(0).max(5).optional(),
  isActive: Joi.boolean().optional(),
};

const withPriceCheck = (schema) =>
  schema.custom((value, helpers) => {
    if (
      typeof value.discountPrice === "number" &&
      value.discountPrice > value.price
    ) {
      return helpers.message("Discount price cannot be greater than price");
    }
    return value;
  });

exports.createProductSchema = withPriceCheck(Joi.object(baseProductSchema));
exports.updateProductSchema = withPriceCheck(Joi.object(baseProductSchema));
