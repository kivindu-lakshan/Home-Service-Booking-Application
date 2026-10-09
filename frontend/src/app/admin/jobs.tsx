import { getAdminJobs } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { router } from "expo-router";
import { RefreshCw } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "en_route", label: "On Way" },
  { key: "in_progress", label: "In Progress" },
  { key: "arrived", label: "Active" },
  { key: "completed", label: "Done" },
];

const JOB_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  assigned: { bg: "#E8E5FF", text: "#5B3DF5" },
  en_route: { bg: "#FFF4E5", text: "#E07C00" },
  arrived: { bg: "#EEF8FF", text: "#1B7FD4" },
  in_progress: { bg: "#E5F8F5", text: "#0F9D8A" },
  completed: { bg: "#E5F8F5", text: "#0F9D8A" },
  cancelled: { bg: "#FFE5E9", text: "#B73248" },
};

// Job progress stages
const JOB_STAGES = ["confirmed", "en_route", "arrived", "completed"];

function getStageIndex(status: string) {
  const map: Record<string, number> = {
    assigned: 0,
    confirmed: 0,
    en_route: 1,
    arrived: 2,
    in_progress: 2,
    completed: 3,
  };
  return map[status] ?? 0;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    assigned: "Confirmed",
    confirmed: "Confirmed",
    en_route: "On Way",
    arrived: "Active",
    in_progress: "In Progress",
    completed: "Done",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

function JobProgressBar({ status }: { status: string }) {
  const activeIdx = getStageIndex(status);
  const stageLabels = ["Confirmed", "On Way", "Active", "Done"];
  const stageColors = ["#5B3DF5", "#E07C00", "#0F9D8A", "#0F9D8A"];

  return (
    <View style={pb.wrap}>
      {stageLabels.map((label, i) => (
        <View key={label} style={pb.segment}>
          <View
            style={[
              pb.bar,
              i <= activeIdx
                ? { backgroundColor: stageColors[i] }
                : pb.barInactive,
            ]}
          />
          <Text style={[pb.label, i <= activeIdx && { color: stageColors[i] }]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const pb = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 4, marginTop: 12 },
  segment: { flex: 1, alignItems: "center", gap: 4 },
  bar: { height: 4, width: "100%", borderRadius: 2 },
  barInactive: { backgroundColor: "#EEF0F8" },
  label: { color: "#C0C6D9", fontSize: 9, fontWeight: "600" },
});

export default function AdminJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        setJobs((await getAdminJobs({ status })).data.data);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status],
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
        <Text style={styles.headerTitle}>Job Monitor</Text>
        <Pressable
          style={styles.refreshBtn}
          onPress={onRefresh}
        >
          <RefreshCw size={18} color="#5B3DF5" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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

        {/* Job List */}
        {loading ? (
          <LoadingState label="Loading jobs..." />
        ) : error ? (
          <ErrorState onRetry={() => load().catch(() => undefined)} />
        ) : jobs.length === 0 ? (
          <EmptyState label="No active jobs found." />
        ) : (
          jobs.map((job) => {
            const sc =
              JOB_STATUS_COLORS[job.status] ?? {
                bg: "#F0F1F7",
                text: "#747B90",
              };
            const customerName = job.customer?.fullName || "Customer";
            const providerName =
              job.provider?.user?.fullName ||
              job.provider?.fullName ||
              "Provider";
            const serviceName = job.service?.name || "Home Service";
            const etaText = job.etaMinutes
              ? `ETA: ${job.etaMinutes} mins`
              : job.startedAt
                ? `Started: ${new Date(job.startedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} • Ongoing`
                : null;

            return (
              <View key={job._id} style={styles.card}>
                {/* Top Row */}
                <View style={styles.cardTopRow}>
                  <Text style={styles.refText}>#{job.bookingRef}</Text>
                  <View
                    style={[styles.statusBadge, { backgroundColor: sc.bg }]}
                  >
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {statusLabel(job.status)}
                    </Text>
                  </View>
                </View>

                {/* Service Name */}
                <Text style={styles.serviceName}>{serviceName}</Text>

                {/* Details */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>{customerName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Provider</Text>
                  <Text style={styles.detailValue}>{providerName}</Text>
                </View>
                {etaText && (
                  <View style={styles.detailRow}>
                    <Text style={styles.etaText}>{etaText}</Text>
                  </View>
                )}

                {/* Progress Bar */}
                <JobProgressBar status={job.status} />
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
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

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

  /* Card */
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
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },
  serviceName: {
    color: "#25213D",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  detailLabel: { color: "#B0B6C9", fontSize: 12, width: 70 },
  detailValue: { color: "#25213D", fontSize: 12, fontWeight: "600", flex: 1 },
  etaText: { color: "#747B90", fontSize: 12, fontStyle: "italic" },
});
