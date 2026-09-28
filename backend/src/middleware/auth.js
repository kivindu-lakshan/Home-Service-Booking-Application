const jwt = require("jsonwebtoken");
const { User } = require("../models");

module.exports = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!token)
      return res
        .status(401)
        .json({
          success: false,
          data: null,
          message: "Authentication required",
        });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user || user.status !== "active")
      return res
        .status(401)
        .json({ success: false, data: null, message: "Invalid session" });
    req.user = user;
    next();
  } catch (error) {
    res
      .status(401)
      .json({ success: false, data: null, message: "Invalid session" });
  }
};
