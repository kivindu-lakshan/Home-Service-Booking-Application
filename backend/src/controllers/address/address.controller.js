const { Types } = require("mongoose");
const { User } = require("../../models");
const { ok, fail } = require("../../utils/response");

const safeAddress = (address) => ({
  _id: address._id,
  label: address.label || "",
  line1: address.line1 || "",
  areaCity: address.areaCity || "",
  landmark: address.landmark || "",
  isDefault: Boolean(address.isDefault),
  createdAt: address.createdAt || null,
  updatedAt: address.updatedAt || null,
});
const ownedAddress = (addresses, id) => addresses.find((address) => String(address._id) === id);
const fieldsFrom = (body) => Object.fromEntries(
  ["label", "line1", "areaCity", "landmark", "isDefault"]
    .filter((key) => Object.hasOwn(body, key)).map((key) => [key, body[key]]),
);

exports.list = (req, res) => ok(res,
  (req.user.addresses || []).map(safeAddress).sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
);
exports.read = (req, res) => {
  const address = ownedAddress(req.user.addresses || [], req.params.id);
  if (!address) return fail(res, 404, "Address not found.");
  return ok(res, safeAddress(address));
};

// Keep one default while there are addresses. No other user's document is accessed.
function chooseDefault(addresses, preferredId, now) {
  const selected = ownedAddress(addresses, preferredId) || addresses.find((address) => address.isDefault) || addresses[0];
  for (const address of addresses) {
    const isDefault = address === selected;
    if (Boolean(address.isDefault) !== isDefault) address.updatedAt = now;
    address.isDefault = isDefault;
  }
}

async function mutate(req, res, operation) {
  const newId = new Types.ObjectId();
  try {
    // Compare-and-swap on the existing version key prevents lost array/default updates.
    // Retry from a fresh snapshot if another address request won the write.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const user = await User.findOne({ _id: req.user._id, status: "active" }).select("addresses __v").lean();
      if (!user) return fail(res, 401, "Your session is no longer active. Please sign in again.");
      const addresses = (user.addresses || []).map((address) => ({ ...address }));
      const now = new Date();
      let target;
      if (operation === "create") {
        target = { ...fieldsFrom(req.body), _id: newId, landmark: req.body.landmark || "", createdAt: now, updatedAt: now };
        addresses.push(target);
      } else {
        target = ownedAddress(addresses, req.params.id);
        if (!target) return fail(res, 404, "Address not found.");
        if (operation === "delete") addresses.splice(addresses.indexOf(target), 1);
        else Object.assign(target, fieldsFrom(req.body), { updatedAt: now });
      }
      const preferredId = operation !== "delete" && target.isDefault ? String(target._id) : undefined;
      chooseDefault(addresses, preferredId, now);
      const saved = await User.findOneAndUpdate(
        { _id: req.user._id, status: "active", __v: user.__v === undefined ? { $exists: false } : user.__v },
        { $set: { addresses }, $inc: { __v: 1 } },
        { new: true, runValidators: true },
      ).select("addresses");
      if (!saved) continue;
      if (operation === "delete") return ok(res, null, "Address deleted.");
      if (operation === "create") res.status(201);
      return ok(res, safeAddress(ownedAddress(saved.addresses, String(target._id))),
        operation === "create" ? "Address saved." : "Address updated.");
    }
    return fail(res, 409, "Your addresses changed during this request. Please reload and try again.");
  } catch {
    return fail(res, 500, "Unable to save your address changes. Please try again.");
  }
}
exports.create = (req, res) => mutate(req, res, "create");
exports.update = (req, res) => mutate(req, res, "update");
exports.remove = (req, res) => mutate(req, res, "delete");
