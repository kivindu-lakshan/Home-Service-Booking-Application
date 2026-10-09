import { assignProvider, getAdminBookings, getAvailableProviders } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { router, useLocalSearchParams } from "expo-router";
import { MapPin, Search, Star } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function AssignProvider() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [providers, setProviders] = useState<any[]>([]);
  const [booking, setBooking] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [assigning, setAssigning] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [providersRes, bookingsRes] = await Promise.all([
        getAvailableProviders(bookingId),
        getAdminBookings({}).catch(() => null),
      ]);
      setProviders(providersRes.data.data);
      if (bookingsRes) {
        const found = (bookingsRes.data.data as any[]).find(
          (b: any) => b._id === bookingId,
        );
        if (found) setBooking(found);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to load providers.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const handleAssign = async (providerId: string) => {
    setAssigning(providerId);
    setError("");
    try {
      await assignProvider(bookingId, providerId);
      router.replace("/admin/bookings");
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to assign provider.");
      setAssigning("");
    }
  };

  const filteredProviders = providers.filter((p) => {
    if (!search.trim()) return true;
    const name = (p.user?.fullName || p.name || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  if (loading) return <LoadingState label="Loading available providers..." />;
  if (error && !providers.length)
    return (
      <ErrorState
        onRetry={() => {
          setLoading(true);
          load().catch(() => undefined);
        }}
      />
    );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Assign Provider</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Hero Card */}
        {booking && (
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroRef}>#{booking.bookingRef}</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Pending Assignment</Text>
              </View>
            </View>
            <Text style={styles.heroService}>
              {booking.service?.name || "Home Service"}
            </Text>
            <Text style={styles.heroCustomer}>
              {booking.customer?.fullName || "Customer"}
            </Text>
            {booking.scheduledDate && (
              <Text style={styles.heroMeta}>
                📅 Sep{" "}
                {new Date(booking.scheduledDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {booking.scheduledTime ? `, ${booking.scheduledTime}` : ""}
              </Text>
            )}
            {booking.address && (
              <View style={styles.heroAddressRow}>
                <MapPin size={12} color="#C4B8FF" />
                <Text style={styles.heroAddress}>
                  {booking.address.street || booking.address}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Available Providers</Text>

        {/* Provider Search */}
        <View style={styles.searchWrap}>
          <Search size={15} color="#B0B6C9" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search providers..."
            placeholderTextColor="#B0B6C9"
            style={styles.searchInput}
          />
        </View>

        {/* Provider List */}
        {filteredProviders.length === 0 ? (
          <EmptyState label="No eligible providers found." />
        ) : (
          filteredProviders.map((provider) => {
            const isSelected = selected === provider._id;
            const isBusy = assigning === provider._id;
            const name =
              provider.user?.fullName || provider.name || "Provider";
            const specialty =
              provider.specialization ||
              provider.serviceCategory ||
              "Home Service Specialist";
            const jobs = provider.completedJobs || provider.totalJobs || 0;
            const rating = Number(provider.ratingAvg || 0).toFixed(1);
            const available = provider.isAvailable !== false;
            const distance = provider.distanceKm
              ? `${provider.distanceKm} km away`
              : null;

            return (
              <View key={provider._id} style={styles.providerCard}>
                {/* Avatar */}
                <View style={styles.providerAvatarWrap}>
                  <View style={styles.providerAvatar}>
                    <Text style={styles.providerAvatarText}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.availabilityDot,
                      available
                        ? styles.availableDot
                        : styles.unavailableDot,
                    ]}
                  />
                </View>

                {/* Info */}
                <View style={styles.providerInfo}>
                  <View style={styles.providerNameRow}>
                    <Text style={styles.providerName}>{name}</Text>
                    <View style={styles.ratingBadge}>
                      <Star size={10} color="#F29D38" fill="#F29D38" />
                      <Text style={styles.ratingText}>{rating}</Text>
                    </View>
                  </View>
                  <Text style={styles.providerSpecialty}>
                    {specialty} • {jobs} jobs
                  </Text>
                  <View style={styles.providerBottomRow}>
                    <View
                      style={[
                        styles.availBadge,
                        available ? styles.availBadgeGreen : styles.availBadgeRed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.availText,
                          available
                            ? styles.availTextGreen
                            : styles.availTextRed,
                        ]}
                      >
                        {available ? "● Available" : "● Busy"}
                      </Text>
                    </View>
                    {distance && (
                      <Text style={styles.distanceText}>{distance}</Text>
                    )}
                  </View>
                </View>

                {/* Assign Button */}
                <Pressable
                  style={[
                    styles.assignBtn,
                    isSelected && styles.assignBtnSelected,
                    isBusy && { opacity: 0.6 },
                  ]}
                  onPress={() => {
                    setSelected(provider._id);
                    void handleAssign(provider._id);
                  }}
                  disabled={!!assigning}
                >
                  <Text
                    style={[
                      styles.assignBtnText,
                      isSelected && styles.assignBtnTextSelected,
                    ]}
                  >
                    {isBusy ? "..." : "Assign"}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}

        {!!error && (
          <Text style={styles.errorText}>{error}</Text>
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

  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  /* Hero Card */
  heroCard: {
    backgroundColor: "#1E1340",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  heroRef: { color: "#C4B8FF", fontSize: 12, fontWeight: "800" },
  pendingBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadgeText: { color: "#C4B8FF", fontSize: 10, fontWeight: "700" },
  heroService: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
  },
  heroCustomer: { color: "#C4B8FF", fontSize: 13, marginBottom: 8 },
  heroMeta: { color: "#C4B8FF", fontSize: 12, marginBottom: 6 },
  heroAddressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroAddress: { color: "#C4B8FF", fontSize: 12 },

  /* Section */
  sectionTitle: {
    color: "#25213D",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },

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

  /* Provider Card */
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#25213D",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  providerAvatarWrap: { position: "relative" },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  providerAvatarText: { color: "#5B3DF5", fontSize: 18, fontWeight: "900" },
  availabilityDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  availableDot: { backgroundColor: "#0F9D8A" },
  unavailableDot: { backgroundColor: "#E07C00" },

  providerInfo: { flex: 1 },
  providerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  providerName: { color: "#25213D", fontSize: 14, fontWeight: "800" },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FFF8EC",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: { color: "#E07C00", fontSize: 11, fontWeight: "700" },
  providerSpecialty: { color: "#747B90", fontSize: 11, marginBottom: 6 },
  providerBottomRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  availBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  availBadgeGreen: { backgroundColor: "#E5F8F5" },
  availBadgeRed: { backgroundColor: "#FFF4E5" },
  availText: { fontSize: 10, fontWeight: "700" },
  availTextGreen: { color: "#0F9D8A" },
  availTextRed: { color: "#E07C00" },
  distanceText: { color: "#B0B6C9", fontSize: 10 },

  /* Assign Button */
  assignBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#5B3DF5",
  },
  assignBtnSelected: { backgroundColor: "#0F9D8A" },
  assignBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  assignBtnTextSelected: { color: "#FFF" },

  errorText: { color: "#B73248", marginTop: 8, fontSize: 13 },
});
