const express = require("express");
const router = express.Router();
const controller = require("../controllers/serviceEnquiryController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Public route
router.post("/", controller.create);

// Admin only
router.get("/", protect, adminOnly, controller.getAll);
router.put("/:id", protect, adminOnly, controller.updateStatus);

module.exports = router;
