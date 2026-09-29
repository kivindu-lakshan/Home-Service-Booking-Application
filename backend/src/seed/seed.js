const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const { models } = require("../models");

const password = "password123";
const date = (days) => new Date(Date.now() + days * 86400000);

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  const removedCollections = [
    "notifications",
    "supporttickets",
    "favorites",
    "customservicerequests",
    "providerlocations",
    "chatmessages",
    "refunds",
    "complaints",
  ];
  await Promise.all(
    removedCollections.map(async (name) => {
      try {
        await mongoose.connection.dropCollection(name);
      } catch (error) {
        if (error.codeName !== "NamespaceNotFound") throw error;
      }
    }),
  );
  await Promise.all(Object.values(models).map((model) => model.deleteMany({})));
  const passwordHash = await bcrypt.hash(password, 12);
  const [admin, customer, secondCustomer, providerUser] =
    await models.User.create([
      {
        fullName: "System Admin",
        email: "admin@homeservice.lk",
        passwordHash,
        role: "admin",
        emailVerified: true,
      },
      {
        fullName: "Saman Perera",
        email: "saman@gmail.com",
        passwordHash,
        phone: "+94 77 123 4567",
        emailVerified: true,
        addresses: [
          {
            label: "Home",
            line1: "Malabe",
            areaCity: "Malabe, Sri Lanka",
            isDefault: true,
          },
        ],
      },
      {
        fullName: "Anuka Perera",
        email: "anuka@example.com",
        passwordHash,
        phone: "+94 77 765 4321",
        emailVerified: true,
      },
      {
        fullName: "Kasun Perera",
        email: "provider@homeservice.lk",
        passwordHash,
        role: "provider",
        emailVerified: true,
      },
    ]);
  const categories = await models.ServiceCategory.insertMany([
    { name: "Plumber", icon: "plumber", sortOrder: 1 },
    { name: "Cleaner", icon: "cleaner", sortOrder: 2 },
    { name: "AC Repair", icon: "ac-repair", sortOrder: 3 },
  ]);
  const [pipeRepair, houseCleaning, acCleaning] =
    await models.Service.insertMany([
      {
        category: categories[0]._id,
        name: "Pipe Repair",
        description: "Professional pipe repair at home",
        basePrice: 2500,
        estDurationHours: "1-3 hours",
        serviceType: "on_site",
        inclusions: ["Leak fixing", "Inspection & testing"],
      },
      {
        category: categories[1]._id,
        name: "Deep House Cleaning",
        description: "Detailed home cleaning",
        basePrice: 4500,
        estDurationHours: "3-5 hours",
        serviceType: "on_site",
        inclusions: ["Kitchen", "Bathrooms", "Living areas"],
      },
      {
        category: categories[2]._id,
        name: "Air Conditioner Deep Cleaning",
        description: "AC cleaning and performance check",
        basePrice: 120,
        estDurationHours: "2.5 hours",
        serviceType: "on_site",
        inclusions: ["Filter wash", "Coil cleaning"],
      },
    ]);
  const provider = await models.Provider.create({
    user: providerUser._id,
    aboutMe: "Experienced home-service professional.",
    yearsExperience: 5,
    city: "Malabe",
    isVerified: true,
    isAvailable: true,
    status: "active",
    ratingAvg: 4.8,
    reviewCount: 1,
    services: [
      { service: pipeRepair._id, priceFrom: 2500 },
      { service: acCleaning._id, priceFrom: 120 },
    ],
    availability: [
      { dayOfWeek: 1, startTime: "08:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 2, startTime: "08:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 3, startTime: "08:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 4, startTime: "08:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 5, startTime: "08:00", endTime: "18:00", isAvailable: true },
    ],
  });
  const completed = await models.Booking.create({
    bookingRef: "BK-SEED-1001",
    customer: customer._id,
    provider: provider._id,
    service: pipeRepair._id,
    addressSnapshot: "Malabe, Sri Lanka",
    scheduledDate: date(-3),
    timePeriod: "morning",
    scheduledTime: "10:00 AM",
    durationHours: "1-3 hours",
    serviceFee: 2500,
    bookingCharge: 15,
    tax: 201.2,
    totalPrice: 2716.2,
    paymentMode: "pay_now",
    status: "completed",
    statusHistory: [
      { status: "pending", changedBy: customer._id },
      { status: "completed", changedBy: providerUser._id },
    ],
  });
  const upcoming = await models.Booking.create({
    bookingRef: "BK-SEED-1002",
    customer: customer._id,
    provider: provider._id,
    service: houseCleaning._id,
    addressSnapshot: "Malabe, Sri Lanka",
    scheduledDate: date(2),
    timePeriod: "afternoon",
    scheduledTime: "02:00 PM",
    durationHours: "3-5 hours",
    serviceFee: 4500,
    bookingCharge: 15,
    tax: 361.2,
    totalPrice: 4876.2,
    paymentMode: "pay_now",
    status: "assigned",
    etaMinutes: 35,
    statusHistory: [
      { status: "pending", changedBy: customer._id },
      { status: "assigned", changedBy: admin._id },
    ],
  });
  const pending = await models.Booking.create({
    bookingRef: "BK-SEED-1003",
    customer: secondCustomer._id,
    service: acCleaning._id,
    addressSnapshot: "Kaduwela, Sri Lanka",
    scheduledDate: date(4),
    timePeriod: "morning",
    scheduledTime: "09:00 AM",
    durationHours: "2.5 hours",
    serviceFee: 120,
    bookingCharge: 15,
    tax: 10.8,
    totalPrice: 145.8,
    paymentMode: "pay_on_completion",
    status: "pending",
    statusHistory: [{ status: "pending", changedBy: secondCustomer._id }],
  });
  await models.Payment.create({
    booking: completed._id,
    paymentMethod: null,
    method: "card",
    amount: completed.totalPrice,
    serviceCharge: completed.serviceFee,
    tax: completed.tax,
    totalAmount: completed.totalPrice,
    status: "paid",
    receiptNo: "RC-SEED-1001",
    transactionReference: "APP-SEED-1001",
    paidAt: date(-3),
  });
  await models.Payment.create({
    booking: upcoming._id,
    method: "card",
    amount: upcoming.totalPrice,
    serviceCharge: upcoming.serviceFee,
    tax: upcoming.tax,
    totalAmount: upcoming.totalPrice,
    status: "paid",
    receiptNo: "RC-SEED-1002",
    transactionReference: "APP-SEED-1002",
    paidAt: new Date(),
  });
  await models.Review.create({
    booking: completed._id,
    customer: customer._id,
    provider: provider._id,
    service: pipeRepair._id,
    rating: 5,
    comment: "Fast and professional service.",
  });
  await models.AdminActivityLog.create({
    actor: admin._id,
    action: "seeded_booking_data",
    entityType: "Booking",
    entityId: upcoming._id.toString(),
  });
  console.log("Seed complete");
  console.log("Admin: admin@homeservice.lk / password123");
  console.log("Customer: saman@gmail.com / password123");
  console.log("Provider: provider@homeservice.lk / password123");
  console.log(`Payment booking: ${completed._id}`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
