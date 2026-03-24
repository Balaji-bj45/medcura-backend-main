const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");

exports.customerProtect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer "))
      throw { statusCode: 401, message: "Not authorized" };

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.CUSTOMER_JWT_SECRET
    );

    const customer = await Customer.findById(decoded.id);

    if (!customer)
      throw { statusCode: 401, message: "Customer not found" };

    req.customer = customer;

    next();
  } catch (err) {
    next(err);
  }
};
