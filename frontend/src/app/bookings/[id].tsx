import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  MapPin,
  Phone,
  RefreshCw,
  Star,
  User,
  XCircle,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { AccountText as Text } from "@/components/settings/AccountText";
import { ProfileBackButton } from "@/components/profile/ProfileNavigation";
import {
  cancelBooking,
  getBookingById,
  rescheduleBooking,
  updateBookingStatus,
  type Booking,
} from "@/api/bookings";
import { LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";

const statusSteps = [
  { key: "pending", label: "Requested" },
  { key: "assigned", label: "Assigned" },
  { key: "en_route", label: "En Route" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

export default function BookingDetailsScreen() {
  const themed = useAccountStyles();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Reschedule Modal State
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [rescheduleDateIndex, setRescheduleDateIndex] = useState(0);
  const [reschedulePeriod, setReschedulePeriod] = useState<"morning" | "afternoon" | "evening">("morning");
  const [rescheduleSlot, setRescheduleSlot] = useState("09:30 AM");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");

  // Cancel Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("Change of plans");
  const [cancelCustomText, setCancelCustomText] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Status update state for provider
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Generate 14 days for reschedule
  const upcomingDays = useMemo(() => {
    const days: { date: Date; dayName: string; dayNumber: number; monthName: string }[] = [];
    const now = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      days.push({
        date: d,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      });
    }
    return days;
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage("");

    try {
      const res = await getBookingById(id);
      setBooking(res.data.data.booking);
      setPayment(res.data.data.payment);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || "Failed to load booking details.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Reschedule
  const handleRescheduleSubmit = async () => {
    if (!booking) return;
    setRescheduling(true);
    setRescheduleError("");
    try {
      const chosenDay = upcomingDays[rescheduleDateIndex].date;
      const res = await rescheduleBooking(booking._id, {
        scheduledDate: chosenDay.toISOString(),
        timePeriod: reschedulePeriod,
        scheduledTime: rescheduleSlot,
        notes: rescheduleNotes ? rescheduleNotes.trim() : undefined,
      });
      setBooking(res.data.data);
      setRescheduleModalVisible(false);
    } catch (err: any) {
      setRescheduleError(
        err?.response?.data?.message || "Unable to reschedule booking.",
      );
    } finally {
      setRescheduling(false);
    }
  };

  // Handle Cancel
  const handleCancelSubmit = async () => {
    if (!booking) return;
    const finalReason =
      cancelReason === "Other"
        ? cancelCustomText.trim() || "Cancelled by customer"
        : cancelReason;

    setCancelling(true);
    setCancelError("");
    try {
      const res = await cancelBooking(booking._id, finalReason);
      setBooking(res.data.data);
      setCancelModalVisible(false);
    } catch (err: any) {
      setCancelError(
        err?.response?.data?.message || "Unable to cancel booking.",
      );
    } finally {
      setCancelling(false);
    }
  };

  // Provider status step progression
  const handleProviderNextStatus = async () => {
    if (!booking) return;
    let nextStatus = "";
    if (booking.status === "assigned") nextStatus = "en_route";
    else if (booking.status === "en_route") nextStatus = "arrived";
    else if (booking.status === "arrived") nextStatus = "in_progress";
    else if (booking.status === "in_progress") nextStatus = "completed";

    if (!nextStatus) return;

    setUpdatingStatus(true);
    try {
      const res = await updateBookingStatus(booking._id, { status: nextStatus });
      setBooking(res.data.data);
    } catch (err: any) {
      Alert.alert(
        "Update Failed",
        err?.response?.data?.message || "Could not update status.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={themed(styles.safe)}>
        <LoadingState label="Loading booking details..." />
      </SafeAreaView>
    );
  }

  if (errorMessage || !booking) {
    return (
      <SafeAreaView style={themed(styles.safe)}>
        <View style={styles.topBar}>
          <ProfileBackButton
            label="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/bookings"))}
          />
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#D33F49" />
          <Text style={themed(styles.errorTitle)}>Booking Not Found</Text>
          <Text style={themed(styles.errorCopy)}>{errorMessage || "The requested booking does not exist."}</Text>
          <Pressable onPress={() => loadData()} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isCancelled = booking.status === "cancelled";
  const isCompleted = booking.status === "completed";
  const canModify = ["pending", "confirmed", "assigned"].includes(booking.status);
  const isProvider = user?.role === "provider";
  const isCustomer = user?.role === "customer" || !isProvider;

  // Active step index
  const currentStepIndex = (() => {
    switch (booking.status) {
      case "pending":
      case "confirmed":
        return 0;
      case "assigned":
        return 1;
      case "en_route":
      case "arrived":
        return 2;
      case "in_progress":
        return 3;
      case "completed":
        return 4;
      default:
        return -1;
    }
  })();

  const providerUser = booking.provider?.user;

  return (
    <SafeAreaView style={themed(styles.safe)}>
      <View style={themed(styles.shell)}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <ProfileBackButton
            label="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/bookings"))}
          />
          <View style={{ alignItems: "center" }}>
            <Text style={themed(styles.headerRef)}>{booking.bookingRef}</Text>
            <Text style={themed(styles.headerSub)}>Booking Details</Text>
          </View>
          <View style={[styles.headerStatusBadge, isCancelled ? styles.statusCancelled : isCompleted ? styles.statusCompleted : styles.statusActive]}>
            <Text style={[styles.headerStatusText, isCancelled ? styles.textCancelled : isCompleted ? styles.textCompleted : styles.textActive]}>
              {booking.status.replace("_", " ")}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
          }
        >
          {/* Cancelled Banner */}
          {isCancelled && (
            <View style={styles.cancelledBanner}>
              <XCircle size={22} color="#D33F49" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelledTitle}>This booking was cancelled</Text>
                {!!booking.cancelledReason && (
                  <Text style={styles.cancelledReason}>Reason: {booking.cancelledReason}</Text>
                )}
              </View>
            </View>
          )}

          {/* Stepper / Timeline (if not cancelled) */}
          {!isCancelled && (
            <View style={themed(styles.timelineCard)}>
              <Text style={themed(styles.cardHeading)}>Live Service Status</Text>
              <View style={styles.stepperContainer}>
                {statusSteps.map((step, idx) => {
                  const isDone = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <View key={step.key} style={styles.stepItem}>
                      <View style={styles.stepDotRow}>
                        {idx > 0 && (
                          <View
                            style={[
                              styles.stepLine,
                              idx <= currentStepIndex ? styles.stepLineActive : styles.stepLineInactive,
                            ]}
                          />
                        )}
                        <View
                          style={[
                            styles.stepDot,
                            isDone ? styles.stepDotDone : styles.stepDotPending,
                            isCurrent && styles.stepDotCurrent,
                          ]}
                        >
                          {isDone ? (
                            <CheckCircle2 size={16} color="#FFFFFF" />
                          ) : (
                            <View style={styles.dotInner} />
                          )}
                        </View>
                        {idx < statusSteps.length - 1 && (
                          <View
                            style={[
                              styles.stepLine,
                              idx < currentStepIndex ? styles.stepLineActive : styles.stepLineInactive,
                            ]}
                          />
                        )}
                      </View>
                      <Text
                        style={themed([
                          styles.stepLabel,
                          isCurrent && styles.stepLabelCurrent,
                          isDone && !isCurrent && styles.stepLabelDone,
                        ])}
                      >
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Service Card */}
          <View style={themed(styles.infoCard)}>
            <Text style={themed(styles.cardHeading)}>Service Requested</Text>
            <View style={styles.serviceRow}>
              <View style={styles.serviceIconPill}>
                <Calendar size={22} color="#633CFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={themed(styles.serviceName)}>{booking.service?.name || "Home Service"}</Text>
                <Text style={themed(styles.serviceCategory)}>
                  {booking.service?.category?.name || "General Home Care"}
                </Text>
              </View>
            </View>
          </View>

          {/* Scheduled Date & Time with Reschedule option */}
          <View style={themed(styles.infoCard)}>
            <View style={styles.cardHeaderRow}>
              <Text style={themed(styles.cardHeading)}>Scheduled Appointment</Text>
              {canModify && isCustomer && (
                <Pressable
                  onPress={() => setRescheduleModalVisible(true)}
                  style={styles.actionChip}
                >
                  <RefreshCw size={13} color="#633CFF" />
                  <Text style={styles.actionChipText}>Reschedule</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.scheduleRow}>
              <View style={styles.scheduleItem}>
                <Calendar size={18} color="#633CFF" />
                <View>
                  <Text style={themed(styles.scheduleLabel)}>Date</Text>
                  <Text style={themed(styles.scheduleValue)}>
                    {booking.scheduledDate
                      ? new Date(booking.scheduledDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Pending Date"}
                  </Text>
                </View>
              </View>

              <View style={styles.scheduleItem}>
                <Clock size={18} color="#633CFF" />
                <View>
                  <Text style={themed(styles.scheduleLabel)}>Time Window</Text>
                  <Text style={themed(styles.scheduleValue)}>
                    {booking.scheduledTime || booking.timePeriod || "Morning"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Service Location */}
          <View style={themed(styles.infoCard)}>
            <Text style={themed(styles.cardHeading)}>Service Location & Address</Text>
            <View style={styles.addressRow}>
              <MapPin size={20} color="#633CFF" />
              <Text style={themed(styles.addressText)}>{booking.addressSnapshot}</Text>
            </View>
            {!!booking.notes && (
              <View style={styles.notesBox}>
                <FileText size={15} color="#8A91A4" />
                <Text style={themed(styles.notesText)}>Note: {booking.notes}</Text>
              </View>
            )}
          </View>

          {/* Assigned Provider Info */}
          {booking.provider ? (
            <View style={themed(styles.infoCard)}>
              <Text style={themed(styles.cardHeading)}>Assigned Professional</Text>
              <View style={styles.providerRow}>
                <View style={styles.providerAvatar}>
                  <Text style={styles.avatarInitial}>
                    {providerUser?.fullName?.trim()?.[0]?.toUpperCase() || "P"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={themed(styles.providerName)}>
                    {providerUser?.fullName || "Assigned Provider"}
                  </Text>
                  <View style={styles.providerRatingRow}>
                    <Star size={14} color="#F5A623" fill="#F5A623" />
                    <Text style={themed(styles.providerRating)}>
                      {booking.provider.ratingAvg ? booking.provider.ratingAvg.toFixed(1) : "5.0"}
                    </Text>
                    {!!booking.provider.city && (
                      <Text style={themed(styles.providerCity)}>· {booking.provider.city}</Text>
                    )}
                  </View>
                </View>

                {!!providerUser?.phone && (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${providerUser.phone}`)}
                    style={styles.callButton}
                  >
                    <Phone size={18} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            </View>
          ) : (
            <View style={themed(styles.infoCard)}>
              <Text style={themed(styles.cardHeading)}>Service Professional</Text>
              <View style={styles.pendingProviderRow}>
                <User size={20} color="#8A91A4" />
                <Text style={themed(styles.pendingProviderText)}>
                  Our team is assigning the best qualified professional for your area.
                </Text>
              </View>
            </View>
          )}

          {/* Price & Payment Breakdown */}
          <View style={themed(styles.infoCard)}>
            <Text style={themed(styles.cardHeading)}>Payment & Charges</Text>
            <View style={styles.feeRow}>
              <Text style={themed(styles.feeLabel)}>Service Base Fee</Text>
              <Text style={themed(styles.feeValue)}>
                LKR {Number(booking.serviceFee || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={themed(styles.feeLabel)}>Platform & Safety Fee</Text>
              <Text style={themed(styles.feeValue)}>
                LKR {Number(booking.bookingCharge || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={themed(styles.feeLabel)}>Taxes & Levies</Text>
              <Text style={themed(styles.feeValue)}>
                LKR {Number(booking.tax || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.feeRow}>
              <Text style={themed(styles.totalFeeLabel)}>Total Amount</Text>
              <Text style={themed(styles.totalFeeValue)}>
                LKR {Number(booking.totalPrice || 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.paymentStatusBadge}>
              {payment?.status === "paid" ? (
                <View style={styles.paidPill}>
                  <CheckCircle2 size={15} color="#168A76" />
                  <Text style={styles.paidText}>Paid Online (Receipt: {payment.receiptNo || "Yes"})</Text>
                </View>
              ) : (
                <View style={styles.unpaidPill}>
                  {booking.paymentMode === "pay_now" ? (
                    <CreditCard size={15} color="#633CFF" />
                  ) : (
                    <Banknote size={15} color="#B86500" />
                  )}
                  <Text style={styles.unpaidText}>
                    {booking.paymentMode === "pay_now"
                      ? "Pay Now Online (Pending)"
                      : "Pay on Completion (Cash / Card)"}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Status History Audit Log */}
          {!!booking.statusHistory?.length && (
            <View style={themed(styles.infoCard)}>
              <Text style={themed(styles.cardHeading)}>Activity Log</Text>
              <View style={styles.historyList}>
                {booking.statusHistory.map((h, i) => (
                  <View key={i} style={styles.historyItem}>
                    <View style={styles.historyDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={themed(styles.historyNote)}>{h.note || h.status}</Text>
                      <Text style={themed(styles.historyDate)}>
                        {new Date(h.at).toLocaleDateString()} at{" "}
                        {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* PROVIDER ACTIONS */}
          {isProvider && !isCompleted && !isCancelled && (
            <View style={styles.actionSection}>
              <Pressable
                disabled={updatingStatus}
                onPress={handleProviderNextStatus}
                style={({ pressed }) => [
                  styles.primaryActionButton,
                  (pressed || updatingStatus) && { opacity: 0.8 },
                ]}
              >
                {updatingStatus ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryActionText}>
                      {booking.status === "assigned"
                        ? "Start Journey (En Route)"
                        : booking.status === "en_route"
                        ? "Mark Arrived at Location"
                        : booking.status === "arrived"
                        ? "Start Service"
                        : "Complete Service"}
                    </Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* CUSTOMER ACTIONS */}
          {isCustomer && (
            <View style={styles.actionSection}>
              {/* Pay Now Button (if unpaid and online pay mode or wants to pay now) */}
              {payment?.status !== "paid" && !isCancelled && (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/payment/details",
                      params: { bookingId: booking._id },
                    })
                  }
                  style={styles.payButton}
                >
                  <CreditCard size={18} color="#FFFFFF" />
                  <Text style={styles.payButtonText}>Pay with Card (LKR {Number(booking.totalPrice || 0).toLocaleString()})</Text>
                </Pressable>
              )}

              {/* Rate Provider Button (if completed) */}
              {isCompleted && (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/reviews/rate",
                      params: { bookingId: booking._id },
                    })
                  }
                  style={styles.rateButton}
                >
                  <Star size={18} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.rateButtonText}>Rate & Review Service</Text>
                </Pressable>
              )}

              {/* Cancel Button */}
              {canModify && (
                <Pressable
                  onPress={() => setCancelModalVisible(true)}
                  style={styles.cancelLink}
                >
                  <Text style={styles.cancelLinkText}>Cancel this booking</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        {/* RESCHEDULE MODAL */}
        <Modal
          visible={rescheduleModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setRescheduleModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={themed(styles.modalBox)}>
              <Text style={themed(styles.modalHeading)}>Reschedule Booking</Text>
              <Text style={themed(styles.modalSubheading)}>
                Select a new convenient date and time window
              </Text>

              {/* Date Scroll */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 12 }}
              >
                {upcomingDays.map((d, i) => {
                  const sel = rescheduleDateIndex === i;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => setRescheduleDateIndex(i)}
                      style={themed([
                        styles.rescheduleDateTile,
                        sel && styles.rescheduleDateTileActive,
                      ])}
                    >
                      <Text style={themed([styles.tileDay, sel && styles.textWhite])}>{d.dayName}</Text>
                      <Text style={themed([styles.tileNumber, sel && styles.textWhite])}>{d.dayNumber}</Text>
                      <Text style={themed([styles.tileMonth, sel && styles.textWhiteSubtle])}>{d.monthName}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Time Period Tabs */}
              <View style={styles.modalPeriodRow}>
                {(["morning", "afternoon", "evening"] as const).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => {
                      setReschedulePeriod(p);
                      setRescheduleSlot(
                        p === "morning" ? "09:30 AM" : p === "afternoon" ? "02:00 PM" : "06:00 PM",
                      );
                    }}
                    style={themed([
                      styles.modalPeriodBtn,
                      reschedulePeriod === p && styles.modalPeriodBtnActive,
                    ])}
                  >
                    <Text
                      style={themed([
                        styles.modalPeriodText,
                        reschedulePeriod === p && styles.modalPeriodTextActive,
                      ])}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Notes */}
              <TextInput
                placeholder="Reason for reschedule (optional)..."
                placeholderTextColor="#8A91A4"
                value={rescheduleNotes}
                onChangeText={setRescheduleNotes}
                style={themed(styles.modalInput)}
              />

              <ErrorText>{rescheduleError}</ErrorText>

              <View style={styles.modalActionRow}>
                <Pressable
                  disabled={rescheduling}
                  onPress={() => setRescheduleModalVisible(false)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Keep Current</Text>
                </Pressable>

                <Pressable
                  disabled={rescheduling}
                  onPress={handleRescheduleSubmit}
                  style={styles.modalConfirmBtn}
                >
                  {rescheduling ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Confirm Reschedule</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* CANCEL MODAL */}
        <Modal
          visible={cancelModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCancelModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={themed(styles.modalBox)}>
              <View style={styles.warningIconCircle}>
                <AlertTriangle size={32} color="#D33F49" />
              </View>
              <Text style={themed(styles.modalHeading)}>Cancel Booking?</Text>
              <Text style={themed(styles.modalSubheading)}>
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </Text>

              <View style={styles.cancelOptionsList}>
                {[
                  "Change of plans",
                  "Found alternative provider",
                  "Booked wrong service/date",
                  "Service no longer needed",
                  "Other",
                ].map((reason) => (
                  <Pressable
                    key={reason}
                    onPress={() => setCancelReason(reason)}
                    style={themed([
                      styles.cancelOptionRow,
                      cancelReason === reason && styles.cancelOptionSelected,
                    ])}
                  >
                    <View style={styles.radio}>
                      {cancelReason === reason && <View style={styles.radioDot} />}
                    </View>
                    <Text style={themed(styles.cancelOptionText)}>{reason}</Text>
                  </Pressable>
                ))}
              </View>

              {cancelReason === "Other" && (
                <TextInput
                  placeholder="Specify cancellation reason..."
                  placeholderTextColor="#8A91A4"
                  value={cancelCustomText}
                  onChangeText={setCancelCustomText}
                  style={themed(styles.modalInput)}
                />
              )}

              <ErrorText>{cancelError}</ErrorText>

              <View style={styles.modalActionRow}>
                <Pressable
                  disabled={cancelling}
                  onPress={() => setCancelModalVisible(false)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>No, Keep Booking</Text>
                </Pressable>

                <Pressable
                  disabled={cancelling}
                  onPress={handleCancelSubmit}
                  style={styles.modalDangerBtn}
                >
                  {cancelling ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Yes, Cancel</Text>
                  )}
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerRef: { fontSize: 16, fontWeight: "900", color: "#242E49" },
  headerSub: { fontSize: 11, color: "#8A91A4" },
  headerStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusActive: { backgroundColor: "#EEE8FF" },
  statusCompleted: { backgroundColor: "#DDF7F2" },
  statusCancelled: { backgroundColor: "#FDEAEA" },
  headerStatusText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  textActive: { color: "#633CFF" },
  textCompleted: { color: "#168A76" },
  textCancelled: { color: "#D33F49" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  cancelledBanner: {
    backgroundColor: "#FDEAEA",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  cancelledTitle: { fontSize: 14, fontWeight: "800", color: "#D33F49" },
  cancelledReason: { fontSize: 12, color: "#8A333A", marginTop: 2 },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EBE8F5",
  },
  cardHeading: { fontSize: 14, fontWeight: "800", color: "#242E49", marginBottom: 14 },
  stepperContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  stepItem: { flex: 1, alignItems: "center" },
  stepDotRow: { flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "center" },
  stepLine: { flex: 1, height: 2 },
  stepLineActive: { backgroundColor: "#633CFF" },
  stepLineInactive: { backgroundColor: "#E6EAF3" },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  stepDotDone: { backgroundColor: "#633CFF" },
  stepDotPending: { backgroundColor: "#E6EAF3" },
  stepDotCurrent: {
    borderWidth: 3,
    borderColor: "#D9D0FF",
    backgroundColor: "#633CFF",
  },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#8A91A4" },
  stepLabel: { fontSize: 10, color: "#8A91A4", marginTop: 8, textAlign: "center", fontWeight: "600" },
  stepLabelCurrent: { color: "#633CFF", fontWeight: "800" },
  stepLabelDone: { color: "#242E49", fontWeight: "700" },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EBE8F5",
  },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  serviceIconPill: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EEE8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceName: { fontSize: 16, fontWeight: "800", color: "#242E49" },
  serviceCategory: { fontSize: 12, color: "#7C879F", marginTop: 2 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEE8FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionChipText: { fontSize: 11, fontWeight: "800", color: "#633CFF" },
  scheduleRow: { flexDirection: "row", gap: 16 },
  scheduleItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  scheduleLabel: { fontSize: 11, color: "#8A91A4" },
  scheduleValue: { fontSize: 13, fontWeight: "800", color: "#242E49", marginTop: 2 },
  addressRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  addressText: { flex: 1, fontSize: 13, color: "#242E49", lineHeight: 19 },
  notesBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F7F7FD",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  notesText: { flex: 1, fontSize: 11, color: "#626980", fontStyle: "italic" },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  providerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#633CFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  providerName: { fontSize: 15, fontWeight: "800", color: "#242E49" },
  providerRatingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  providerRating: { fontSize: 12, fontWeight: "700", color: "#242E49" },
  providerCity: { fontSize: 12, color: "#8A91A4" },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F9D8A",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingProviderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  pendingProviderText: { flex: 1, fontSize: 12, color: "#7C879F", lineHeight: 18 },
  feeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  feeLabel: { fontSize: 12, color: "#626980" },
  feeValue: { fontSize: 12, fontWeight: "700", color: "#242E49" },
  divider: { height: 1, backgroundColor: "#EBE8F5", marginVertical: 8 },
  totalFeeLabel: { fontSize: 14, fontWeight: "800", color: "#242E49" },
  totalFeeValue: { fontSize: 16, fontWeight: "900", color: "#633CFF" },
  paymentStatusBadge: { marginTop: 12 },
  paidPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DDF7F2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  paidText: { fontSize: 12, fontWeight: "800", color: "#168A76" },
  unpaidPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF4E5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  unpaidText: { fontSize: 12, fontWeight: "800", color: "#B86500" },
  historyList: { gap: 12 },
  historyItem: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#633CFF", marginTop: 5 },
  historyNote: { fontSize: 12, fontWeight: "700", color: "#242E49" },
  historyDate: { fontSize: 10, color: "#8A91A4", marginTop: 1 },
  actionSection: { marginTop: 10, gap: 12 },
  primaryActionButton: {
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
  primaryActionText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  payButton: {
    backgroundColor: "#5B3DF5",
    borderRadius: 16,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  rateButton: {
    backgroundColor: "#0F9D8A",
    borderRadius: 16,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  rateButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  cancelLink: { alignItems: "center", paddingVertical: 12 },
  cancelLinkText: { color: "#D33F49", fontSize: 13, fontWeight: "700" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorTitle: { fontSize: 18, fontWeight: "800", color: "#242E49", marginTop: 12 },
  errorCopy: { fontSize: 13, color: "#7C879F", textAlign: "center", marginVertical: 8 },
  retryButton: {
    backgroundColor: "#633CFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 14, 38, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
  },
  modalHeading: { fontSize: 18, fontWeight: "800", color: "#242E49" },
  modalSubheading: { fontSize: 12, color: "#8A91A4", marginTop: 4, marginBottom: 12 },
  rescheduleDateTile: {
    width: 60,
    height: 84,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#EBE8F5",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  rescheduleDateTileActive: { backgroundColor: "#633CFF", borderColor: "#633CFF" },
  tileDay: { fontSize: 10, fontWeight: "800", color: "#8A91A4" },
  tileNumber: { fontSize: 18, fontWeight: "900", color: "#242E49" },
  tileMonth: { fontSize: 9, fontWeight: "700", color: "#8A91A4" },
  textWhite: { color: "#FFFFFF" },
  textWhiteSubtle: { color: "rgba(255,255,255,0.8)" },
  modalPeriodRow: { flexDirection: "row", gap: 8, marginVertical: 10 },
  modalPeriodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EBE8F5",
    backgroundColor: "#FFFFFF",
  },
  modalPeriodBtnActive: { backgroundColor: "#EEE8FF", borderColor: "#633CFF" },
  modalPeriodText: { fontSize: 12, fontWeight: "700", color: "#626980" },
  modalPeriodTextActive: { color: "#633CFF", fontWeight: "800" },
  modalInput: {
    backgroundColor: "#F7F7FD",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: "#242E49",
    borderWidth: 1,
    borderColor: "#EBE8F5",
    marginTop: 8,
  },
  modalActionRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  modalCancelBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#F2F0FA",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { color: "#626980", fontSize: 13, fontWeight: "700" },
  modalConfirmBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#633CFF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  modalDangerBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#D33F49",
    alignItems: "center",
    justifyContent: "center",
  },
  warningIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FDEAEA",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  cancelOptionsList: { gap: 8, marginVertical: 12 },
  cancelOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EBE8F5",
  },
  cancelOptionSelected: { borderColor: "#D33F49", backgroundColor: "#FEF7F7" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#8A91A4",
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D33F49" },
  cancelOptionText: { fontSize: 13, color: "#242E49" },
});
