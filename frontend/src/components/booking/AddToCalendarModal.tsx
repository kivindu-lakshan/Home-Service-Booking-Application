import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  Calendar,
  CalendarCheck,
  Check,
  ChevronRight,
  Clock,
  Globe,
  MapPin,
  Smartphone,
  X,
} from "lucide-react-native";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { AccountText as Text } from "@/components/settings/AccountText";
import {
  addToDeviceCalendar,
  openGoogleCalendar,
  parseBookingDateTime,
  type CalendarEventDetails,
} from "@/utils/calendar";

interface AddToCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  eventDetails: CalendarEventDetails | null;
}

export function AddToCalendarModal({
  visible,
  onClose,
  eventDetails,
}: AddToCalendarModalProps) {
  const themed = useAccountStyles();
  const [loadingType, setLoadingType] = useState<"google" | "device" | null>(null);
  const [successNotice, setSuccessNotice] = useState("");

  if (!eventDetails) return null;

  const { startDate } = parseBookingDateTime(
    eventDetails.scheduledDate,
    eventDetails.scheduledTime,
    eventDetails.durationHours,
  );

  const formattedDate = startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = `${eventDetails.scheduledTime || "09:00 AM"} (${eventDetails.durationHours || "2"} hrs)`;

  const handleGoogle = async () => {
    try {
      setLoadingType("google");
      setSuccessNotice("");
      await openGoogleCalendar(eventDetails);
      setSuccessNotice("Opened in Google Calendar!");
      setTimeout(() => {
        setSuccessNotice("");
        onClose();
      }, 1200);
    } catch (err: any) {
      Alert.alert(
        "Could not open Google Calendar",
        err?.message || "Please verify your browser or internet connection.",
      );
    } finally {
      setLoadingType(null);
    }
  };

  const handleDevice = async () => {
    try {
      setLoadingType("device");
      setSuccessNotice("");
      await addToDeviceCalendar(eventDetails);
      setSuccessNotice("Calendar file ready!");
      setTimeout(() => {
        setSuccessNotice("");
        onClose();
      }, 1500);
    } catch (err: any) {
      Alert.alert(
        "Calendar Export",
        err?.message || "Unable to export calendar file on this device.",
      );
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={themed(styles.modalCard)}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <CalendarCheck size={22} color="#168A76" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={themed(styles.modalTitle)}>Add to Calendar</Text>
              <Text style={themed(styles.modalSubtitle)}>
                Sync your appointment & set an automatic reminder
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            >
              <X size={20} color="#7C879F" />
            </Pressable>
          </View>

          {/* Event Preview Badge */}
          <View style={themed(styles.previewCard)}>
            <Text style={themed(styles.previewService)}>
              {eventDetails.serviceName}
            </Text>
            <View style={styles.previewMetaRow}>
              <Calendar size={14} color="#633CFF" />
              <Text style={themed(styles.previewMetaText)}>{formattedDate}</Text>
            </View>
            <View style={styles.previewMetaRow}>
              <Clock size={14} color="#633CFF" />
              <Text style={themed(styles.previewMetaText)}>{formattedTime}</Text>
            </View>
            {!!eventDetails.address && (
              <View style={styles.previewMetaRow}>
                <MapPin size={14} color="#633CFF" />
                <Text numberOfLines={1} style={themed(styles.previewMetaText)}>
                  {eventDetails.address}
                </Text>
              </View>
            )}
            <View style={styles.refPill}>
              <Text style={styles.refPillText}>Ref: {eventDetails.bookingRef}</Text>
            </View>
          </View>

          {/* Success Message Banner */}
          {!!successNotice && (
            <View style={styles.successBanner}>
              <Check size={16} color="#168A76" />
              <Text style={styles.successBannerText}>{successNotice}</Text>
            </View>
          )}

          {/* Action Options */}
          <View style={styles.optionsList}>
            {/* Option 1: Google Calendar */}
            <Pressable
              disabled={loadingType !== null}
              onPress={handleGoogle}
              style={({ pressed }) => [
                styles.optionItem,
                pressed && styles.optionItemPressed,
                loadingType === "google" && styles.optionItemActive,
              ]}
            >
              <View style={[styles.optionIconBox, { backgroundColor: "#EBF3FF" }]}>
                {loadingType === "google" ? (
                  <ActivityIndicator size="small" color="#1A73E8" />
                ) : (
                  <Globe size={22} color="#1A73E8" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={themed(styles.optionTitle)}>Google Calendar</Text>
                <Text style={themed(styles.optionDescription)}>
                  Open directly in Google Calendar app or web
                </Text>
              </View>
              <ChevronRight size={18} color="#8A91A4" />
            </Pressable>

            {/* Option 2: Device / Apple / Android Calendar */}
            <Pressable
              disabled={loadingType !== null}
              onPress={handleDevice}
              style={({ pressed }) => [
                styles.optionItem,
                pressed && styles.optionItemPressed,
                loadingType === "device" && styles.optionItemActive,
              ]}
            >
              <View style={[styles.optionIconBox, { backgroundColor: "#EDFAF8" }]}>
                {loadingType === "device" ? (
                  <ActivityIndicator size="small" color="#168A76" />
                ) : (
                  <Smartphone size={22} color="#168A76" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={themed(styles.optionTitle)}>
                  Phone / Apple / Default Calendar
                </Text>
                <Text style={themed(styles.optionDescription)}>
                  Export .ics event with 1-hour alarm reminder
                </Text>
              </View>
              <ChevronRight size={18} color="#8A91A4" />
            </Pressable>
          </View>

          {/* Dismiss Button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.cancelBtnText}>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2F6F3",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  previewCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  previewService: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  previewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewMetaText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  refPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  refPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#633CFF",
    letterSpacing: 0.4,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F8F5",
    borderWidth: 1,
    borderColor: "#A3E6D8",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  successBannerText: {
    fontSize: 13,
    color: "#168A76",
    fontWeight: "600",
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
  },
  optionItemPressed: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
  },
  optionItemActive: {
    borderColor: "#633CFF",
    backgroundColor: "#FAF5FF",
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  optionDescription: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
});
