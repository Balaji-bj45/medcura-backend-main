require("dotenv").config();
const app = require("./app");
const { connectToDatabase } = require("./config/database");
const { ensureBootstrapAdmin } = require("./services/authService");
const { ensureDefaultCategories } = require("./services/categoryService");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectToDatabase();
    console.log("MongoDB Connected");

    await ensureDefaultCategories();
    await ensureBootstrapAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error.message || error);

    if (error.cause) {
      console.error(error.cause);
    }

    process.exit(1);
  }
};

startServer();
