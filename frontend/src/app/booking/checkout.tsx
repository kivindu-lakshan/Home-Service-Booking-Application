import { createBooking } from "@/api/domain";
import { getServices, type Service } from "@/api/services";
import ErrorText from "@/components/ErrorText";
import { Button } from "@/components/ui";
import { router, useLocalSearchParams } from "expo-router";
import {
    ChevronDown,
    ChevronLeft,
    MoreVertical,
    Star,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const periods = [
  { key: "morning" as const, label: "Morning" },
  { key: "afternoon" as const, label: "Afternoon" },
  { key: "evening" as const, label: "Night" },
];
const times = {
  morning: [
    "06:00 AM",
    "07:00 AM",
    "08:00 AM",
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
  ],
  afternoon: ["01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"],
  evening: ["06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM"],
};

function dayOptions() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      day: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      date: date.toLocaleDateString("en-US", { day: "2-digit" }),
      month: date.toLocaleDateString("en-US", { month: "short" }),
    };
  });
}

export default function BookingCheckout() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedDate, setSelectedDate] = useState(dayOptions()[0].value);
  const [period, setPeriod] = useState<"morning" | "afternoon" | "evening">(
    "morning",
  );
  const [selectedTime, setSelectedTime] = useState(times.morning[0]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const days = useMemo(() => dayOptions(), []);
  useEffect(() => {
    getServices(false)
      .then((items) => {
        const found = items.find((item) => item._id === serviceId) || null;
        setService(found);
        setSelectedProvider(found?.assignedProviders?.[0]?._id || "");
        setError(found ? "" : "This service is not available.");
      })
      .catch(() => setError("Unable to load this service."))
      .finally(() => setLoading(false));
  }, [serviceId]);
  useEffect(() => {
    setSelectedTime(times[period][0]);
  }, [period]);
  const book = async () => {
    if (!service || !selectedProvider || !selectedTime)
      return setError("Choose a provider and time before booking.");
    setBusy(true);
    setError("");
    try {
      const response = await createBooking({
        serviceId: service._id,
        providerId: selectedProvider,
        scheduledDate: selectedDate,
        timePeriod: period,
        scheduledTime: selectedTime,
      });
      router.replace({
        pathname: "/payment/details",
        params: { bookingId: response.data.data._id },
      });
    } catch (failure: any) {
      setError(failure.response?.data?.message || "Unable to create booking.");
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading booking options...</Text>
      </View>
    );
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.circle}
        >
          <ChevronLeft size={20} color="#25213D" />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.month}>
            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </Text>
          <ChevronDown size={15} color="#25213D" />
        </View>
        <View style={styles.circle}>
          <MoreVertical size={19} color="#25213D" />
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.days}
      >
        {days.map((day) => (
          <Pressable
            key={day.value}
            onPress={() => setSelectedDate(day.value)}
            style={[styles.day, selectedDate === day.value && styles.dayActive]}
          >
            <Text
              style={[
                styles.dayText,
                selectedDate === day.value && styles.activeText,
              ]}
            >
              {day.day}
            </Text>
            <Text
              style={[
                styles.dayNumber,
                selectedDate === day.value && styles.activeText,
              ]}
            >
              {day.date}
            </Text>
            <Text
              style={[
                styles.dayMonth,
                selectedDate === day.value && styles.activeText,
              ]}
            >
              {day.month}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.sectionTitle}>Preferred Professional</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.providers}
      >
        {service?.assignedProviders?.map((provider) => (
          <Pressable
            key={provider._id}
            onPress={() => setSelectedProvider(provider._id)}
            style={[
              styles.provider,
              selectedProvider === provider._id && styles.providerActive,
            ]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(provider.user?.fullName || "Provider")
                  .slice(0, 1)
                  .toUpperCase()}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.providerName}>
              {provider.user?.fullName || "Provider"}
            </Text>
            <View style={styles.rating}>
              <Star size={11} color="#F4F5FA" fill="#F4F5FA" />
              <Text style={styles.ratingText}>
                {Number(provider.ratingAvg || 0).toFixed(1)}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {!service?.assignedProviders?.length && (
        <Text style={styles.muted}>
          No providers are assigned to this service yet.
        </Text>
      )}
      <Text style={styles.sectionTitle}>Choose time</Text>
      <View style={styles.periods}>
        {periods.map((option) => (
          <Pressable
            key={option.key}
            onPress={() => setPeriod(option.key)}
            style={[
              styles.period,
              period === option.key && styles.periodActive,
            ]}
          >
            <Text
              style={[
                styles.periodText,
                period === option.key && styles.activeText,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.timeGrid}>
        {times[period].map((time) => (
          <Pressable
            key={time}
            onPress={() => setSelectedTime(time)}
            style={[styles.time, selectedTime === time && styles.timeActive]}
          >
            <Text
              style={[
                styles.timeText,
                selectedTime === time && styles.activeText,
              ]}
            >
              {time}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.priceRow}>
        <View>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.price}>
            LKR {Number(service?.basePrice || 0).toLocaleString()}/hour
          </Text>
        </View>
        <Button onPress={() => void book()}>
          {busy ? "Booking..." : "Book"}
        </Button>
      </View>
      <ErrorText>{error}</ErrorText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7FB" },
  content: { padding: 20, paddingBottom: 32 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F7FB",
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 5 },
  month: { color: "#25213D", fontSize: 16, fontWeight: "800" },
  days: { gap: 8, paddingBottom: 25 },
  day: {
    width: 47,
    height: 70,
    borderRadius: 16,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  dayActive: { backgroundColor: "#5B3DF5" },
  dayText: { color: "#747B90", fontSize: 10, fontWeight: "700" },
  dayNumber: { color: "#25213D", fontSize: 15, fontWeight: "900" },
  dayMonth: { color: "#747B90", fontSize: 9 },
  activeText: { color: "#FFF" },
  sectionTitle: {
    color: "#25213D",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },
  providers: { gap: 10, paddingBottom: 25 },
  provider: {
    width: 94,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFF",
  },
  providerActive: { borderColor: "#5B3DF5", backgroundColor: "#EDEBFF" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0F9D8A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  avatarText: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  providerName: {
    color: "#25213D",
    fontSize: 11,
    fontWeight: "800",
    maxWidth: 78,
  },
  rating: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 5 },
  ratingText: { color: "#747B90", fontSize: 10 },
  periods: {
    flexDirection: "row",
    backgroundColor: "#EDEBFF",
    borderRadius: 17,
    padding: 4,
    marginBottom: 12,
  },
  period: {
    flex: 1,
    minHeight: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  periodActive: { backgroundColor: "#5B3DF5" },
  periodText: { color: "#747B90", fontSize: 11, fontWeight: "800" },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 22,
  },
  time: {
    width: "30%",
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  timeActive: { backgroundColor: "#5B3DF5" },
  timeText: { color: "#747B90", fontSize: 10, fontWeight: "700" },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
  },
  priceLabel: { color: "#747B90", fontSize: 11, marginBottom: 3 },
  price: { color: "#25213D", fontSize: 16, fontWeight: "900" },
  muted: { color: "#747B90", fontSize: 13 },
});
