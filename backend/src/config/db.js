const mongoose = require("mongoose");
const { models } = require("../models");

async function connectDatabase() {
  if (
    !process.env.MONGODB_URI ||
    process.env.MONGODB_URI.includes("<db_password>")
  ) {
    throw new Error(
      "MONGODB_URI still contains <db_password>. Replace it with the Atlas password for supplier_management; URL-encode special characters.",
    );
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");
  await Promise.all(Object.values(models).map((model) => model.syncIndexes()));
  console.log("All collections ready");
}

module.exports = connectDatabase;
