const mongoose = require("mongoose");
const { Schema } = mongoose;
const ref = (name, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required,
});
const make = (name, definition, options = {}) =>
  mongoose.model(
    name,
    new Schema(definition, { timestamps: true, ...options }),
  );
const address = new Schema(
  {
    label: String,
    line1: String,
    areaCity: String,
    landmark: String,
    createdAt: Date,
    updatedAt: Date,
    latitude: Number,
    longitude: Number,
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);
const notificationPreferences = new Schema({
  bookingConfirmations: { type: Boolean, default: true },
  arrivalStatusUpdates: { type: Boolean, default: true },
  bookingReminders: { type: Boolean, default: true },
}, { _id: false });
const settings = new Schema(
  {
    notifications: { type: notificationPreferences, default: () => ({}) },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    textSize: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
    },
  },
  { _id: false },
);
const User = make("User", {
  fullName: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  phone: String,
  passwordHash: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ["customer", "provider", "admin"],
    default: "customer",
    index: true,
  },
  avatarUrl: String,
  emailVerified: { type: Boolean, default: false },
  twoStepEnabled: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["active", "suspended", "deleted"],
    default: "active",
  },
  addresses: [address],
  settings: { type: settings, default: () => ({}) },
});
const AuthToken = make("AuthToken", {
  user: ref("User"),
  type: { type: String, enum: ["verify_email", "reset_password"] },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: Date,
});
const ServiceCategory = make("ServiceCategory", {
  name: { type: String, unique: true },
  icon: String,
  sortOrder: Number,
  isActive: { type: Boolean, default: true },
});
const Service = make("Service", {
  category: ref("ServiceCategory"),
  name: String,
  description: String,
  imageUrl: String,
  basePrice: Number,
  estDurationHours: String,
  serviceType: { type: String, enum: ["on_site", "workshop"] },
  inclusions: [String],
  isActive: { type: Boolean, default: true },
});
const Provider = make("Provider", {
  user: { ...ref("User"), unique: true },
  aboutMe: String,
  yearsExperience: Number,
  city: String,
  latitude: Number,
  longitude: Number,
  isVerified: Boolean,
  ratingAvg: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  isAvailable: Boolean,
  status: {
    type: String,
    enum: ["pending_approval", "active", "suspended"],
    default: "pending_approval",
  },
  services: [{ service: ref("Service"), priceFrom: Number }],
  availability: [
    {
      dayOfWeek: { type: Number, min: 0, max: 6 },
      startTime: String,
      endTime: String,
      isAvailable: Boolean,
    },
  ],
});
const statusHistory = new Schema(
  {
    status: String,
    changedBy: ref("User", false),
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);
const Booking = make("Booking", {
  bookingRef: { type: String, unique: true },
  customer: ref("User"),
  provider: ref("Provider", false),
  service: ref("Service"),
  addressSnapshot: String,
  scheduledDate: Date,
  timePeriod: { type: String, enum: ["morning", "afternoon", "evening"] },
  scheduledTime: String,
  durationHours: String,
  serviceFee: Number,
  bookingCharge: Number,
  tax: Number,
  totalPrice: Number,
  paymentMode: { type: String, enum: ["pay_now", "pay_on_completion"] },
  status: {
    type: String,
    enum: [
      "pending",
      "confirmed",
      "assigned",
      "en_route",
      "arrived",
      "in_progress",
      "completed",
      "cancelled",
    ],
    default: "pending",
  },
  etaMinutes: Number,
  notes: String,
  cancelledReason: String,
  statusHistory: [statusHistory],
});
Booking.schema.index(
  { provider: 1, scheduledDate: 1, scheduledTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          "pending",
          "confirmed",
          "assigned",
          "en_route",
          "arrived",
          "in_progress",
        ],
      },
    },
  },
);
const BookingAssignment = make("BookingAssignment", {
  booking: ref("Booking"),
  provider: ref("Provider"),
  assignedBy: ref("User"),
  response: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    default: "pending",
  },
  declineReason: String,
  respondedAt: Date,
});
const PaymentMethod = make("PaymentMethod", {
  user: ref("User"),
  type: { type: String, enum: ["card", "cash"] },
  brand: String,
  last4: { type: String, minlength: 4, maxlength: 4 },
  gatewayToken: String,
  isDefault: Boolean,
});
const Payment = make("Payment", {
  booking: { ...ref("Booking"), unique: true },
  paymentMethod: ref("PaymentMethod", false),
  method: {
    type: String,
    enum: ["card", "cash_on_arrival", "cash_on_completion"],
  },
  amount: Number,
  serviceCharge: Number,
  tax: Number,
  totalAmount: Number,
  transactionReference: String,
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  receiptNo: { type: String, unique: true, sparse: true },
  paidAt: Date,
});
const Review = make("Review", {
  booking: { ...ref("Booking"), unique: true },
  customer: ref("User"),
  provider: ref("Provider"),
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: String,
});
const AdminActivityLog = make("AdminActivityLog", {
  actor: ref("User"),
  action: String,
  entityType: String,
  entityId: String,
});
const supportCategories = ["Booking issue", "Payment issue", "Service provider issue", "Account issue", "Technical issue", "Other"];
const SupportTicket = make("SupportTicket", {
  user: ref("User"),
  category: { type: String, required: true, enum: supportCategories },
  subject: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  status: { type: String, enum: ["pending", "in_progress", "resolved", "cancelled"], default: "pending", required: true },
});
SupportTicket.schema.index({ user: 1, createdAt: -1 });
const ProviderLocation = make("ProviderLocation", {
  provider: ref("Provider"),
  address: { type: String, required: true, trim: true, maxlength: 300 },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
}, { collection: "providerlocations" });
const ProviderApplication = make("ProviderApplication", {
  provider: ref("Provider"),
  service: ref("Service"),
  professionalName: { type: String, required: true, maxlength: 120 },
  phone: { type: String, required: true, maxlength: 30 },
  yearsExperience: { type: Number, required: true, min: 0, max: 80 },
  aboutMe: { type: String, required: true, maxlength: 2000 },
  qualifications: { type: String, required: true, maxlength: 2000 },
  skills: { type: String, required: true, maxlength: 1000 },
  priceFrom: { type: Number, min: 0, max: 10000000 },
  location: ref("ProviderLocation"),
  documents: [{ name: String, mimeType: String, size: Number, storageKey: { type: String, select: false } }],
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", required: true },
}, { collection: "providerapplications" });
ProviderApplication.schema.index({ provider: 1, service: 1 }, { unique: true, partialFilterExpression: { status: { $in: ["pending", "approved"] } } });
ProviderApplication.schema.index({ provider: 1, createdAt: -1 });

const models = {
  ProviderLocation,
  ProviderApplication,
  SupportTicket,
  User,
  AuthToken,
  ServiceCategory,
  Service,
  Provider,
  Booking,
  BookingAssignment,
  PaymentMethod,
  Payment,
  Review,
  AdminActivityLog,
};
module.exports = { ...models, models, supportCategories };
