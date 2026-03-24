const express = require("express");
const router = express.Router();
const controller = require("../controllers/cartController");
const { customerProtect } = require("../middleware/customerAuth");

// All cart routes require customer authentication
router.get("/", customerProtect, controller.getCart);
router.post("/", customerProtect, controller.add);
router.put("/:productId", customerProtect, controller.updateQuantity);
router.delete("/:productId", customerProtect, controller.remove);

module.exports = router;
