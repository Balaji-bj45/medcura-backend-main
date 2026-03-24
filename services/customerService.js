const Customer = require("../models/Customer");
const Otp = require("../models/Otp");
const crypto = require("crypto");
const transporter = require("../config/mailer");
const jwt = require("jsonwebtoken");
const Order = require("../models/Order");

const OTP_TTL_MINUTES = Number(process.env.CUSTOMER_OTP_TTL_MINUTES || 5);
const OTP_RESEND_COOLDOWN_SECONDS = Number(
  process.env.CUSTOMER_OTP_RESEND_COOLDOWN_SECONDS || 45
);
const OTP_MAX_ATTEMPTS = Number(process.env.CUSTOMER_OTP_MAX_ATTEMPTS || 5);

const normalizeEmail = (email = "") => email.trim().toLowerCase();
const getOtpTtlMs = () => OTP_TTL_MINUTES * 60 * 1000;
const getResendCooldownMs = () => OTP_RESEND_COOLDOWN_SECONDS * 1000;

const sanitizeCustomer = (customer) => ({
  id: customer._id,
  fullName: customer.fullName || customer.email?.split("@")?.[0] || "Customer",
  email: customer.email,
  addresses: customer.addresses || [],
  createdAt: customer.createdAt,
  updatedAt: customer.updatedAt,
});

const hashOtp = (otpCode) =>
  crypto.createHash("sha256").update(otpCode).digest("hex");

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const buildOtpMailHtml = ({ otp, purpose }) => {
  const action = purpose === "signup" ? "complete your MedCura sign up" : "log in to MedCura";
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fdff;padding:20px">
      <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #d9edf3;padding:24px">
        <h2 style="margin:0;color:#0e336b">MedCura Verification</h2>
        <p style="margin-top:12px;color:#35526f;line-height:1.5">
          Use this one-time password to ${action}:
        </p>
        <p style="margin:18px 0;font-size:30px;letter-spacing:6px;font-weight:700;color:#0e336b">
          ${otp}
        </p>
        <p style="margin:0;color:#5d758a;line-height:1.5">
          This OTP expires in ${OTP_TTL_MINUTES} minutes.
        </p>
      </div>
    </div>
  `;
};

exports.sendOtp = async ({ email, fullName, purpose = "login" }) => {
  const normalizedEmail = normalizeEmail(email);
  const existingCustomer = await Customer.findOne({ email: normalizedEmail });

  if (purpose === "signup" && existingCustomer) {
    throw {
      statusCode: 409,
      message: "An account with this email already exists. Please use login.",
    };
  }

  if (purpose === "login" && !existingCustomer) {
    throw {
      statusCode: 404,
      message: "No account found for this email. Please sign up first.",
    };
  }

  const existingOtp = await Otp.findOne({ email: normalizedEmail });
  const now = Date.now();

  if (existingOtp?.resendAvailableAt && existingOtp.resendAvailableAt.getTime() > now) {
    const retryAfterSeconds = Math.ceil(
      (existingOtp.resendAvailableAt.getTime() - now) / 1000
    );
    throw {
      statusCode: 429,
      message: `Please wait ${retryAfterSeconds} seconds before requesting a new OTP.`,
      retryAfterSeconds,
    };
  }

  const otpCode = generateOtp();
  const otpHash = hashOtp(otpCode);
  const expiresAt = new Date(now + getOtpTtlMs());
  const resendAvailableAt = new Date(now + getResendCooldownMs());

  await Otp.findOneAndUpdate(
    { email: normalizedEmail },
    {
      email: normalizedEmail,
      otpHash,
      purpose,
      pendingFullName: fullName?.trim() || undefined,
      attemptsRemaining: OTP_MAX_ATTEMPTS,
      resendAvailableAt,
      expiresAt,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: normalizedEmail,
    subject: "MedCura OTP Verification",
    text: `Your OTP is ${otpCode}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    html: buildOtpMailHtml({ otp: otpCode, purpose }),
  });

  return {
    resendAvailableInSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    otpExpiresInSeconds: OTP_TTL_MINUTES * 60,
  };
};

exports.verifyOtp = async ({ email, otpInput, fullName, purpose = "login" }) => {
  const normalizedEmail = normalizeEmail(email);
  const otpRecord = await Otp.findOne({ email: normalizedEmail });

  if (!otpRecord) {
    throw { statusCode: 400, message: "OTP not found. Please request a new OTP." };
  }

  if (otpRecord.expiresAt.getTime() < Date.now()) {
    await Otp.deleteOne({ _id: otpRecord._id });
    throw { statusCode: 400, message: "OTP expired. Please request a new OTP." };
  }

  const hashedInput = hashOtp(otpInput);

  if (hashedInput !== otpRecord.otpHash) {
    const nextAttempts = Math.max((otpRecord.attemptsRemaining || OTP_MAX_ATTEMPTS) - 1, 0);

    if (nextAttempts <= 0) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw {
        statusCode: 400,
        message: "Invalid OTP. Maximum attempts reached. Please request a new OTP.",
      };
    }

    otpRecord.attemptsRemaining = nextAttempts;
    await otpRecord.save();

    throw {
      statusCode: 400,
      message: `Invalid OTP. ${nextAttempts} attempt(s) remaining.`,
    };
  }

  if (purpose !== otpRecord.purpose) {
    throw {
      statusCode: 400,
      message: "OTP purpose mismatch. Please request a new OTP.",
    };
  }

  let customer = await Customer.findOne({ email: normalizedEmail });
  const now = new Date();
  let isNewUser = false;

  if (!customer) {
    if (purpose !== "signup") {
      throw { statusCode: 404, message: "No account found. Please sign up first." };
    }

    const resolvedFullName = (otpRecord.pendingFullName || fullName || "").trim();
    if (!resolvedFullName) {
      throw { statusCode: 400, message: "Full name is required to complete sign up." };
    }

    customer = await Customer.create({
      fullName: resolvedFullName,
      email: normalizedEmail,
      isVerified: true,
      lastLoginAt: now,
    });
    isNewUser = true;
  } else {
    customer.isVerified = true;
    customer.lastLoginAt = now;
    if (!customer.fullName) {
      customer.fullName = fullName?.trim() || normalizedEmail.split("@")[0] || "Customer";
    }
    await customer.save();
  }

  await Otp.deleteOne({ _id: otpRecord._id });

  const token = jwt.sign(
    { id: customer._id, role: "customer" },
    process.env.CUSTOMER_JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { token, customer: sanitizeCustomer(customer), isNewUser };
};

exports.getMyProfile = async (customerId) => {
  const customer = await Customer.findById(customerId).lean();
  if (!customer) {
    throw { statusCode: 404, message: "Customer not found" };
  }

  const recentOrders = await Order.find({ customer: customerId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("_id status amount createdAt")
    .lean();

  return {
    ...sanitizeCustomer(customer),
    orderCount: customer.orders?.length || 0,
    recentOrders,
  };
};

exports.updateMyProfile = async (customerId, payload) => {
  const fullName = payload.fullName.trim();

  const customer = await Customer.findByIdAndUpdate(
    customerId,
    { fullName },
    { new: true }
  );

  if (!customer) {
    throw { statusCode: 404, message: "Customer not found" };
  }

  return sanitizeCustomer(customer);
};

exports.addAddress = async (customerId, payload) => {
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw { statusCode: 404, message: "Customer not found" };
  }

  const nextAddress = {
    type: payload.type,
    label: payload.label?.trim() || "",
    line1: payload.line1.trim(),
    line2: payload.line2?.trim() || "",
    city: payload.city.trim(),
    state: payload.state.trim(),
    postalCode: payload.postalCode.trim(),
    country: payload.country.trim(),
    phone: payload.phone?.trim() || "",
    isDefault: Boolean(payload.isDefault),
  };

  if (nextAddress.isDefault) {
    customer.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  customer.addresses.push(nextAddress);
  await customer.save();
  return sanitizeCustomer(customer);
};

exports.updateAddress = async (customerId, addressId, payload) => {
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw { statusCode: 404, message: "Customer not found" };
  }

  const address = customer.addresses.id(addressId);
  if (!address) {
    throw { statusCode: 404, message: "Address not found" };
  }

  const fields = [
    "type",
    "label",
    "line1",
    "line2",
    "city",
    "state",
    "postalCode",
    "country",
    "phone",
  ];

  fields.forEach((field) => {
    if (payload[field] !== undefined) {
      address[field] = typeof payload[field] === "string" ? payload[field].trim() : payload[field];
    }
  });

  if (payload.isDefault !== undefined) {
    const makeDefault = Boolean(payload.isDefault);
    if (makeDefault) {
      customer.addresses.forEach((entry) => {
        entry.isDefault = false;
      });
      address.isDefault = true;
    } else {
      address.isDefault = false;
    }
  }

  await customer.save();
  return sanitizeCustomer(customer);
};

exports.deleteAddress = async (customerId, addressId) => {
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw { statusCode: 404, message: "Customer not found" };
  }

  const address = customer.addresses.id(addressId);
  if (!address) {
    throw { statusCode: 404, message: "Address not found" };
  }

  const wasDefault = address.isDefault;
  customer.addresses.pull(addressId);

  if (wasDefault && customer.addresses.length > 0) {
    customer.addresses[0].isDefault = true;
  }

  await customer.save();
  return sanitizeCustomer(customer);
};
