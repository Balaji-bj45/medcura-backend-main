const express = require("express");
const router = express.Router();
const { login, forgotPassword, resetPassword } = require("../controllers/authController");
const { authLoginLimiter } = require("../middleware/rateLimiters");

router.post("/login", authLoginLimiter, login);
router.post("/forgot-password", authLoginLimiter, forgotPassword);
router.post("/reset-password", authLoginLimiter, resetPassword);

module.exports = router;
