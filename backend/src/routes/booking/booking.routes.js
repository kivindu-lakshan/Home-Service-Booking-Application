const router = require("express").Router();
const auth = require("../../middleware/auth");
const { Booking } = require("../../models");
const send = (res, data) =>
  res.json({ success: true, data, message: "Success" });

router.use(auth);
router.get("/mine", async (req, res, next) => {
  try {
    return send(
      res,
      await Booking.find({ customer: req.user._id })
        .populate("service provider")
        .sort({ scheduledDate: -1 }),
    );
  } catch (error) {
    return next(error);
  }
});
router.get("/:id", async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      customer: req.user._id,
    }).populate("service provider");
    if (!booking)
      return res
        .status(404)
        .json({ success: false, data: null, message: "Booking not found" });
    return send(res, booking);
  } catch (error) {
    return next(error);
  }
});
module.exports = router;
