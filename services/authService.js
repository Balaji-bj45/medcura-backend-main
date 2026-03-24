const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const transporter = require("../config/mailer");

const AUTH_MAX_FAILED_LOGINS = Number(process.env.AUTH_MAX_FAILED_LOGINS || 5);
const AUTH_LOCK_MINUTES = Number(process.env.AUTH_LOCK_MINUTES || 15);
const AUTH_RESET_TOKEN_TTL_MINUTES = Number(process.env.AUTH_RESET_TOKEN_TTL_MINUTES || 15);

const getLockMs = () => AUTH_LOCK_MINUTES * 60 * 1000;
const getResetTokenTtlMs = () => AUTH_RESET_TOKEN_TTL_MINUTES * 60 * 1000;

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  mustChangePassword: user.mustChangePassword,
});

const buildResetUrl = (token) => {
  const base = process.env.ADMIN_RESET_URL || "http://localhost:5173/admin/reset-password";
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(token)}`;
};

const buildLockMessage = (lockUntil) => {
  const remainingMs = new Date(lockUntil).getTime() - Date.now();
  const remainingMinutes = Math.ceil(Math.max(remainingMs, 0) / 60000);
  return `Account locked due to repeated failed logins. Try again in ${remainingMinutes} minute(s).`;
};

exports.loginAdmin = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.isActive) {
    throw { statusCode: 401, message: "Invalid credentials" };
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw { statusCode: 423, message: buildLockMessage(user.lockUntil) };
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    const updates = { $inc: { failedLoginAttempts: 1 } };
    const nextAttempts = (user.failedLoginAttempts || 0) + 1;

    if (nextAttempts >= AUTH_MAX_FAILED_LOGINS) {
      updates.$set = { lockUntil: new Date(Date.now() + getLockMs()) };
      updates.$inc.failedLoginAttempts = 0;
    }

    await User.updateOne({ _id: user._id }, updates);
    throw { statusCode: 401, message: "Invalid credentials" };
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: { failedLoginAttempts: 0, lockUntil: null, lastLoginAt: new Date() },
    }
  );

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return { token, user: sanitizeUser(user) };
};

exports.forgotPassword = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail, isActive: true });

  if (!user) {
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  user.resetPasswordTokenHash = tokenHash;
  user.resetPasswordExpiresAt = new Date(Date.now() + getResetTokenTtlMs());
  await user.save();

  const resetUrl = buildResetUrl(rawToken);
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Medcura Admin Password Reset",
    text: `Use this link to reset your admin password: ${resetUrl}\nThis link expires in ${AUTH_RESET_TOKEN_TTL_MINUTES} minutes.`,
  });
};

exports.resetPassword = async (token, newPassword) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
    isActive: true,
  });

  if (!user) {
    throw { statusCode: 400, message: "Invalid or expired reset token" };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  user.password = hashedPassword;
  user.passwordChangedAt = new Date();
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.mustChangePassword = false;
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpiresAt = null;
  await user.save();
};

exports.ensureBootstrapAdmin = async () => {
  if (process.env.ALLOW_ADMIN_BOOTSTRAP !== "true") {
    return;
  }

  const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!bootstrapEmail || !bootstrapPassword) {
    console.warn("Admin bootstrap skipped: missing ADMIN_BOOTSTRAP_EMAIL or ADMIN_BOOTSTRAP_PASSWORD");
    return;
  }

  const existingAdmin = await User.findOne({ role: "admin" });

  if (existingAdmin) {
    return;
  }

  const hashedPassword = await bcrypt.hash(bootstrapPassword, 12);
  await User.create({
    name: "Medcura Admin",
    email: bootstrapEmail,
    password: hashedPassword,
    role: "admin",
    mustChangePassword: true,
  });

  console.log(`Bootstrap admin created for ${bootstrapEmail}`);
};
