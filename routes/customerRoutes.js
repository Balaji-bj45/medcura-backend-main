const express = require("express");
const router = express.Router();
const controller = require("../controllers/customerController");
const { customerProtect } = require("../middleware/customerAuth");
const {
  authLoginLimiter,
  customerOtpSendLimiter,
  customerOtpVerifyLimiter,
} = require("../middleware/rateLimiters");

router.post("/register", authLoginLimiter, controller.registerWithPassword);
router.post("/login", authLoginLimiter, controller.loginWithPassword);
router.post("/forgot-password", authLoginLimiter, controller.forgotPassword);
router.post("/reset-password", authLoginLimiter, controller.resetPassword);
router.post("/send-otp", customerOtpSendLimiter, controller.sendOtp);
router.post("/request-otp", customerOtpSendLimiter, controller.sendOtp);
router.post("/verify-otp", customerOtpVerifyLimiter, controller.verifyOtp);
router.post("/google-auth", controller.googleAuth);
router.get("/me", customerProtect, controller.getMe);
router.patch("/me", customerProtect, controller.updateProfile);
router.post("/addresses", customerProtect, controller.addAddress);
router.put("/addresses/:addressId", customerProtect, controller.updateAddress);
router.delete("/addresses/:addressId", customerProtect, controller.deleteAddress);

module.exports = router;
