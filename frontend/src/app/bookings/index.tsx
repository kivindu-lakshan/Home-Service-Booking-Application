import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Calendar,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Search,
  Sparkles,
} from "lucide-react-native";
import { getBookings, type Booking } from "@/api/bookings";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { Card } from "@/components/ui";
import { ProfileBackButton, ProfileNavigation } from "@/components/profile/ProfileNavigation";
import { useAuth } from "@/context/AuthContext";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { AccountText as Text } from "@/components/settings/AccountText";

const filterTabs = [
  { key: "all", label: "All" },
  { key: "active", label: "Upcoming / Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export default function BookingsScreen() {
  const { user } = useAuth();
  const themed = useAccountStyles();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const isProvider = user?.role === "provider";
  const isAdmin = user?.role === "admin";

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(false);

      try {
        const response = await getBookings({
          filter: activeTab === "all" ? undefined : activeTab,
          search: searchQuery.trim() || undefined,
        });
        setBookings(response.data.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, searchQuery],
  );

  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin/dashboard");
      return;
    }
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load, isAdmin]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "#DDF7F2", text: "#168A76" };
      case "cancelled":
        return { bg: "#FDEAEA", text: "#D33F49" };
      case "en_route":
      case "arrived":
      case "in_progress":
        return { bg: "#FFF4E5", text: "#B86500" };
      case "assigned":
        return { bg: "#EBF3FF", text: "#1E6FD9" };
      default:
        return { bg: "#EEE8FF", text: "#633CFF" };
    }
  };

  return (
    <SafeAreaView style={themed(styles.safe)}>
      <View style={themed(styles.shell)}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <ProfileBackButton
            label="Back"
            onPress={() =>
              isProvider
                ? router.replace("/provider/dashboard")
                : router.canGoBack()
                ? router.back()
                : router.replace("/")
            }
          />
          <Text style={themed(styles.headerTitle)}>
            {isProvider ? "Assigned Jobs" : "My Bookings"}
          </Text>
          {!isProvider ? (
            <Pressable
              onPress={() => router.push("/services")}
              style={styles.newBookingBtn}
            >
              <Plus size={16} color="#633CFF" />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
            />
          }
        >
          <Text style={themed(styles.title)}>
            {isProvider ? "Manage your schedule" : "Keep track of your bookings"}
          </Text>
          <Text style={themed(styles.subtitle)}>
            {isProvider
              ? "All services assigned to your professional profile."
              : "Review upcoming dates, track providers, and manage appointments."}
          </Text>

          {/* Search Box */}
          <View style={themed(styles.searchBox)}>
            <Search size={18} color="#8A91A4" />
            <TextInput
              placeholder="Search by reference or service name..."
              placeholderTextColor="#8A91A4"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => void load()}
              style={themed(styles.searchInput)}
            />
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScroll}
          >
            {filterTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={themed([
                    styles.tabChip,
                    isActive && styles.tabChipActive,
                  ])}
                >
                  <Text
                    style={themed([
                      styles.tabText,
                      isActive && styles.tabTextActive,
                    ])}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* List or States */}
          {loading ? (
            <LoadingState label="Loading bookings..." />
          ) : error ? (
            <ErrorState onRetry={() => void load()} />
          ) : bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                label={
                  searchQuery.trim()
                    ? "No bookings match your search query."
                    : activeTab !== "all"
                    ? `No ${activeTab} bookings found.`
                    : "You haven't scheduled any services yet."
                }
              />
              {!isProvider && (
                <Pressable
                  onPress={() => router.push("/services")}
                  style={styles.bookNowCTA}
                >
                  <Sparkles size={16} color="#FFFFFF" />
                  <Text style={styles.bookNowCTAText}>Explore Services & Book Now</Text>
                </Pressable>
              )}
            </View>
          ) : (
            bookings.map((b) => {
              const statusColors = getStatusColor(b.status);
              return (
                <Pressable
                  key={b._id}
                  onPress={() =>
                    router.push({
                      pathname: "/bookings/[id]",
                      params: { id: b._id },
                    })
                  }
                  style={({ pressed }) => [
                    themed(styles.bookingCard),
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={themed(styles.serviceName)}>
                        {b.service?.name || "Home Service"}
                      </Text>
                      <Text style={themed(styles.bookingRef)}>
                        Ref: {b.bookingRef}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColors.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: statusColors.text },
                        ]}
                      >
                        {b.status.replace("_", " ")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.cardBody}>
                    <View style={styles.metaRow}>
                      <Calendar size={15} color="#633CFF" />
                      <Text style={themed(styles.metaText)}>
                        {b.scheduledDate
                          ? new Date(b.scheduledDate).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "Date pending"}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <Clock size={15} color="#633CFF" />
                      <Text style={themed(styles.metaText)}>
                        {b.scheduledTime || b.timePeriod}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <MapPin size={15} color="#8A91A4" />
                      <Text
                        numberOfLines={1}
                        style={themed(styles.addressText)}
                      >
                        {b.addressSnapshot}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={themed(styles.priceLabel)}>ESTIMATED FARE</Text>
                      <Text style={themed(styles.priceValue)}>
                        LKR {Number(b.totalPrice || 0).toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.viewDetailsRow}>
                      <Text style={styles.viewDetailsText}>View Details</Text>
                      <ChevronRight size={16} color="#633CFF" />
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        {!isProvider && <ProfileNavigation active="bookings" />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7FD" },
  shell: { flex: 1, maxWidth: 540, width: "100%", alignSelf: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#242E49" },
  newBookingBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EEE8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "900", color: "#242E49" },
  subtitle: { fontSize: 13, color: "#7C879F", marginTop: 4, marginBottom: 16 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#EBE8F5",
    marginBottom: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#242E49" },
  tabScroll: { gap: 8, marginBottom: 18 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBE8F5",
  },
  tabChipActive: { backgroundColor: "#633CFF", borderColor: "#633CFF" },
  tabText: { fontSize: 12, fontWeight: "700", color: "#626980" },
  tabTextActive: { color: "#FFFFFF" },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EBE8F5",
    shadowColor: "#242E49",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  serviceName: { fontSize: 16, fontWeight: "800", color: "#242E49" },
  bookingRef: { fontSize: 11, color: "#8A91A4", marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  divider: { height: 1, backgroundColor: "#F2F0FA", marginVertical: 12 },
  cardBody: { gap: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 12, color: "#242E49", fontWeight: "700" },
  addressText: { fontSize: 12, color: "#7C879F", flex: 1 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F2F0FA",
  },
  priceLabel: { fontSize: 9, fontWeight: "800", color: "#8A91A4", letterSpacing: 0.5 },
  priceValue: { fontSize: 15, fontWeight: "900", color: "#633CFF", marginTop: 1 },
  viewDetailsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewDetailsText: { fontSize: 13, fontWeight: "800", color: "#633CFF" },
  emptyContainer: { alignItems: "center", paddingVertical: 20 },
  bookNowCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#633CFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14,
  },
  bookNowCTAText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
