import { getAdminDashboard } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { router } from "expo-router";
import {
    BarChart3,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    MessageSquareText,
    ShieldCheck,
    UserRound,
    UsersRound,
    WalletCards,
    Wrench,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const C = {
  navy: "#1A1A2E",
  purple: "#5B3DF5",
  border: "#D1D1D6",
  gold: "#FBBF24",
  white: "#FFFFFF",
  muted: "#8E8E9A",
};
type Section =
  | "Overview"
  | "Bookings"
  | "Payments"
  | "Reviews"
  | "Users"
  | "Tickets";
const sections: Section[] = [
  "Overview",
  "Bookings",
  "Payments",
  "Reviews",
  "Users",
  "Tickets",
];

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>("Overview");
  const [data, setData] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      setError(false);
      setData((await getAdminDashboard()).data.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  if (loading) return <LoadingState label="Loading admin dashboard..." />;
  if (error)
    return (
      <ErrorState
        onRetry={() => {
          setLoading(true);
          void load();
        }}
      />
    );
  const metrics = [
    ["Total bookings", data.totalBookings, ClipboardList],
    ["Pending", data.pending, Wrench],
    ["Ongoing", data.ongoing, BarChart3],
    ["Completed", data.completed, CheckCircle2],
    ["Available providers", data.availableProviders, UsersRound],
  ] as const;
  return (
    <View style={{ flex: 1, backgroundColor: "#F7F7FD" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => void load()} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
      >
        <View
          style={{
            backgroundColor: C.navy,
            paddingTop: insets.top + 20,
            paddingHorizontal: 20,
            paddingBottom: 28,
          }}
        >
          <View style={styles.row}>
            <View>
              <Text style={styles.overline}>OPERATIONS</Text>
              <Text style={styles.heroTitle}>Admin dashboard</Text>
            </View>
            <Pressable
              accessibilityLabel="Open admin profile"
              onPress={() => router.push("/admin/profile")}
              style={styles.iconCircle}
            >
              <UserRound size={21} color={C.white} />
            </Pressable>
          </View>
          <View style={[styles.row, { marginTop: 24 }]}>
            <View>
              <Text style={styles.heroMuted}>Live database overview</Text>
              <Text style={styles.heroAmount}>{data.totalBookings}</Text>
              <Text style={styles.heroMuted}>total bookings</Text>
            </View>
            <BarChart3 size={32} color={C.gold} />
          </View>
        </View>
        <View style={styles.body}>
          <Action title="Service Management" subtitle="Create, edit and organise your service catalogue." icon={<Wrench size={21} color={C.purple} />} onPress={() => router.push("/admin/services")} />
          <View style={styles.metricGrid}>
            {metrics.map(([label, value, Icon]) => (
              <View key={label} style={styles.metric}>
                <Icon size={18} color={C.purple} />
                <Text style={styles.metricLabel}>{label}</Text>
                <Text style={styles.metricValue}>{value}</Text>
              </View>
            ))}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {sections.map((item) => (
              <Pressable
                key={item}
                onPress={() => setSection(item)}
                style={[styles.tab, section === item && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    section === item && styles.tabTextActive,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {section === "Overview" && <Overview data={data} />}
          {section === "Bookings" && (
            <Action
              title="Booking management"
              subtitle="Search, filter, and assign real bookings."
              icon={<ClipboardList size={21} color={C.purple} />}
              onPress={() => router.push("/admin/bookings")}
            />
          )}
          {section === "Payments" && (
            <Action
              title="Payment records"
              subtitle="Review payment status through booking management."
              icon={<WalletCards size={21} color={C.purple} />}
              onPress={() => router.push("/admin/bookings")}
            />
          )}
          {section === "Reviews" && (
            <Action
              title="Provider reviews"
              subtitle="Reviews are stored against completed bookings and providers."
              icon={<CheckCircle2 size={21} color={C.purple} />}
              onPress={() => router.push("/admin/bookings")}
            />
          )}
          {section === "Users" && (
            <Action
              title="User management"
              subtitle="Admin authorization protects management APIs."
              icon={<UsersRound size={21} color={C.purple} />}
              onPress={() => router.push("/admin/bookings")}
            />
          )}
          {section === "Tickets" && (
            <Action
              title="Customer support"
              subtitle="Reply to and resolve customer complaints."
              icon={<MessageSquareText size={21} color={C.purple} />}
              onPress={() => router.push("/admin/tickets")}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
function Overview({ data }: { data: any }) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Needs attention</Text>
          <Text style={styles.sectionSubtitle}>
            Recent activity from MongoDB Atlas
          </Text>
        </View>
        <ShieldCheck size={21} color={C.purple} />
      </View>
      {data.recentActivity?.length ? (
        data.recentActivity.map((activity: any) => (
          <View key={activity._id} style={styles.activity}>
            <View style={styles.activityIcon}>
              <CheckCircle2 size={18} color={C.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>{activity.action}</Text>
              <Text style={styles.activitySubtitle}>
                {new Date(activity.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <EmptyState label="No recent activities." />
      )}
      <Action
        title="Monitor active jobs"
        subtitle="Review live assignment and progress statuses."
        icon={<Wrench size={21} color={C.purple} />}
        onPress={() => router.push("/admin/jobs")}
      />
      <Action
        title="Customer support"
        subtitle="Reply to open complaints and service questions."
        icon={<MessageSquareText size={21} color={C.purple} />}
        onPress={() => router.push("/admin/tickets")}
      />
    </View>
  );
}
function Action({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.action}>
      <View style={styles.actionIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={19} color={C.muted} />
    </Pressable>
  );
}
const styles = {
  body: { padding: 20, width: "100%" as const, maxWidth: 760, alignSelf: "center" as const },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  overline: {
    color: C.gold,
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: C.white,
    fontSize: 27,
    fontWeight: "900" as const,
    marginTop: 5,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.purple,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  heroMuted: { color: C.border, fontSize: 13 },
  heroAmount: {
    color: C.white,
    fontSize: 32,
    fontWeight: "900" as const,
    marginTop: 4,
  },
  metricGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
    marginTop: 20,
  },
  metric: {
    width: "31%" as const,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#E8E5F2",
    borderRadius: 18,
    padding: 14,
    backgroundColor: C.white,
  },
  metricLabel: { color: C.muted, fontSize: 11, marginTop: 10 },
  metricValue: {
    color: C.navy,
    fontSize: 24,
    fontWeight: "900" as const,
    marginTop: 5,
  },
  tabs: { gap: 8, paddingTop: 22, paddingBottom: 26 },
  tab: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  tabActive: { backgroundColor: C.purple, borderColor: C.purple },
  tabText: { color: C.navy, fontSize: 13, fontWeight: "800" as const },
  tabTextActive: { color: C.white },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 14,
  },
  sectionTitle: { color: C.navy, fontSize: 21, fontWeight: "900" as const },
  sectionSubtitle: { color: C.muted, fontSize: 13, marginTop: 4 },
  activity: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1EFFF",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  activityTitle: { color: C.navy, fontWeight: "800" as const },
  activitySubtitle: { color: C.muted, fontSize: 12, marginTop: 4 },
  action: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 15,
    marginTop: 12,
    backgroundColor: C.white,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1EFFF",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  actionTitle: { color: C.navy, fontSize: 16, fontWeight: "900" as const },
  actionSubtitle: { color: C.muted, fontSize: 12, marginTop: 4 },
};
