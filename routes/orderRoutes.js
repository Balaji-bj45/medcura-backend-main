const express = require("express");
const router = express.Router();
const controller = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { customerProtect } = require("../middleware/customerAuth");

// Customer - Create Razorpay order
router.post("/create", customerProtect, controller.createRazorpayOrder);

// Customer - Verify payment
router.post("/verify", customerProtect, controller.verifyPayment);

// Customer - My Orders
router.get("/my", customerProtect, controller.getMyOrders);
router.get("/my/:id", customerProtect, controller.getMyOrderById);

// Admin routes
router.get("/", protect, adminOnly, controller.getAllOrders);
router.get("/:id", protect, adminOnly, controller.getOrderById);
router.patch("/:id/status", protect, adminOnly, controller.updateOrderStatus);

module.exports = router;
