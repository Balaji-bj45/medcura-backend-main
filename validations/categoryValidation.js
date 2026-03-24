const Joi = require("joi");

const baseSchema = {
  name: Joi.string().trim().min(2).required(),
  slug: Joi.string().trim().min(3).optional(),
  description: Joi.string().trim().allow("").optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
};

exports.createCategorySchema = Joi.object(baseSchema);
exports.updateCategorySchema = Joi.object(baseSchema);
