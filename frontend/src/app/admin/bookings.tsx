import { getAdminBookings } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { router } from "expo-router";
import { LayoutGrid, Search } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FFF4E5", text: "#E07C00" },
  confirmed: { bg: "#E5F8F5", text: "#0F9D8A" },
  in_progress: { bg: "#E8E5FF", text: "#5B3DF5" },
  completed: { bg: "#E5F8F5", text: "#0F9D8A" },
  cancelled: { bg: "#FFE5E9", text: "#B73248" },
  assigned: { bg: "#EEF8FF", text: "#1B7FD4" },
};

function statusStyle(status: string) {
  return STATUS_COLORS[status] ?? { bg: "#F0F1F7", text: "#747B90" };
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        setBookings(
          (await getAdminBookings({ status, search: search || undefined })).data
            .data,
        );
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, search],
  );

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true).catch(() => undefined);
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Manage Bookings</Text>
        <View style={styles.headerIcon}>
          <LayoutGrid size={18} color="#5B3DF5" />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search */}
        <View style={styles.searchWrap}>
          <Search size={16} color="#B0B6C9" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load().catch(() => undefined)}
            placeholder="Search by booking ID or customer..."
            placeholderTextColor="#B0B6C9"
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setStatus(f.key)}
              style={[styles.chip, status === f.key && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  status === f.key && styles.chipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* List */}
        {loading ? (
          <LoadingState label="Loading bookings..." />
        ) : error ? (
          <ErrorState onRetry={() => load().catch(() => undefined)} />
        ) : bookings.length === 0 ? (
          <EmptyState label="No bookings found." />
        ) : (
          bookings.map((booking) => {
            const sc = statusStyle(booking.status);
            const hasProvider = !!booking.provider?.fullName || !!booking.provider?.user?.fullName;
            const providerName = booking.provider?.fullName || booking.provider?.user?.fullName || "Unassigned";
            return (
              <View key={booking._id} style={styles.card}>
                {/* Top Row */}
                <View style={styles.cardTopRow}>
                  <Text style={styles.refText}>#{booking.bookingRef}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {booking.status === "in_progress"
                        ? "Ongoing"
                        : (booking.status || "pending")
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </Text>
                  </View>
                </View>

                {/* Service Name */}
                <Text style={styles.serviceName}>
                  {booking.service?.name || "Home Service"}
                </Text>

                {/* Details */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>
                    {booking.customer?.fullName || "—"}
                  </Text>
                </View>
                {booking.scheduledDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date/Time</Text>
                    <Text style={styles.detailValue}>
                      {new Date(booking.scheduledDate).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                      {booking.scheduledTime ? `, ${booking.scheduledTime}` : ""}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Assigned to</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      !hasProvider && styles.unassignedText,
                    ]}
                  >
                    {hasProvider ? providerName : "Unassigned"}
                  </Text>
                </View>

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.viewBtn}
                    onPress={() =>
                      router.push({
                        pathname: "/admin/assign-provider",
                        params: { bookingId: booking._id },
                      })
                    }
                  >
                    <Text style={styles.viewBtnText}>View</Text>
                  </Pressable>
                  <Pressable
                    style={styles.assignBtn}
                    onPress={() =>
                      router.push({
                        pathname: "/admin/assign-provider",
                        params: { bookingId: booking._id },
                      })
                    }
                  >
                    <Text style={styles.assignBtnText}>Assign</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7FB" },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0EEF8",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F5FA",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: "#5B3DF5", fontSize: 28, lineHeight: 32, marginTop: -2 },
  headerTitle: { color: "#25213D", fontSize: 18, fontWeight: "800" },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  /* Search */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F0EEF8",
  },
  searchInput: { flex: 1, color: "#25213D", fontSize: 14 },

  /* Chips */
  chipsScroll: { marginBottom: 16 },
  chipsContent: { gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F1F7",
  },
  chipActive: { backgroundColor: "#5B3DF5" },
  chipText: { color: "#747B90", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#FFF", fontWeight: "700" },

  /* Booking Card */
  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#25213D",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  refText: { color: "#5B3DF5", fontSize: 12, fontWeight: "800" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  serviceName: {
    color: "#25213D",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 8,
  },
  detailLabel: { color: "#B0B6C9", fontSize: 12, width: 76 },
  detailValue: { color: "#25213D", fontSize: 12, fontWeight: "600", flex: 1 },
  unassignedText: { color: "#E07C00", fontWeight: "700" },
  cardDivider: { height: 1, backgroundColor: "#F0F1F7", marginVertical: 12 },

  /* Action Buttons */
  actionRow: { flexDirection: "row", gap: 10 },
  viewBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D0CBEA",
    alignItems: "center",
    justifyContent: "center",
  },
  viewBtnText: { color: "#5B3DF5", fontSize: 13, fontWeight: "700" },
  assignBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#5B3DF5",
    alignItems: "center",
    justifyContent: "center",
  },
  assignBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
});
