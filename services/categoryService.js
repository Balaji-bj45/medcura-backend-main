const Category = require("../models/Category");
const { DEFAULT_CATEGORIES } = require("../constants/catalog");

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

exports.ensureDefaultCategories = async () => {
  const operations = DEFAULT_CATEGORIES.map((item) => ({
    updateOne: {
      filter: { slug: item.slug },
      update: {
        $setOnInsert: {
          name: item.name,
          slug: item.slug,
          icon: item.icon,
          description: item.description,
          sortOrder: item.sortOrder,
          isActive: true,
        },
      },
      upsert: true,
    },
  }));

  await Category.bulkWrite(operations);
};

exports.getCategories = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  return Category.find(filter).sort({ sortOrder: 1, name: 1 });
};

exports.createCategory = async (payload) => {
  const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);
  return Category.create({
    ...payload,
    slug,
  });
};

exports.updateCategory = async (id, payload) => {
  const updates = { ...payload };
  if (updates.slug) {
    updates.slug = slugify(updates.slug);
  }

  if (updates.name && !updates.slug) {
    updates.slug = slugify(updates.name);
  }

  return Category.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
};

exports.deleteCategory = async (id) => {
  return Category.findByIdAndUpdate(id, { isActive: false }, { new: true });
};
