const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../config/multer");

// Public
router.get("/", productController.getAll);

// Admin only
router.get("/admin/all", protect, adminOnly, (req, res, next) => {
  req.forceIncludeInactive = true;
  return productController.getAll(req, res, next);
});

router.post(
  "/",
  protect,
  adminOnly,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
  ]),
  productController.create
);

router.put(
  "/:id",
  protect,
  adminOnly,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
  ]),
  productController.update
);

router.delete("/:id", protect, adminOnly, productController.remove);

router.get("/:id", productController.getOne);

module.exports = router;
