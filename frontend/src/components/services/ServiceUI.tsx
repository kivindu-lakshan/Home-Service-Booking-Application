import type { Service } from "@/api/services";
import { LoadingState } from "@/components/DataState";
import { AccountText as Text } from "@/components/settings/AccountText";
import { Card } from "@/components/ui";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { useAuth } from "@/context/AuthContext";
import { serviceImageUri } from "@/utils/service-image";
import { Redirect, router } from "expo-router";
import {
    Archive,
    Clock,
    MapPin,
    Pencil,
    Plus,
    RotateCw,
    Trash2,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
export function ServiceGuard({
  admin = false,
  children,
}: {
  admin?: boolean;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Redirect href="/auth/login" />;
  if (admin && user.role !== "admin") return <Redirect href="/" />;
  return <>{children}</>;
}
export function ServiceAction({
  title,
  label = title,
  icon,
  onPress,
  primary = false,
  danger = false,
  disabled = false,
}: {
  title: string;
  label?: string;
  icon: "add" | "edit" | "delete" | "archive" | "refresh";
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  const themed = useAccountStyles();
  const Icon = {
    add: Plus,
    edit: Pencil,
    delete: Trash2,
    archive: Archive,
    refresh: RotateCw,
  }[icon];
  const color = primary ? "#FFFFFF" : danger ? "#B73248" : "#633CFF";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) =>
        themed([
          serviceStyles.action,
          primary && serviceStyles.primaryAction,
          danger && serviceStyles.dangerAction,
          (pressed || disabled) && { opacity: 0.65 },
        ])
      }
    >
      <Icon size={16} color={color} strokeWidth={2} />
      <Text style={themed({ color, fontSize: 13, fontWeight: "700" })}>
        {label}
      </Text>
    </Pressable>
  );
}
export function ServiceCard({
  service,
  children,
}: {
  service: Service;
  children?: ReactNode;
}) {
  const themed = useAccountStyles();
  const [failedImage, setFailedImage] = useState(false);
  const imageUri = serviceImageUri(service.imageUrl);
  return (
    <Card>
      {!!imageUri && !failedImage && (
        <Image
          accessibilityLabel={service.name}
          source={{ uri: imageUri }}
          onError={() => setFailedImage(true)}
          resizeMode="cover"
          style={serviceStyles.image}
        />
      )}
      <View style={serviceStyles.cardTop}>
        <Text style={themed(serviceStyles.category)}>
          {service.category?.name || "Category unavailable"}
        </Text>
        <View
          style={[
            serviceStyles.status,
            !service.isActive && { backgroundColor: "#F0F1F6" },
          ]}
        >
          <View
            style={[
              serviceStyles.dot,
              !service.isActive && { backgroundColor: "#9298A8" },
            ]}
          />
          <Text
            style={{
              color: service.isActive ? "#217A62" : "#727A8D",
              fontSize: 11,
              fontWeight: "700",
            }}
          >
            {service.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>
      <Text style={themed(serviceStyles.title)}>{service.name}</Text>
      {!!service.description && (
        <Text style={themed(serviceStyles.copy)}>{service.description}</Text>
      )}
      <View style={serviceStyles.details}>
        {!!service.estDurationHours && (
          <View style={serviceStyles.detail}>
            <Clock size={14} color="#8A91A4" />
            <Text style={themed(serviceStyles.detailText)}>
              {service.estDurationHours}
            </Text>
          </View>
        )}
        {!!service.serviceType && (
          <View style={serviceStyles.detail}>
            <MapPin size={14} color="#8A91A4" />
            <Text style={themed(serviceStyles.detailText)}>
              {service.serviceType === "on_site" ? "On site" : "Workshop"}
            </Text>
          </View>
        )}
      </View>
      {!!service.inclusions?.length && (
        <Text style={themed(serviceStyles.inclusions)}>
          Includes {service.inclusions.join(" · ")}
        </Text>
      )}
      {!!service.assignedProviders?.length && (
        <View style={serviceStyles.providers}>
          <Text style={themed(serviceStyles.providerLabel)}>
            AVAILABLE PROVIDERS
          </Text>
          {service.assignedProviders.map((provider) => (
            <Pressable
              key={provider._id}
              onPress={() =>
                router.push({
                  pathname: "/reviews/provider",
                  params: { providerId: provider._id },
                })
              }
            >
              <Text style={themed(serviceStyles.providerName)}>
                {provider.user?.fullName || "Provider"}
                {provider.city ? ` · ${provider.city}` : ""} ·{" "}
                {Number(provider.ratingAvg || 0).toFixed(1)} stars
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {service.category?.isActive === false && (
        <Text style={themed(serviceStyles.copy)}>Category inactive</Text>
      )}
      <View style={themed(serviceStyles.priceBlock)}>
        <Text style={themed(serviceStyles.priceLabel)}>STARTING FROM</Text>
        <Text style={themed(serviceStyles.price)}>
          {service.basePrice === undefined
            ? "Price not specified"
            : `LKR ${service.basePrice.toLocaleString()}`}
        </Text>
      </View>
      {children}
    </Card>
  );
}
export const serviceStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7FD" },
  content: {
    padding: 22,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    flexGrow: 1,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAE6F5",
  },
  brand: {
    color: "#633CFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE9FF",
  },
  heading: {
    color: "#242E49",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  title: {
    color: "#242E49",
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  copy: { color: "#7C879F", fontSize: 14, lineHeight: 22, marginBottom: 8 },
  toolbar: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 12,
  },
  sectionLabel: { color: "#727D94", fontSize: 13, fontWeight: "600" },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  category: { flex: 1, color: "#633CFF", fontSize: 12, fontWeight: "700" },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EAF7F1",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#28A77F" },
  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  detail: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { color: "#727D94", fontSize: 12 },
  inclusions: {
    color: "#8A91A4",
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 8,
  },
  priceBlock: {
    borderTopWidth: 1,
    borderTopColor: "#F0EEF6",
    paddingTop: 14,
    marginTop: 8,
  },
  priceLabel: {
    color: "#949CAF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.3,
    marginBottom: 5,
  },
  price: {
    color: "#633CFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  row: { flexDirection: "row", gap: 10, marginTop: 16 },
  action: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#F1EDFF",
  },
  primaryAction: { backgroundColor: "#633CFF" },
  dangerAction: { backgroundColor: "#FCEFF1" },
  image: { width: "100%", height: 170, borderRadius: 14, marginBottom: 16 },
  providers: {
    borderTopWidth: 1,
    borderTopColor: "#F0EEF6",
    paddingTop: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  providerLabel: {
    color: "#949CAF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.3,
    marginBottom: 7,
  },
  providerName: {
    color: "#633CFF",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 5,
  },
});
