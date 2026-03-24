const rateLimit = require("express-rate-limit");

const GLOBAL_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const GLOBAL_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 1000);
const AUTH_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const AUTH_MAX_REQUESTS = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 20);
const CUSTOMER_OTP_SEND_WINDOW_MS = Number(
  process.env.CUSTOMER_OTP_SEND_WINDOW_MS || 10 * 60 * 1000
);
const CUSTOMER_OTP_SEND_MAX_REQUESTS = Number(
  process.env.CUSTOMER_OTP_SEND_MAX_REQUESTS || 8
);
const CUSTOMER_OTP_VERIFY_WINDOW_MS = Number(
  process.env.CUSTOMER_OTP_VERIFY_WINDOW_MS || 10 * 60 * 1000
);
const CUSTOMER_OTP_VERIFY_MAX_REQUESTS = Number(
  process.env.CUSTOMER_OTP_VERIFY_MAX_REQUESTS || 30
);

const isLocalIp = (ip = "") =>
  ip === "127.0.0.1" ||
  ip === "::1" ||
  ip === "::ffff:127.0.0.1" ||
  ip.startsWith("::ffff:192.168.") ||
  ip.startsWith("::ffff:10.") ||
  ip.startsWith("::ffff:172.");

exports.globalLimiter = rateLimit({
  windowMs: GLOBAL_WINDOW_MS,
  max: GLOBAL_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== "production" && isLocalIp(req.ip),
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

exports.authLoginLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

exports.customerOtpSendLimiter = rateLimit({
  windowMs: CUSTOMER_OTP_SEND_WINDOW_MS,
  max: CUSTOMER_OTP_SEND_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please wait before requesting again.",
  },
});

exports.customerOtpVerifyLimiter = rateLimit({
  windowMs: CUSTOMER_OTP_VERIFY_WINDOW_MS,
  max: CUSTOMER_OTP_VERIFY_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP verification attempts. Please try again later.",
  },
});
