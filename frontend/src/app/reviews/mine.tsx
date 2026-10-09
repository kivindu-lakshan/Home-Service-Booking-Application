import { deleteReview, getMyReviews, updateReview } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { router, useFocusEffect } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Edit3,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterType = "all" | "5" | "4" | "3" | "low";

export default function MyReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  // Edit Review Modal State
  const [editingReview, setEditingReview] = useState<any | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete Confirm State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(false);
    try {
      const res = await getMyReviews();
      setReviews(res.data.data ?? []);
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
        if (active) void load(true);
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load(true);
  };

  const openEditModal = (review: any) => {
    setEditingReview(review);
    setEditRating(review.rating || 5);
    setEditComment(review.comment || "");
    setEditError("");
  };

  const handleSaveEdit = async () => {
    if (!editingReview) return;
    if (!editRating) {
      setEditError("Please select a rating between 1 and 5 stars.");
      return;
    }
    setSavingEdit(true);
    setEditError("");
    try {
      const res = await updateReview(editingReview._id, {
        rating: editRating,
        comment: editComment.trim(),
      });
      const updated = res.data.data;

      // Update in local state immediately
      setReviews((prev) =>
        prev.map((r) =>
          r._id === editingReview._id
            ? { ...r, rating: updated.rating, comment: updated.comment }
            : r,
        ),
      );
      setEditingReview(null);
    } catch (e: any) {
      setEditError(e.response?.data?.message || "Failed to update review.");
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = (review: any) => {
    setDeletingId(review._id);
  };

  const executeDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteReview(deletingId);
      setReviews((prev) => prev.filter((r) => r._id !== deletingId));
      setDeletingId(null);
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.response?.data?.message || "Failed to delete review.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const visibleReviews = useMemo(() => {
    let filtered = [...reviews];
    if (filter === "5") filtered = filtered.filter((r) => r.rating === 5);
    else if (filter === "4") filtered = filtered.filter((r) => r.rating === 4);
    else if (filter === "3") filtered = filtered.filter((r) => r.rating === 3);
    else if (filter === "low") filtered = filtered.filter((r) => r.rating <= 2);

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter((r) => {
        const providerName =
          r.provider?.user?.fullName || r.provider?.name || "";
        const serviceName =
          r.service?.name || r.booking?.service?.name || "";
        const comment = r.comment || "";
        const bookingRef = r.booking?.bookingRef || "";
        return (
          providerName.toLowerCase().includes(q) ||
          serviceName.toLowerCase().includes(q) ||
          comment.toLowerCase().includes(q) ||
          bookingRef.toLowerCase().includes(q)
        );
      });
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [reviews, query, filter]);

  if (loading && !reviews.length) {
    return <LoadingState label="Loading your reviews..." />;
  }
  if (error && !reviews.length) {
    return <ErrorState onRetry={() => void load()} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backBtn}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/bookings")
            }
          >
            <ArrowLeft size={20} color="#0F172A" />
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={styles.headerTitle}>My Reviews</Text>
            <Text style={styles.headerSubtitle}>
              {reviews.length}{" "}
              {reviews.length === 1 ? "review submitted" : "reviews submitted"}
            </Text>
          </View>
          <View style={styles.totalBadge}>
            <Star size={13} color="#D97706" fill="#F59E0B" />
            <Text style={styles.totalBadgeText}>{reviews.length}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#633CFF"
            />
          }
        >
          {/* Search Bar */}
          <View style={styles.searchWrap}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              placeholder="Search by provider, service, or text..."
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
            />
            {!!query && (
              <Pressable onPress={() => setQuery("")} hitSlop={6}>
                <X size={16} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            {[
              { id: "all", label: "All Reviews" },
              { id: "5", label: "5 ★ Stars" },
              { id: "4", label: "4 ★ Stars" },
              { id: "3", label: "3 ★ Stars" },
              { id: "low", label: "1-2 ★ Stars" },
            ].map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setFilter(tab.id as FilterType)}
                style={[
                  styles.filterChip,
                  filter === tab.id && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filter === tab.id && styles.filterChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Reviews List */}
          {visibleReviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <MessageSquare size={36} color="#633CFF" />
              </View>
              <Text style={styles.emptyTitle}>
                {query || filter !== "all"
                  ? "No matching reviews"
                  : "No reviews submitted yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {query || filter !== "all"
                  ? "Try adjusting your search keywords or filter tab."
                  : "When you complete or have active bookings, review your providers to build their reputation!"}
              </Text>
              <Pressable
                style={styles.emptyActionBtn}
                onPress={() => router.push("/bookings")}
              >
                <Text style={styles.emptyActionBtnText}>Go to My Bookings</Text>
              </Pressable>
            </View>
          ) : (
            visibleReviews.map((item: any) => {
              const providerName =
                item.provider?.user?.fullName ||
                item.provider?.name ||
                "Service Provider";
              const serviceName =
                item.service?.name ||
                item.booking?.service?.name ||
                "Home Service";
              const bookingRef = item.booking?.bookingRef;

              return (
                <View key={item._id} style={styles.card}>
                  {/* Card Header: Provider Info & Stars */}
                  <View style={styles.cardHeader}>
                    <View style={styles.providerInfoRow}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {providerName.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.providerNameText} numberOfLines={1}>
                          {providerName}
                        </Text>
                        <Text style={styles.serviceNameText} numberOfLines={1}>
                          {serviceName}
                        </Text>
                      </View>
                    </View>

                    {/* Star Rating Badge */}
                    <View style={styles.ratingBadge}>
                      <Star size={14} color="#D97706" fill="#F59E0B" />
                      <Text style={styles.ratingBadgeNumber}>
                        {item.rating}.0
                      </Text>
                    </View>
                  </View>

                  {/* Stars Graphic */}
                  <View style={styles.starsDisplayRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={16}
                        color={s <= item.rating ? "#F59E0B" : "#E2E8F0"}
                        fill={s <= item.rating ? "#F59E0B" : "transparent"}
                        strokeWidth={1.5}
                      />
                    ))}
                  </View>

                  {/* Review Comment Text */}
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentBody}>
                      {item.comment?.trim() || "No written text provided."}
                    </Text>
                  </View>

                  {/* Card Meta Row */}
                  <View style={styles.cardMetaRow}>
                    <View style={styles.metaLeft}>
                      <Calendar size={13} color="#94A3B8" />
                      <Text style={styles.metaDateText}>
                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                      {!!bookingRef && (
                        <View style={styles.refPill}>
                          <Text style={styles.refPillText}>#{bookingRef}</Text>
                        </View>
                      )}
                    </View>

                    {/* Action Buttons: Edit and Delete */}
                    <View style={styles.actionsRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Edit this review"
                        onPress={() => openEditModal(item)}
                        style={styles.editBtn}
                      >
                        <Edit3 size={14} color="#4F46E5" />
                        <Text style={styles.editBtnText}>Edit</Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete this review"
                        onPress={() => confirmDelete(item)}
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={14} color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* EDIT REVIEW MODAL */}
        <Modal
          visible={!!editingReview}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingReview(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Edit Your Review</Text>
                  <Text style={styles.modalSubtitle}>
                    {editingReview?.provider?.user?.fullName ||
                      editingReview?.provider?.name ||
                      "Provider"}
                  </Text>
                </View>
                <Pressable
                  style={styles.closeModalBtn}
                  onPress={() => setEditingReview(null)}
                >
                  <X size={18} color="#64748B" />
                </Pressable>
              </View>

              {/* Interactive Stars */}
              <View style={styles.modalRatingBox}>
                <Text style={styles.modalRatingPrompt}>
                  Tap to change rating:
                </Text>
                <View style={styles.modalStarsRow}>
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <Pressable
                      key={starVal}
                      onPress={() => setEditRating(starVal)}
                      hitSlop={6}
                      style={{ padding: 4 }}
                    >
                      <Star
                        size={36}
                        color={starVal <= editRating ? "#F59E0B" : "#D1D5DB"}
                        fill={starVal <= editRating ? "#F59E0B" : "transparent"}
                        strokeWidth={1.8}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Comment Input */}
              <View style={styles.modalInputWrap}>
                <TextInput
                  placeholder="Update your feedback..."
                  placeholderTextColor="#94A3B8"
                  value={editComment}
                  onChangeText={setEditComment}
                  multiline
                  style={styles.modalTextInput}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <Text style={styles.modalCharCount}>
                  {editComment.length} / 1000
                </Text>
              </View>

              {!!editError && (
                <Text style={styles.errorBanner}>{editError}</Text>
              )}

              {/* Modal Action Buttons */}
              <View style={styles.modalActionsRow}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setEditingReview(null)}
                  disabled={savingEdit}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalSaveBtn, savingEdit && { opacity: 0.7 }]}
                  onPress={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* DELETE CONFIRMATION MODAL WITH GREENY TOUCH */}
        <Modal
          visible={!!deletingId}
          transparent
          animationType="fade"
          onRequestClose={() => setDeletingId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmBadge}>
                <Trash2 size={28} color="#059669" strokeWidth={2.2} />
              </View>

              <Text style={styles.confirmTitle}>Delete this review?</Text>
              <Text style={styles.confirmMessage}>
                This will permanently remove your feedback from the provider's
                profile.
              </Text>

              <View style={styles.confirmActionsRow}>
                <Pressable
                  style={styles.confirmNoBtn}
                  onPress={() => setDeletingId(null)}
                  disabled={isDeleting}
                >
                  <X size={16} color="#047857" strokeWidth={2.5} />
                  <Text style={styles.confirmNoText}>No, Keep</Text>
                </Pressable>

                <Pressable
                  style={styles.confirmYesBtn}
                  onPress={executeDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.confirmYesText}>Yes, Delete</Text>
                    </>
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
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  screen: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B45309",
  },

  /* Search Bar */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#0F172A",
  },

  /* Filters */
  filterScroll: { flexGrow: 0, marginBottom: 18 },
  filterRow: { gap: 8, paddingRight: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#633CFF",
    borderColor: "#633CFF",
  },
  filterChipText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },

  /* Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  providerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#4F46E5",
  },
  providerNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  serviceNameText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  ratingBadgeNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B45309",
  },
  starsDisplayRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 10,
  },
  commentContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  commentBody: {
    fontSize: 13,
    lineHeight: 20,
    color: "#334155",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaDateText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  refPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  refPillText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
    padding: 7,
    borderRadius: 10,
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F3EEFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 20,
  },
  emptyActionBtn: {
    backgroundColor: "#633CFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyActionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Modal Overlays */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalRatingBox: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalRatingPrompt: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 8,
  },
  modalStarsRow: {
    flexDirection: "row",
    gap: 8,
  },
  modalInputWrap: {
    marginBottom: 14,
  },
  modalTextInput: {
    minHeight: 110,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
    color: "#0F172A",
  },
  modalCharCount: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "right",
    marginTop: 4,
  },
  errorBanner: {
    color: "#DC2626",
    fontSize: 12,
    marginBottom: 10,
    textAlign: "center",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
  modalSaveBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#633CFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#633CFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Confirmation Modal */
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D1FAE5",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    borderWidth: 2,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  confirmMessage: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmActionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmNoBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmNoText: {
    color: "#047857",
    fontSize: 14,
    fontWeight: "700",
  },
  confirmYesBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmYesText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
