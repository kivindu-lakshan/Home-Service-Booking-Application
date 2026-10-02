const { randomInt } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { User, AuthToken } = require("../../models");
const { ok, fail } = require("../../utils/response");
const {
  signAccessToken,
  randomToken,
  hashToken,
} = require("../../utils/tokens");

const publicUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  emailVerified: user.emailVerified,
  status: user.status,
});
const publicProfile = (user) => ({
  ...publicUser(user),
  avatarUrl: user.avatarUrl || null,
});
const passwordError =
  "Password must be at least 8 characters and include a letter and a number.";

async function createAuthToken(user, type, minutes) {
  const raw = randomToken();
  await AuthToken.create({
    user: user._id,
    type,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + minutes * 60000),
  });
  console.log(`[SIMULATED EMAIL] ${type} token for ${user.email}: ${raw}`);
  return raw;
}

// Demo only: the code is displayed in the authenticated app, not emailed.
async function createVerificationCode(user) {
  const previous = await AuthToken.find({ user: user._id, type: "verify_email" });
  let code;
  do { code = String(randomInt(100000, 1000000)); }
  while (previous.some((record) => record.tokenHash === hashToken(code)));
  await AuthToken.updateMany({ user: user._id, type: "verify_email", usedAt: null },
    { $set: { usedAt: new Date() } });
  await AuthToken.create({ user: user._id, type: "verify_email", tokenHash: hashToken(code),
    expiresAt: new Date(Date.now() + 24 * 60 * 60000) });
  return code;
}

exports.register = async (req, res, next) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (await User.exists({ email }))
      return fail(res, 409, "An account with that email already exists.", [{ path: "email", msg: "This email is already registered. Please sign in." }]);
    const user = await User.create({
      fullName,
      email,
      phone,
      passwordHash: await bcrypt.hash(password, 12),
    });
    const verificationCode = await createVerificationCode(user);
    return ok(
      res,
      {
        user: publicUser(user),
        token: signAccessToken(user),
        verificationCode,
      },
      "Account created.",
    );
  } catch (error) {
    if (error.code === 11000 && (error.keyPattern?.email || error.keyValue?.email))
      return fail(res, 409, "An account with that email already exists.", [{ path: "email", msg: "This email is already registered. Please sign in." }]);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email }).select(
      "+passwordHash",
    );
    if (
      !user ||
      user.status !== "active" ||
      (req.body.role && user.role !== req.body.role) ||
      !(await bcrypt.compare(req.body.password, user.passwordHash))
    )
      return fail(
        res,
        401,
        "Invalid credentials for the selected account type.",
      );
    return ok(
      res,
      { user: publicUser(user), token: signAccessToken(user) },
      "Signed in.",
    );
  } catch (error) {
    next(error);
  }
};
exports.me = (req, res) => {
  res.set("Cache-Control", "no-store");
  return ok(res, publicProfile(req.user));
};
exports.updateMe = async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const changes = {};
    // Never pass the request body directly to MongoDB.
    if (Object.hasOwn(req.body, "fullName")) changes.fullName = req.body.fullName;
    if (Object.hasOwn(req.body, "phone")) changes.phone = req.body.phone;
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, status: "active" },
      { $set: changes },
      { new: true, runValidators: true },
    );
    if (!user) return fail(res, 401, "Your session is no longer active. Please sign in again.");
    return ok(res, publicProfile(user), "Profile updated successfully.");
  } catch {
    return fail(res, 500, "Unable to save your profile. Please try again.");
  }
};
exports.changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash)))
      return fail(res, 400, "Current password is incorrect.");
    user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await user.save();
    ok(res, null, "Password changed.");
  } catch (error) {
    next(error);
  }
};
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user && user.status === "active")
      await createAuthToken(user, "reset_password", 30);
    ok(res, null, "If an account exists, reset instructions have been sent.");
  } catch (error) {
    next(error);
  }
};
exports.resetPassword = async (req, res, next) => {
  try {
    const record = await AuthToken.findOne({
      tokenHash: hashToken(req.body.token),
      type: "reset_password",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!record) return fail(res, 400, "Invalid or expired reset token.");
    await User.findByIdAndUpdate(record.user, {
      passwordHash: await bcrypt.hash(req.body.newPassword, 12),
    });
    record.usedAt = new Date();
    await record.save();
    ok(res, null, "Password reset.");
  } catch (error) {
    next(error);
  }
};
exports.verifyEmail = async (req, res, next) => {
  try {
    const record = await AuthToken.findOneAndUpdate({
      user: req.user._id,
      tokenHash: hashToken(req.body.code),
      type: "verify_email",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    }, { $set: { usedAt: new Date() } });
    if (!record) return fail(res, 400, "Incorrect or expired code. Please try again or resend a code.");
    const user = await User.findByIdAndUpdate(req.user._id, { emailVerified: true }, { new: true });
    res.set("Cache-Control", "no-store");
    ok(res, publicProfile(user), "Demo email verification completed.");
  } catch (error) {
    next(error);
  }
};
exports.resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.emailVerified) return ok(res, null, "Email is already verified.");
    const verificationCode = await createVerificationCode(user);
    ok(
      res,
      { verificationCode },
      "A new demo verification code was generated. No email was sent.",
    );
  } catch (error) {
    next(error);
  }
};
exports.deleteMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!(await bcrypt.compare(req.body.password, user.passwordHash)))
      return fail(res, 400, "Password is incorrect.");
    user.status = "deleted";
    await user.save();
    ok(res, null, "Account deleted.");
  } catch (error) {
    next(error);
  }
};
exports.passwordError = passwordError;
