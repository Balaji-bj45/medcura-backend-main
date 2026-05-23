require("dotenv").config();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
  connectToDatabase,
  disconnectFromDatabase,
} = require("../config/database");

const getArgValue = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1 || !process.argv[index + 1]) {
    return null;
  }
  return process.argv[index + 1];
  
};

const run = async () => {
  const email =
    getArgValue("--email") ||
    process.env.ADMIN_BOOTSTRAP_EMAIL ||
    process.env.ADMIN_EMAIL;
  const password =
    getArgValue("--password") ||
    process.env.ADMIN_BOOTSTRAP_PASSWORD ||
    process.env.ADMIN_PASSWORD;
  const name = getArgValue("--name") || "Medcura Admin";

  if (!email || !password) {
    throw new Error(
      "Missing credentials. Use --email and --password or set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD."
    );
  }

  await connectToDatabase();

  const hashedPassword = await bcrypt.hash(password, 12);
  const normalizedEmail = email.trim().toLowerCase();

  await User.updateOne(
    { email: normalizedEmail },
    {
      $set: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "admin",
        isActive: true,
        failedLoginAttempts: 0,
        lockUntil: null,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  console.log(`Admin credentials set for ${normalizedEmail}`);
};

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectFromDatabase();
  });
