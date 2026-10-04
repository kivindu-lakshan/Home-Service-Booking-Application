import { getMyBookings } from "@/api/domain";
import { ErrorState, LoadingState } from "@/components/DataState";
import { CustomerGuard, CustomerNav } from "@/components/customer/CustomerUI";
import { AccountText as Text } from "@/components/settings/AccountText";
import { Button, Input } from "@/components/ui";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { router, useFocusEffect } from "expo-router";
import {
    CalendarDays,
    ChevronRight,
    Clock3,
    MapPin,
    Plus,
    Search,
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

function statusLabel(status?: string) {
  return (status || "pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function dateLabel(value?: string) {
  if (!value) return "Date pending";
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function timeLabel(value?: string) {
  if (!value) return "Time pending";
  const parsed = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!parsed) return value;
  const hour = Number(parsed[1]);
  const suffix = parsed[3] || (hour >= 12 ? "PM" : "AM");
  return `${String(hour).padStart(2, "0")}:${parsed[2]} ${suffix.toUpperCase()}`;
}

function BookingCard({ booking }: { booking: any }) {
  const themed = useAccountStyles();
  const cancelled = booking.status === "cancelled";
  const completed = booking.status === "completed";
  const openDetails = () => {
    if (completed) {
      router.push({
        pathname: "/reviews/rate",
        params: { bookingId: booking._id },
      });
    } else if (!cancelled) {
      router.push({
        pathname: "/payment/details",
        params: { bookingId: booking._id },
      });
    }
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${booking.service?.name || "booking"}`}
      onPress={openDetails}
      disabled={cancelled}
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
            Ref: {booking.bookingRef || booking._id}
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
        </View>
        {!cancelled && (
          <View style={styles.detailsLink}>
            <Text style={themed(styles.detailsText)}>
              {completed ? "Rate Provider" : "View Details"}
            </Text>
            <ChevronRight size={19} color="#633CFF" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function BookingsScreen() {
  const themed = useAccountStyles();
  const [bookings, setBookings] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const response = await getMyBookings();
      setBookings(response.data.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
      const matchesQuery =
        !normalized ||
        `${booking.bookingRef || ""} ${booking.service?.name || ""}`
          .toLowerCase()
          .includes(normalized);
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && activeStatuses.has(booking.status)) ||
        (filter === "completed" && booking.status === "completed") ||
        (filter === "cancelled" && booking.status === "cancelled");
      return matchesQuery && matchesFilter;
    });
  }, [bookings, filter, query]);

  return (
    <CustomerGuard>
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
                  router.canGoBack() ? router.back() : router.replace("/")
                }
                style={themed(styles.backButton)}
              >
                <Text style={themed(styles.backArrow)}>‹</Text>
              </Pressable>
              <Text accessibilityRole="header" style={themed(styles.topTitle)}>
                My Bookings
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create a booking"
                onPress={() => router.push("/customer/services")}
                style={themed(styles.addButton)}
              >
                <Plus size={22} color="#633CFF" />
              </Pressable>
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
          <CustomerNav active="Bookings" />
        </View>
      </SafeAreaView>
    </CustomerGuard>
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
