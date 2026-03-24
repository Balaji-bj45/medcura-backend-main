const mongoose = require("mongoose");

const specificationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },
    images: [
      {
        type: String,
      },
    ],
    video: {
      type: String,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    specifications: {
      type: [specificationSchema],
      default: [],
    },
    bestSeller: {
      type: Boolean,
      default: false,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 4.5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Legacy compatibility fields retained for old records.
    mrp: Number,
    salePrice: Number,
  },
  { timestamps: true }
);

productSchema.pre("validate", function syncLegacyPricing() {
  if (typeof this.price !== "number" && typeof this.mrp === "number") {
    this.price = this.mrp;
  }

  if (typeof this.discountPrice !== "number" && typeof this.salePrice === "number") {
    this.discountPrice = this.salePrice;
  }

  if (typeof this.mrp !== "number" && typeof this.price === "number") {
    this.mrp = this.price;
  }

  if (typeof this.salePrice !== "number" && typeof this.discountPrice === "number") {
    this.salePrice = this.discountPrice;
  }

  if (typeof this.discountPrice === "number" && this.discountPrice > this.price) {
    throw new Error("Discount price cannot be greater than price");
  }
});

productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ bestSeller: 1, featured: 1, isActive: 1 });
productSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Product", productSchema);
