const mongoose = require("mongoose");

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const buildMongoUri = () => {
  const directUri = process.env.MONGO_URI && process.env.MONGO_URI.trim();
  if (directUri) {
    return directUri;
  }

  const host = process.env.MONGO_HOST && process.env.MONGO_HOST.trim();
  const username = process.env.MONGO_USER && process.env.MONGO_USER.trim();
  const password = process.env.MONGO_PASSWORD;

  if (!host || !username || !password) {
    throw new Error(
      "MongoDB configuration is missing. Set MONGO_URI or provide MONGO_HOST, MONGO_USER, and MONGO_PASSWORD."
    );
  }

  const databaseName = (process.env.MONGO_DB_NAME || "").trim();
  const options = (process.env.MONGO_OPTIONS || "retryWrites=true&w=majority").trim();
  const normalizedHost = trimTrailingSlash(host);
  const authSegment = `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;
  const pathSegment = databaseName ? `/${encodeURIComponent(databaseName)}` : "/";
  const querySegment = options ? `?${options.replace(/^\?/, "")}` : "";

  return `${normalizedHost.startsWith("mongodb") ? normalizedHost : `mongodb+srv://${normalizedHost}`}`.replace(
    "://",
    `://${authSegment}@`
  ) + `${pathSegment}${querySegment}`;
};

const toFriendlyMongoError = (error) => {
  if (error && (error.code === 8000 || /bad auth/i.test(error.message || ""))) {
    return new Error(
      "MongoDB authentication failed. Verify the Atlas database username/password in MONGO_URI, or switch to MONGO_HOST, MONGO_USER, and MONGO_PASSWORD so the app can safely encode credentials."
    );
  }

  return error;
};

const connectToDatabase = async () => {
  try {
    const mongoUri = buildMongoUri();
    await mongoose.connect(mongoUri);
  } catch (error) {
    const friendlyError = toFriendlyMongoError(error);
    if (friendlyError !== error) {
      friendlyError.cause = error;
    }
    throw friendlyError;
  }
};

const disconnectFromDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

module.exports = {
  buildMongoUri,
  connectToDatabase,
  disconnectFromDatabase,
};
