const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", categoryController.getAll);

router.post("/", protect, adminOnly, categoryController.create);
router.put("/:id", protect, adminOnly, categoryController.update);
router.delete("/:id", protect, adminOnly, categoryController.remove);

module.exports = router;
