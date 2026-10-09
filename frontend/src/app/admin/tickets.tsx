import { getAdminTickets } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { router, useFocusEffect } from "expo-router";
import { Headphones, Mail, MoreVertical } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

function initials(name?: string) {
  return (name || "Customer")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function priority(status: string) {
  if (status === "resolved") return "Low";
  if (status === "in_progress") return "High";
  return "Medium";
}
function due(status: string) {
  if (status === "resolved") return "Resolved";
  if (status === "in_progress") return "Response due in 5 hours";
  return "Response due in 24 hours";
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setTickets((await getAdminTickets()).data.data);
      setError("");
    } catch (failure: any) {
      setError(
        failure.response?.data?.message || "Unable to load support tickets.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(true);
    }, [load]),
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => void load(true), 5000);
    return () => clearInterval(timer);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load(true);
  };

  if (loading && !tickets.length)
    return <LoadingState label="Loading support tickets..." />;
  if (error && !tickets.length)
    return <ErrorState onRetry={() => void load()} />;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.replace("/admin/dashboard")}
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Customer Support</Text>
        <View style={styles.headerIcon}>
          <Headphones size={18} color="#5B3DF5" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!tickets.length ? (
          <EmptyState label="No customer tickets found." />
        ) : (
          tickets.map((ticket) => (
            <Pressable
              key={ticket._id}
              onPress={() =>
                router.push({
                  pathname: "/admin/ticket-details",
                  params: { id: ticket._id },
                })
              }
              style={({ pressed }) => [
                styles.ticket,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.ticketTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initials(ticket.customer?.fullName)}
                  </Text>
                </View>
                <View style={styles.ticketCopy}>
                  <View style={styles.customerRow}>
                    <Mail size={15} color="#747B90" />
                    <Text style={styles.customer}>
                      {ticket.customer?.fullName || "Customer"}
                    </Text>
                    <MoreVertical size={16} color="#747B90" />
                  </View>
                  <Text numberOfLines={1} style={styles.subject}>
                    {ticket.subject}{" "}
                    <Text style={styles.id}>
                      #{String(ticket._id).slice(-4)}
                    </Text>
                  </Text>
                  <Text style={styles.meta}>
                    {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    -{" "}
                    {ticket.adminResponse
                      ? "Response sent"
                      : due(ticket.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View
                style={[
                  styles.priority,
                  priority(ticket.status) === "High" && styles.high,
                  priority(ticket.status) === "Medium" && styles.medium,
                ]}
              >
                <View style={styles.priorityDot} />
                <Text style={styles.priorityText}>
                  {priority(ticket.status)}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7FB" },
  content: { padding: 16, paddingTop: 9, paddingBottom: 22 },
  ticket: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 13,
    marginBottom: 12,
  },
  pressed: { opacity: 0.75 },
  ticketTop: { flexDirection: "row", gap: 11 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#5B3DF5", fontSize: 13, fontWeight: "900" },
  ticketCopy: { flex: 1, minWidth: 0 },
  customerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  customer: { color: "#747B90", fontSize: 13, flex: 1 },
  subject: { color: "#25213D", fontSize: 13, fontWeight: "900", marginTop: 4 },
  id: { color: "#747B90", fontWeight: "500" },
  meta: { color: "#747B90", fontSize: 11, marginTop: 5 },
  divider: {
    height: 1,
    backgroundColor: "#E6EAF3",
    marginTop: 12,
    marginBottom: 10,
  },
  priority: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E6F5EE",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  medium: { backgroundColor: "#EDEBFF" },
  high: { backgroundColor: "#FCEFF1" },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0F9D8A",
  },
  priorityText: { color: "#25213D", fontSize: 12, fontWeight: "800" },
  error: { color: "#C0392B", marginBottom: 10 },
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
  backArrow: {
    color: "#5B3DF5",
    fontSize: 28,
    lineHeight: 32,
    marginTop: -2,
  },
  headerTitle: {
    color: "#25213D",
    fontSize: 18,
    fontWeight: "800",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
