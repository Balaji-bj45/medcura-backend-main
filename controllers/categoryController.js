const categoryService = require("../services/categoryService");
const {
  createCategorySchema,
  updateCategorySchema,
} = require("../validations/categoryValidation");
const { successResponse } = require("../utils/apiResponse");

const serializeCategory = (category) => {
  const plain = typeof category?.toObject === "function" ? category.toObject() : category;
  if (!plain) return plain;
  const { icon, ...rest } = plain;
  return rest;
};

exports.getAll = async (req, res, next) => {
  try {
    const includeInactive =
      req.user?.role === "admin" && req.query.includeInactive === "true";
    const categories = await categoryService.getCategories({ includeInactive });
    return successResponse(res, 200, categories.map(serializeCategory), "Categories fetched");
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { error } = createCategorySchema.validate(req.body);
    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    const category = await categoryService.createCategory(req.body);
    return successResponse(res, 201, serializeCategory(category), "Category created");
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { error } = updateCategorySchema.validate(req.body);
    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    const category = await categoryService.updateCategory(req.params.id, req.body);
    if (!category) {
      throw { statusCode: 404, message: "Category not found" };
    }

    return successResponse(res, 200, serializeCategory(category), "Category updated");
  } catch (err) {
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const category = await categoryService.deleteCategory(req.params.id);
    if (!category) {
      throw { statusCode: 404, message: "Category not found" };
    }

    return successResponse(res, 200, serializeCategory(category), "Category deactivated");
  } catch (err) {
    return next(err);
  }
};
