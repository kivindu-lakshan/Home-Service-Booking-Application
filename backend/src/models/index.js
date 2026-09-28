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
    latitude: Number,
    longitude: Number,
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);
const settings = new Schema(
  {
    notifyBookingConfirmations: { type: Boolean, default: true },
    notifyArrivalStatus: { type: Boolean, default: true },
    notifyReminders: { type: Boolean, default: true },
    notifyPromotions: { type: Boolean, default: false },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    easyOnEyes: { type: Boolean, default: false },
    gentleByDesign: { type: Boolean, default: false },
    textSize: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
    },
    reduceMotion: { type: Boolean, default: false },
    highContrast: { type: Boolean, default: false },
    locationPermission: { type: Boolean, default: false },
    shareUsageData: { type: Boolean, default: false },
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
const Notification = make("Notification", {
  user: ref("User"),
  booking: ref("Booking", false),
  type: {
    type: String,
    enum: ["confirmation", "status", "arrival", "reminder", "promo", "refund"],
  },
  title: String,
  body: String,
  isRead: { type: Boolean, default: false },
});
const SupportTicket = make("SupportTicket", {
  user: ref("User", false),
  email: String,
  category: {
    type: String,
    enum: ["cant_sign_in", "update_details", "booking_problem", "other"],
  },
  message: String,
  status: {
    type: String,
    enum: ["open", "in_progress", "resolved"],
    default: "open",
  },
  resolvedAt: Date,
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
const Favorite = make("Favorite", {
  user: ref("User"),
  provider: ref("Provider"),
});
Favorite.schema.index({ user: 1, provider: 1 }, { unique: true });
const CustomServiceRequest = make("CustomServiceRequest", {
  user: ref("User"),
  title: String,
  description: String,
  addressId: String,
  status: {
    type: String,
    enum: ["new", "quoted", "converted", "closed"],
    default: "new",
  },
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
const ProviderLocation = make("ProviderLocation", {
  booking: ref("Booking"),
  latitude: Number,
  longitude: Number,
  recordedAt: { type: Date, default: Date.now, index: { expires: 604800 } },
});
const ChatMessage = make("ChatMessage", {
  booking: ref("Booking"),
  sender: ref("User"),
  body: String,
  isRead: { type: Boolean, default: false },
});
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
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  receiptNo: { type: String, unique: true, sparse: true },
  paidAt: Date,
});
const Refund = make("Refund", {
  payment: ref("Payment"),
  complaint: ref("Complaint", false),
  amount: Number,
  reason: String,
  status: {
    type: String,
    enum: ["requested", "approved", "processed", "rejected"],
  },
  processedBy: ref("User", false),
  processedAt: Date,
});
const Review = make("Review", {
  booking: { ...ref("Booking"), unique: true },
  customer: ref("User"),
  provider: ref("Provider"),
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: String,
});
const Complaint = make("Complaint", {
  booking: ref("Booking"),
  customer: ref("User"),
  type: { type: String, enum: ["quality", "no_show", "overcharge", "other"] },
  description: String,
  status: {
    type: String,
    enum: ["open", "investigating", "resolved", "rejected"],
    default: "open",
  },
  resolutionNote: String,
  resolvedAt: Date,
});
const AdminActivityLog = make("AdminActivityLog", {
  actor: ref("User"),
  action: String,
  entityType: String,
  entityId: String,
});
const models = {
  User,
  Notification,
  SupportTicket,
  AuthToken,
  ServiceCategory,
  Service,
  Provider,
  Favorite,
  CustomServiceRequest,
  Booking,
  ProviderLocation,
  ChatMessage,
  BookingAssignment,
  PaymentMethod,
  Payment,
  Refund,
  Review,
  Complaint,
  AdminActivityLog,
};
module.exports = { ...models, models };
