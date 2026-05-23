require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");
const path = require("path");
const errorHandler = require("./middleware/errorhandler");
const { globalLimiter } = require("./middleware/rateLimiters");
const { ensureBootstrapAdmin } = require("./services/authService");
const { ensureDefaultCategories } = require("./services/categoryService");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const customerRoutes = require("./routes/customerRoutes");
const app = express();

const defaultAllowedOrigins = [
  "http://localhost:5173", 
  "https://medcura.care",
  "https://www.medcura.care",
];

const allowedOrigins = (
  process.env.CORS_ORIGINS || defaultAllowedOrigins.join(",")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use("/api", globalLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/services", serviceRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use(errorHandler);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected");
    await ensureDefaultCategories();
    await ensureBootstrapAdmin();
  })
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.json({ success: true, message: "API Running" });
});


module.exports = app;
