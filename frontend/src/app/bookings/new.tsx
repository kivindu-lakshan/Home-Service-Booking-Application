import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  Banknote,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  MapPin,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { AccountText as Text } from "@/components/settings/AccountText";
import { ProfileBackButton } from "@/components/profile/ProfileNavigation";
import { getServices, type Service } from "@/api/services";
import { getAddresses, type SavedAddress } from "@/api/addresses";
import { createBooking, type Booking } from "@/api/bookings";
import ErrorText from "@/components/ErrorText";

export default function NewBookingScreen() {
  const themed = useAccountStyles();
  const { user } = useAuth();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);

  // Scheduling State
  const [selectedDateIndex, setSelectedDateIndex] = useState(0); // 0 = today or tomorrow
  const [timePeriod, setTimePeriod] = useState<"morning" | "afternoon" | "evening">("morning");
  const [selectedSlot, setSelectedSlot] = useState("09:00 AM");

  // Address State
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number>(0);
  const [customAddress, setCustomAddress] = useState("");
  const [useCustomAddress, setUseCustomAddress] = useState(false);

  // Notes & Payment
  const [notes, setNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState<"pay_on_completion" | "pay_now">("pay_on_completion");

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  // Generate next 14 days
  const upcomingDays = useMemo(() => {
    const days: { date: Date; dayName: string; dayNumber: number; monthName: string; isToday: boolean; isTomorrow: boolean }[] = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const monthName = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      days.push({
        date: d,
        dayName,
        dayNumber: d.getDate(),
        monthName,
        isToday: i === 0,
        isTomorrow: i === 1,
      });
    }
    return days;
  }, []);

  // Time slots per period
  const periodSlots = useMemo(() => ({
    morning: ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM"],
    afternoon: ["01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"],
    evening: ["05:00 PM", "06:00 PM", "07:00 PM"],
  }), []);

  // Set default slot when timePeriod changes
  const handlePeriodSelect = (period: "morning" | "afternoon" | "evening") => {
    setTimePeriod(period);
    setSelectedSlot(periodSlots[period][0]);
  };

  // Load services
  useEffect(() => {
    let isMounted = true;
    getServices(false)
      .then((items) => {
        if (!isMounted) return;
        setServices(items);
        if (serviceId) {
          const match = items.find((s) => s._id === serviceId);
          if (match) setSelectedService(match);
        } else if (items.length > 0) {
          setSelectedService(items[0]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingServices(false);
      });
    return () => {
      isMounted = false;
    };
  }, [serviceId]);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    let isMounted = true;
    getAddresses()
      .then((items) => {
        if (isMounted) setSavedAddresses(items);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Price calculations
  const basePrice = Number(selectedService?.basePrice || 0);
  const bookingCharge = 350;
  const tax = Math.round(basePrice * 0.05);
  const totalPrice = basePrice + bookingCharge + tax;

  // Resolve target address string
  const resolvedAddress = useCallback(() => {
    if (useCustomAddress || savedAddresses.length === 0) {
      return customAddress.trim();
    }
    const addr = savedAddresses[selectedAddressIndex];
    if (!addr) return customAddress.trim();
    return `${addr.label ? addr.label + " - " : ""}${addr.line1 || ""}, ${addr.areaCity || ""}`.trim();
  }, [useCustomAddress, savedAddresses, selectedAddressIndex, customAddress]);

  const handleSubmit = async () => {
    if (!selectedService) {
      setErrorMessage("Please select a service first.");
      return;
    }

    const addr = resolvedAddress();
    if (!addr) {
      setErrorMessage("Please provide a valid service address.");
      return;
    }

    setErrorMessage("");
    setSubmitting(true);

    try {
      const chosenDay = upcomingDays[selectedDateIndex].date;
      const res = await createBooking({
        serviceId: selectedService._id,
        scheduledDate: chosenDay.toISOString(),
        timePeriod,
        scheduledTime: selectedSlot,
        addressSnapshot: addr,
        notes: notes.trim(),
        paymentMode,
      });

      setCreatedBooking(res.data.data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to schedule booking. Please try again.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingServices) {
    return (
      <SafeAreaView style={themed(styles.safe)}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#633CFF" />
          <Text style={themed(styles.loadingText)}>Preparing booking schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themed(styles.safe)}>
      <View style={themed(styles.shell)}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <ProfileBackButton
            label="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/services"))}
          />
          <Text style={themed(styles.headerTitle)}>Schedule Service</Text>
          <View style={styles.brandBadge}>
            <Sparkles size={16} color="#633CFF" />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Selected Service Card */}
          {selectedService ? (
            <View style={themed(styles.serviceCard)}>
              <View style={styles.serviceHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={themed(styles.categoryPill)}>
                    {selectedService.category?.name || "Home Service"}
                  </Text>
                  <Text style={themed(styles.serviceTitle)}>{selectedService.name}</Text>
                  {!!selectedService.description && (
                    <Text numberOfLines={2} style={themed(styles.serviceDescription)}>
                      {selectedService.description}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.serviceMetaRow}>
                <View style={styles.metaItem}>
                  <Clock size={14} color="#633CFF" />
                  <Text style={themed(styles.metaText)}>
                    {selectedService.estDurationHours || "1-2 hours"}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <MapPin size={14} color="#633CFF" />
                  <Text style={themed(styles.metaText)}>
                    {selectedService.serviceType === "on_site" ? "On-site Service" : "Workshop"}
                  </Text>
                </View>
                <Text style={themed(styles.basePriceText)}>
                  LKR {selectedService.basePrice?.toLocaleString() || "0"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={themed(styles.noServiceCard)}>
              <Text style={themed(styles.noServiceText)}>Select a service from the catalog.</Text>
            </View>
          )}

          {/* SECTION 1: Date Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <CalendarIcon size={18} color="#633CFF" />
              <Text style={themed(styles.sectionTitle)}>Select Scheduled Date</Text>
            </View>
            <Text style={themed(styles.sectionSubtitle)}>
              Choose a date within the next 14 days
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateScroll}
            >
              {upcomingDays.map((day, idx) => {
                const isSelected = selectedDateIndex === idx;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => setSelectedDateIndex(idx)}
                    style={themed([
                      styles.dateTile,
                      isSelected && styles.dateTileSelected,
                    ])}
                  >
                    {day.isToday && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>TODAY</Text>
                      </View>
                    )}
                    {day.isTomorrow && (
                      <View style={styles.badgeSecondary}>
                        <Text style={styles.badgeSecondaryText}>TOMORROW</Text>
                      </View>
                    )}
                    <Text
                      style={themed([
                        styles.dateDayName,
                        isSelected && styles.textWhite,
                      ])}
                    >
                      {day.dayName}
                    </Text>
                    <Text
                      style={themed([
                        styles.dateDayNumber,
                        isSelected && styles.textWhite,
                      ])}
                    >
                      {day.dayNumber}
                    </Text>
                    <Text
                      style={themed([
                        styles.dateMonthName,
                        isSelected && styles.textWhiteSubtle,
                      ])}
                    >
                      {day.monthName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* SECTION 2: Time Window & Specific Slot */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Clock size={18} color="#633CFF" />
              <Text style={themed(styles.sectionTitle)}>Select Time Window</Text>
            </View>

            {/* Time Period Tabs */}
            <View style={styles.periodRow}>
              <Pressable
                onPress={() => handlePeriodSelect("morning")}
                style={themed([
                  styles.periodCard,
                  timePeriod === "morning" && styles.periodCardActive,
                ])}
              >
                <Sunrise size={18} color={timePeriod === "morning" ? "#633CFF" : "#8A91A4"} />
                <Text
                  style={themed([
                    styles.periodTitle,
                    timePeriod === "morning" && styles.periodTitleActive,
                  ])}
                >
                  Morning
                </Text>
                <Text style={themed(styles.periodHours)}>08:00 - 12:00</Text>
              </Pressable>

              <Pressable
                onPress={() => handlePeriodSelect("afternoon")}
                style={themed([
                  styles.periodCard,
                  timePeriod === "afternoon" && styles.periodCardActive,
                ])}
              >
                <Sun size={18} color={timePeriod === "afternoon" ? "#633CFF" : "#8A91A4"} />
                <Text
                  style={themed([
                    styles.periodTitle,
                    timePeriod === "afternoon" && styles.periodTitleActive,
                  ])}
                >
                  Afternoon
                </Text>
                <Text style={themed(styles.periodHours)}>12:00 - 16:00</Text>
              </Pressable>

              <Pressable
                onPress={() => handlePeriodSelect("evening")}
                style={themed([
                  styles.periodCard,
                  timePeriod === "evening" && styles.periodCardActive,
                ])}
              >
                <Sunset size={18} color={timePeriod === "evening" ? "#633CFF" : "#8A91A4"} />
                <Text
                  style={themed([
                    styles.periodTitle,
                    timePeriod === "evening" && styles.periodTitleActive,
                  ])}
                >
                  Evening
                </Text>
                <Text style={themed(styles.periodHours)}>16:00 - 20:00</Text>
              </Pressable>
            </View>

            {/* Slots for this period */}
            <Text style={themed(styles.sublabel)}>Preferred Start Time Slot</Text>
            <View style={styles.slotsGrid}>
              {periodSlots[timePeriod].map((slot) => {
                const isSlotSelected = selectedSlot === slot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => setSelectedSlot(slot)}
                    style={themed([
                      styles.slotPill,
                      isSlotSelected && styles.slotPillActive,
                    ])}
                  >
                    <Text
                      style={themed([
                        styles.slotText,
                        isSlotSelected && styles.slotTextActive,
                      ])}
                    >
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* SECTION 3: Service Address */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <MapPin size={18} color="#633CFF" />
              <Text style={themed(styles.sectionTitle)}>Service Location</Text>
            </View>

            {savedAddresses.length > 0 && !useCustomAddress ? (
              <View style={styles.addressList}>
                {savedAddresses.map((addr: SavedAddress, idx: number) => {
                  const isSelected = selectedAddressIndex === idx;
                  return (
                    <Pressable
                      key={addr._id || idx}
                      onPress={() => setSelectedAddressIndex(idx)}
                      style={themed([
                        styles.addressCard,
                        isSelected && styles.addressCardSelected,
                      ])}
                    >
                      <View style={styles.radioCircle}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={themed(styles.addressLabel)}>
                          {addr.label || "Saved Address"}
                        </Text>
                        <Text style={themed(styles.addressLine)}>{addr.line1}</Text>
                        {!!addr.areaCity && (
                          <Text style={themed(styles.addressCity)}>{addr.areaCity}</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setUseCustomAddress(true)}
                  style={styles.switchAddressLink}
                >
                  <Text style={styles.switchAddressText}>+ Enter a different address</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.customAddressBox}>
                <TextInput
                  placeholder="Enter complete address, building number, street..."
                  placeholderTextColor="#8A91A4"
                  value={customAddress}
                  onChangeText={setCustomAddress}
                  style={themed(styles.textInput)}
                  multiline
                />
                {savedAddresses.length > 0 && (
                  <Pressable
                    onPress={() => setUseCustomAddress(false)}
                    style={styles.switchAddressLink}
                  >
                    <Text style={styles.switchAddressText}>← Choose from saved addresses</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* SECTION 4: Notes / Instructions */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <FileText size={18} color="#633CFF" />
              <Text style={themed(styles.sectionTitle)}>Special Instructions (Optional)</Text>
            </View>
            <TextInput
              placeholder="e.g. Please call upon arrival, gate code is 1234, problem is in the upstairs bathroom..."
              placeholderTextColor="#8A91A4"
              value={notes}
              onChangeText={setNotes}
              style={themed(styles.notesInput)}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* SECTION 5: Payment Option */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <CreditCard size={18} color="#633CFF" />
              <Text style={themed(styles.sectionTitle)}>Payment Preference</Text>
            </View>

            <Pressable
              onPress={() => setPaymentMode("pay_on_completion")}
              style={themed([
                styles.paymentOptionCard,
                paymentMode === "pay_on_completion" && styles.paymentOptionSelected,
              ])}
            >
              <View style={styles.paymentRadio}>
                {paymentMode === "pay_on_completion" && <View style={styles.radioInner} />}
              </View>
              <View style={styles.paymentIconBox}>
                <Banknote size={20} color="#168A76" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={themed(styles.paymentOptionTitle)}>Pay on Completion</Text>
                <Text style={themed(styles.paymentOptionSubtitle)}>
                  Pay directly to the provider via Cash or Card once the job is inspected & completed.
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setPaymentMode("pay_now")}
              style={themed([
                styles.paymentOptionCard,
                paymentMode === "pay_now" && styles.paymentOptionSelected,
              ])}
            >
              <View style={styles.paymentRadio}>
                {paymentMode === "pay_now" && <View style={styles.radioInner} />}
              </View>
              <View style={styles.paymentIconBox}>
                <CreditCard size={20} color="#633CFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={themed(styles.paymentOptionTitle)}>Pay Now with Card</Text>
                <Text style={themed(styles.paymentOptionSubtitle)}>
                  Fast, secure online checkout before provider dispatch.
                </Text>
              </View>
            </Pressable>
          </View>

          {/* SECTION 6: Price Summary */}
          <View style={themed(styles.summaryCard)}>
            <Text style={themed(styles.summaryTitle)}>Fare & Price Breakdown</Text>
            <View style={styles.summaryRow}>
              <Text style={themed(styles.summaryLabel)}>Service Base Fee</Text>
              <Text style={themed(styles.summaryValue)}>LKR {basePrice.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={themed(styles.summaryLabel)}>Platform & Safety Fee</Text>
              <Text style={themed(styles.summaryValue)}>LKR {bookingCharge.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={themed(styles.summaryLabel)}>Taxes & Levies (5%)</Text>
              <Text style={themed(styles.summaryValue)}>LKR {tax.toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={themed(styles.totalLabel)}>Estimated Total</Text>
              <Text style={themed(styles.totalValue)}>LKR {totalPrice.toLocaleString()}</Text>
            </View>
          </View>

          {/* Error Message */}
          {!!errorMessage && <ErrorText>{errorMessage}</ErrorText>}

          {/* Confirmation Button */}
          <Pressable
            disabled={submitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              (pressed || submitting) && { opacity: 0.8 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Confirm & Schedule Booking</Text>
                <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              </>
            )}
          </Pressable>
        </ScrollView>

        {/* Success Modal */}
        <Modal
          visible={!!createdBooking}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={themed(styles.modalCard)}>
              <View style={styles.successIconWrapper}>
                <CheckCircle2 size={44} color="#168A76" />
              </View>
              <Text style={themed(styles.modalTitle)}>Booking Scheduled!</Text>
              <Text style={themed(styles.modalSubtitle)}>
                Your service appointment has been placed successfully.
              </Text>

              <View style={themed(styles.refBox)}>
                <Text style={themed(styles.refLabel)}>BOOKING REFERENCE</Text>
                <Text style={themed(styles.refCode)}>{createdBooking?.bookingRef}</Text>
                <Text style={themed(styles.refDetails)}>
                  {createdBooking?.scheduledDate
                    ? new Date(createdBooking.scheduledDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : ""}{" "}
                  at {createdBooking?.scheduledTime}
                </Text>
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => {
                    const id = createdBooking?._id;
                    setCreatedBooking(null);
                    router.replace({ pathname: "/bookings/[id]", params: { id } } as any);
                  }}
                  style={styles.modalPrimaryButton}
                >
                  <Text style={styles.modalPrimaryText}>View Booking Details</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setCreatedBooking(null);
                    router.replace("/bookings");
                  }}
                  style={styles.modalSecondaryButton}
                >
                  <Text style={styles.modalSecondaryText}>Go to My Bookings</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7FD" },
  shell: { flex: 1, width: "100%", maxWidth: 540, alignSelf: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#7C879F", fontSize: 14, fontWeight: "600" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#242E49" },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EEE8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EBE8F5",
  },
  noServiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  noServiceText: { color: "#7C879F", fontSize: 14 },
  serviceHeader: { flexDirection: "row", gap: 12, marginBottom: 12 },
  categoryPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EEE8FF",
    color: "#633CFF",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  serviceTitle: { fontSize: 18, fontWeight: "800", color: "#242E49" },
  serviceDescription: { fontSize: 12, color: "#7C879F", marginTop: 4, lineHeight: 18 },
  serviceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F2F0FA",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: "#626980", fontWeight: "600" },
  basePriceText: { fontSize: 15, fontWeight: "900", color: "#633CFF" },
  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#242E49" },
  sectionSubtitle: { fontSize: 12, color: "#8A91A4", marginBottom: 14 },
  dateScroll: { gap: 10, paddingVertical: 4 },
  dateTile: {
    width: 66,
    height: 94,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#EBE8F5",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 2,
  },
  dateTileSelected: {
    backgroundColor: "#633CFF",
    borderColor: "#633CFF",
  },
  badge: {
    backgroundColor: "#FFECCC",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 2,
  },
  badgeText: { fontSize: 7, fontWeight: "900", color: "#B86500" },
  badgeSecondary: {
    backgroundColor: "#E2F6F1",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 2,
  },
  badgeSecondaryText: { fontSize: 7, fontWeight: "900", color: "#0F9D8A" },
  dateDayName: { fontSize: 11, fontWeight: "800", color: "#8A91A4" },
  dateDayNumber: { fontSize: 20, fontWeight: "900", color: "#242E49" },
  dateMonthName: { fontSize: 10, fontWeight: "700", color: "#8A91A4" },
  textWhite: { color: "#FFFFFF" },
  textWhiteSubtle: { color: "rgba(255,255,255,0.8)" },
  periodRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  periodCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EBE8F5",
    gap: 4,
  },
  periodCardActive: {
    borderColor: "#633CFF",
    backgroundColor: "#F9F7FF",
  },
  periodTitle: { fontSize: 13, fontWeight: "700", color: "#626980" },
  periodTitleActive: { color: "#633CFF", fontWeight: "800" },
  periodHours: { fontSize: 10, color: "#8A91A4" },
  sublabel: { fontSize: 12, fontWeight: "700", color: "#626980", marginBottom: 10 },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slotPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6EAF3",
  },
  slotPillActive: {
    backgroundColor: "#633CFF",
    borderColor: "#633CFF",
  },
  slotText: { fontSize: 12, fontWeight: "700", color: "#242E49" },
  slotTextActive: { color: "#FFFFFF" },
  addressList: { gap: 10 },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#EBE8F5",
  },
  addressCardSelected: {
    borderColor: "#633CFF",
    backgroundColor: "#FAF9FF",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#633CFF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#633CFF",
  },
  addressLabel: { fontSize: 14, fontWeight: "800", color: "#242E49" },
  addressLine: { fontSize: 12, color: "#626980", marginTop: 2 },
  addressCity: { fontSize: 11, color: "#8A91A4", marginTop: 1 },
  switchAddressLink: { marginTop: 6, alignSelf: "flex-start" },
  switchAddressText: { color: "#633CFF", fontSize: 12, fontWeight: "700" },
  customAddressBox: { gap: 8 },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    fontSize: 13,
    color: "#242E49",
    borderWidth: 1,
    borderColor: "#E6EAF3",
    minHeight: 56,
  },
  notesInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    fontSize: 13,
    color: "#242E49",
    borderWidth: 1,
    borderColor: "#E6EAF3",
    minHeight: 70,
    textAlignVertical: "top",
  },
  paymentOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#EBE8F5",
    marginBottom: 10,
  },
  paymentOptionSelected: {
    borderColor: "#633CFF",
    backgroundColor: "#FAF9FF",
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#633CFF",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F0FC",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentOptionTitle: { fontSize: 14, fontWeight: "800", color: "#242E49" },
  paymentOptionSubtitle: { fontSize: 11, color: "#7C879F", marginTop: 2, lineHeight: 16 },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#EBE8F5",
  },
  summaryTitle: { fontSize: 15, fontWeight: "800", color: "#242E49", marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: "#626980" },
  summaryValue: { fontSize: 13, fontWeight: "700", color: "#242E49" },
  divider: { height: 1, backgroundColor: "#EBE8F5", marginVertical: 10 },
  totalLabel: { fontSize: 15, fontWeight: "800", color: "#242E49" },
  totalValue: { fontSize: 17, fontWeight: "900", color: "#633CFF" },
  submitButton: {
    backgroundColor: "#633CFF",
    borderRadius: 16,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#633CFF",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 14, 38, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  successIconWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#DDF7F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#242E49", marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: "#7C879F", textAlign: "center", marginBottom: 18 },
  refBox: {
    width: "100%",
    backgroundColor: "#F7F7FD",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EBE8F5",
  },
  refLabel: { fontSize: 10, fontWeight: "800", color: "#8A91A4", letterSpacing: 1 },
  refCode: { fontSize: 20, fontWeight: "900", color: "#633CFF", marginVertical: 4 },
  refDetails: { fontSize: 12, fontWeight: "600", color: "#626980" },
  modalButtons: { width: "100%", gap: 10 },
  modalPrimaryButton: {
    backgroundColor: "#633CFF",
    borderRadius: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  modalSecondaryButton: {
    backgroundColor: "#EEE8FF",
    borderRadius: 14,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: { color: "#633CFF", fontSize: 13, fontWeight: "800" },
});
