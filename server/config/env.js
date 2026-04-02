const dotenv = require("dotenv");

dotenv.config({ quiet: true });

module.exports = {
  PORT: Number(process.env.PORT) || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET || "skillcache-development-secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
};
