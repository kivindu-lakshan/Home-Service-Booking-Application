const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.get("/api/health", (req, res) =>
  res.json({
    success: true,
    data: { service: "home-service-api" },
    message: "Healthy",
  }),
);
app.use("/api/auth", authLimit, require("./routes/auth/auth.routes"));
app.use("/api/addresses", require("./routes/address/address.routes"));
app.use("/api/support", require("./routes/support/support.routes"));
app.use("/api/payments", require("./routes/payment/payment.routes"));
app.use("/api/reviews", require("./routes/review/review.routes"));
app.use("/api/tickets", require("./routes/ticket/ticket.routes"));
app.use("/api/admin", require("./routes/admin/admin.routes"));
app.use(errorHandler);
module.exports = app;
