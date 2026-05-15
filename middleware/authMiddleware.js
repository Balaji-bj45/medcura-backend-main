const jwt = require("jsonwebtoken");

const attachUserFromToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  return true;
};

exports.protect = (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Not authorized",
    });
  }

  try {
    attachUserFromToken(req);
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

exports.optionalProtect = (req, res, next) => {
  try {
    attachUserFromToken(req);
  } catch (err) {
    req.user = undefined;
  }

  next();
};

exports.adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};
