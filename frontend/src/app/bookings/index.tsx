import { getBookings, type Booking } from "@/api/bookings";
import { CustomerNav } from "@/components/customer/CustomerUI";
import { ErrorState, LoadingState } from "@/components/DataState";
import { AccountText as Text } from "@/components/settings/AccountText";
import { Button, Input } from "@/components/ui";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Redirect, router, useFocusEffect } from "expo-router";
import {
    CalendarDays,
    ChevronRight,
    Clock3,
    MapPin,
    Plus,
    Search,
    Star,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Filter = "all" | "active" | "completed" | "cancelled";
const filters: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Upcoming / Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];
const activeStatuses = new Set([
  "pending",
  "confirmed",
  "assigned",
  "en_route",
  "arrived",
  "in_progress",
]);

const statusLabel = (status: string) =>
  status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateLabel = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "Date pending";
const timeLabel = (value?: string) => value || "Time pending";

function BookingCard({ booking }: { booking: Booking }) {
  const themed = useAccountStyles();
  const cancelled = booking.status === "cancelled";
  const completed = booking.status === "completed";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${booking.service?.name || "booking"}`}
      onPress={() =>
        router.push({ pathname: "/bookings/[id]", params: { id: booking._id } })
      }
      style={themed(({ pressed }) => [
        styles.bookingCard,
        pressed && styles.pressed,
        cancelled && styles.cancelledCard,
      ])}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeading}>
          <Text style={themed(styles.serviceName)}>
            {booking.service?.name || "Service booking"}
          </Text>
          <Text style={themed(styles.reference)}>
            Ref: {booking.bookingRef}
          </Text>
        </View>
        <View
          style={themed([
            styles.statusBadge,
            cancelled && styles.cancelledBadge,
            completed && styles.completedBadge,
          ])}
        >
          <Text
            style={themed([
              styles.statusText,
              cancelled && styles.cancelledText,
              completed && styles.completedText,
            ])}
          >
            {statusLabel(booking.status)}
          </Text>
        </View>
      </View>
      <View style={themed(styles.divider)} />
      <View style={styles.detailRow}>
        <CalendarDays size={18} color="#633CFF" />
        <Text style={themed(styles.detailText)}>
          {dateLabel(booking.scheduledDate)}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Clock3 size={18} color="#633CFF" />
        <Text style={themed(styles.detailText)}>
          {timeLabel(booking.scheduledTime)}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <MapPin size={18} color="#8A97B1" />
        <Text numberOfLines={1} style={themed(styles.location)}>
          {booking.addressSnapshot || "Address to be confirmed"}
        </Text>
      </View>
      <View style={themed(styles.divider)} />
      <View style={styles.cardFooter}>
        <View>
          <Text style={themed(styles.fareLabel)}>ESTIMATED FARE</Text>
          <Text style={themed(styles.fare)}>
            LKR{" "}
            {Number(
              booking.totalPrice || booking.serviceFee || 0,
            ).toLocaleString()}
          </Text>
          <Text style={themed(styles.paymentModeText)}>
            {booking.paymentMode === "pay_now" ? "Paid" : "Pay on completion"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {completed && (
            <Pressable
              onPress={() => router.push({ pathname: "/reviews/rate", params: { bookingId: booking._id } })}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF8EC", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
            >
              <Star size={14} color="#E07C00" fill="#E07C00" />
              <Text style={{ color: "#E07C00", fontSize: 12, fontWeight: "800" }}>Review</Text>
            </Pressable>
          )}
          <View style={styles.detailsLink}>
            <Text style={themed(styles.detailsText)}>View Details</Text>
            <ChevronRight size={19} color="#633CFF" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function BookingsScreen() {
  const themed = useAccountStyles();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(false);
      try {
        const response = await getBookings({
          filter: filter === "all" ? undefined : filter,
          search: query.trim() || undefined,
        });
        setBookings(response.data.data || []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter, query],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.resolve().then(() => {
        if (active) void load();
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const visibleBookings = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (!normalized) return true;
      return `${booking.bookingRef} ${booking.service?.name || ""} ${booking.addressSnapshot || ""}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [bookings, query]);

  if (authLoading) return <LoadingState />;
  if (!user) return <Redirect href="/auth/login" />;

  const isProvider = user.role === "provider";

  return (
    <SafeAreaView style={themed(styles.safe)}>
      <View style={styles.page}>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
            />
          }
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace(isProvider ? "/provider/dashboard" : "/")
              }
              style={themed(styles.backButton)}
            >
              <Text style={themed(styles.backArrow)}>‹</Text>
            </Pressable>
            <Text accessibilityRole="header" style={themed(styles.topTitle)}>
              {isProvider ? "Assigned Jobs" : "My Bookings"}
            </Text>
            {!isProvider ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create a booking"
                onPress={() => router.push("/bookings/new")}
                style={themed(styles.addButton)}
              >
                <Plus size={22} color="#633CFF" />
              </Pressable>
            ) : (
              <View style={{ width: 48 }} />
            )}
          </View>
            <Text style={themed(styles.title)}>
              Keep track of your bookings
            </Text>
            <Text style={themed(styles.subtitle)}>
              Review upcoming dates, track providers, and manage appointments.
            </Text>
            <View style={styles.searchWrap}>
              <Search size={21} color="#8B98B2" />
              <Input
                accessibilityLabel="Search bookings"
                placeholder="Search by reference or service name..."
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {filters.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  style={themed([
                    styles.filter,
                    filter === item.value && styles.activeFilter,
                  ])}
                >
                  <Text
                    style={themed([
                      styles.filterText,
                      filter === item.value && styles.activeFilterText,
                    ])}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {loading ? (
              <LoadingState label="Loading bookings..." />
            ) : error ? (
              <ErrorState onRetry={() => void load()} />
            ) : visibleBookings.length ? (
              visibleBookings.map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))
            ) : (
              <View style={styles.empty}>
                <Text style={themed(styles.emptyTitle)}>No bookings found</Text>
                <Text style={themed(styles.emptyCopy)}>
                  {query || filter !== "all"
                    ? "Try another search or filter."
                    : "Your confirmed services will appear here."}
                </Text>
                <Button onPress={() => router.push("/customer/services")}>
                  Browse services
                </Button>
              </View>
            )}
          </ScrollView>
          {user.role === "customer" && <CustomerNav active="Bookings" />}
        </View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7FD" },
  page: { flex: 1, width: "100%", maxWidth: 680, alignSelf: "center" },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 22 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  backButton: {
    width: 54,
    height: 54,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: "#633CFF", fontSize: 34, lineHeight: 38, marginTop: -4 },
  topTitle: { color: "#182342", fontSize: 23, fontWeight: "900" },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EEE8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#242E49", fontSize: 30, lineHeight: 38, fontWeight: "900" },
  subtitle: {
    color: "#7D89A1",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 20,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3E6F0",
    borderRadius: 18,
    paddingLeft: 18,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "transparent",
    marginBottom: 0,
    minHeight: 56,
  },
  filters: { gap: 10, paddingBottom: 22 },
  filter: {
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E3E6F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  activeFilter: { backgroundColor: "#633CFF", borderColor: "#633CFF" },
  filterText: { color: "#5F6B84", fontSize: 14, fontWeight: "800" },
  activeFilterText: { color: "#FFFFFF" },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7F0",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
  },
  cancelledCard: { opacity: 0.96 },
  pressed: { opacity: 0.7 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHeading: { flex: 1 },
  serviceName: { color: "#26324F", fontSize: 20, fontWeight: "900" },
  reference: { color: "#8A97B1", fontSize: 12, marginTop: 5 },
  statusBadge: {
    backgroundColor: "#E5F7F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelledBadge: { backgroundColor: "#FDE7E6" },
  completedBadge: { backgroundColor: "#EDE8FF" },
  statusText: { color: "#1F8A6D", fontSize: 12, fontWeight: "900" },
  cancelledText: { color: "#D34445" },
  completedText: { color: "#633CFF" },
  divider: { height: 1, backgroundColor: "#ECEEF5", marginVertical: 14 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  detailText: { color: "#26324F", fontSize: 15, fontWeight: "800" },
  location: { flex: 1, color: "#8190AB", fontSize: 14 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  fareLabel: {
    color: "#8995AA",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  fare: { color: "#633CFF", fontSize: 19, fontWeight: "900", marginTop: 3 },
  paymentModeText: { color: "#8190AB", fontSize: 11, fontWeight: "700", marginTop: 4, textTransform: "uppercase" },
  detailsLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  detailsText: { color: "#633CFF", fontSize: 14, fontWeight: "900" },
  empty: { alignItems: "center", paddingVertical: 44, gap: 10 },
  emptyTitle: { color: "#26324F", fontSize: 20, fontWeight: "900" },
  emptyCopy: {
    color: "#8190AB",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
});
