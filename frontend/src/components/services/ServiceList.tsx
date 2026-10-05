import {
    deleteService,
    getServices,
    serviceError,
    type Service,
} from "@/api/services";
import { AddressButton } from "@/components/address/AddressUI";
import { EmptyState, LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
import {
    ProfileBackButton,
    ProfileNavigation,
} from "@/components/profile/ProfileNavigation";
import { AccountText as Text } from "@/components/settings/AccountText";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { useAuth } from "@/context/AuthContext";
import { router, useFocusEffect } from "expo-router";
import { Layers, Search, Sparkles } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
    Modal,
    RefreshControl,
    ScrollView,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProviderServiceCard from "./ProviderServiceCard";
import { ServiceAction, ServiceCard, serviceStyles } from "./ServiceUI";
export default function ServiceList({ admin = false }: { admin?: boolean }) {
  const themed = useAccountStyles();
  const { user } = useAuth();
  const provider = !admin && user?.role === "provider";
  const [query, setQuery] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [notice, setNotice] = useState("");
  const visibleServices = services.filter((service) =>
    admin && showInactive ? !service.isActive : service.isActive,
  );
  const filteredServices = provider
    ? visibleServices.filter((service) =>
        `${service.name} ${service.category?.name || ""} ${service.description || ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : visibleServices;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Service | null>(null);
  const [removing, setRemoving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const lock = useRef(false);
  const active = useRef<AbortController | null>(null);
  const load = useCallback(
    async (refresh = false) => {
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      if (refresh) setRefreshing(true);
      try {
        const result = await getServices(admin, controller.signal);
        if (!controller.signal.aborted) {
          setServices(result);
          setError("");
        }
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(serviceError(failure, "Unable to load services."));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [admin],
  );
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => active.current?.abort();
    }, [load]),
  );
  const remove = async () => {
    if (!selected || lock.current) return;
    lock.current = true;
    setRemoving(true);
    setDeleteError("");
    try {
      const id = selected._id;
      await deleteService(id);
      setServices((current) =>
        current.map((service) =>
          service._id === id ? { ...service, isActive: false } : service,
        ),
      );
      setSelected(null);
      setNotice("Service deleted. You can restore it from Inactive services.");
      await load(true);
    } catch (failure) {
      setDeleteError(serviceError(failure, "Unable to delete this service."));
    } finally {
      lock.current = false;
      setRemoving(false);
    }
  };
  return (
    <SafeAreaView style={themed(serviceStyles.safe)}>
      <ScrollView
        contentContainerStyle={serviceStyles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
          />
        }
      >
        <View style={serviceStyles.topBar}>
          <ProfileBackButton
            label="Go back"
            onPress={() =>
              admin
                ? router.replace("/admin/dashboard")
                : router.canGoBack()
                  ? router.back()
                  : router.replace("/")
            }
          />
          <Text style={themed(serviceStyles.brand)}>HOMEHALO</Text>
          <View style={themed(serviceStyles.brandIcon)}>
            <Layers size={20} color="#633CFF" />
          </View>
        </View>
        <Text accessibilityRole="header" style={themed(serviceStyles.heading)}>
          {admin ? "Service Management" : "Available services"}
        </Text>
        <Text style={themed(serviceStyles.copy)}>
          {admin
            ? "Manage services offered through HomeHalo."
            : "Explore services offered through HomeHalo."}
        </Text>
        {provider && (
          <>
            <View
              style={themed({
                backgroundColor: "#EEE8FF",
                borderRadius: 16,
                padding: 16,
                marginTop: 12,
                marginBottom: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              })}
            >
              <Sparkles size={23} color="#633CFF" />
              <View style={{ flex: 1 }}>
                <Text
                  style={themed({
                    color: "#453084",
                    fontSize: 13,
                    fontWeight: "800",
                    marginBottom: 5,
                  })}
                >
                  Find your next opportunity
                </Text>
                <Text
                  style={themed({
                    color: "#81749F",
                    fontSize: 11,
                    lineHeight: 18,
                  })}
                >
                  Choose a service that fits your skills. Share your
                  qualifications to apply.
                </Text>
              </View>
            </View>
            <View
              style={themed({
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#EEEDF5",
                borderRadius: 14,
                flexDirection: "row",
                gap: 10,
                alignItems: "center",
                paddingHorizontal: 14,
                marginBottom: 22,
              })}
            >
              <Search size={18} color="#8A91A4" />
              <TextInput
                accessibilityLabel="Search services"
                placeholder="Search services or categories"
                value={query}
                onChangeText={setQuery}
                placeholderTextColor="#8A91A4"
                style={themed({
                  flex: 1,
                  minWidth: 0,
                  minHeight: 48,
                  fontSize: 12,
                  color: "#242E49",
                })}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={themed({
                  color: "#242E49",
                  fontSize: 15,
                  fontWeight: "800",
                })}
              >
                Explore services
              </Text>
              <Text style={themed({ color: "#8A91A4", fontSize: 11 })}>
                {loading ? "Loading…" : `${filteredServices.length} available`}
              </Text>
            </View>
          </>
        )}
        {admin && (
          <View style={serviceStyles.toolbar}>
            <Text style={themed(serviceStyles.sectionLabel)}>
              {visibleServices.length} {showInactive ? "inactive" : "active"}{" "}
              services
            </Text>
            <ServiceAction
              title="+ Add Service"
              label="Add service"
              icon="add"
              primary
              onPress={() => router.push("/admin/service-form")}
            />
          </View>
        )}
        {admin && (
          <View style={{ alignItems: "flex-start", marginBottom: 20 }}>
            <ServiceAction
              title={
                showInactive
                  ? "View active services"
                  : `View inactive services (${services.filter((service) => !service.isActive).length})`
              }
              label={
                showInactive
                  ? "Back to active services"
                  : `Inactive services Ã‚Â· ${services.filter((service) => !service.isActive).length}`
              }
              icon="archive"
              onPress={() => {
                setShowInactive((current) => !current);
                setNotice("");
              }}
            />
          </View>
        )}
        {!!notice && (
          <Text accessibilityRole="alert" style={themed(serviceStyles.copy)}>
            {notice}
          </Text>
        )}
        <ErrorText>{error}</ErrorText>
        {!!error && (
          <AddressButton
            title="Try again"
            secondary
            onPress={() => void load(true)}
          />
        )}
        {loading ? (
          <LoadingState label="Loading services..." />
        ) : !error && !filteredServices.length ? (
          <EmptyState
            label={
              provider && query.trim()
                ? "No services match your search."
                : showInactive
                  ? "No inactive services."
                  : "No active services are available yet."
            }
          />
        ) : (
          filteredServices.map((service) =>
            provider ? (
              <ProviderServiceCard
                key={`${service._id}:${service.imageUrl || ""}`}
                service={service}
              />
            ) : (
              <ServiceCard
                key={`${service._id}:${service.imageUrl || ""}`}
                service={service}
              >
                {!admin && user?.role === "customer" && (
                  <ServiceAction
                    title="Book this service"
                    icon="add"
                    primary
                    onPress={() =>
                      router.push({
                        pathname: "/booking/checkout",
                        params: { serviceId: service._id },
                      })
                    }
                  />
                )}
                {!admin && user?.role === "provider" && (
                  <ServiceAction
                    title="Apply for this Service"
                    icon="add"
                    primary
                    onPress={() =>
                      router.push({
                        pathname: "/provider/apply",
                        params: { serviceId: service._id },
                      })
                    }
                  />
                )}
                {admin && (
                  <View style={serviceStyles.row}>
                    <View style={{ flex: 1 }}>
                      <ServiceAction
                        title="Edit"
                        icon="edit"
                        onPress={() =>
                          router.push({
                            pathname: "/admin/service-form",
                            params: { id: service._id },
                          })
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ServiceAction
                        title="Assign providers"
                        icon="add"
                        onPress={() =>
                          router.push({
                            pathname: "/admin/assign-service-provider",
                            params: { serviceId: service._id },
                          })
                        }
                      />
                    </View>
                    {service.isActive && (
                      <View style={{ flex: 1 }}>
                        <ServiceAction
                          title="Delete"
                          icon="delete"
                          danger
                          onPress={() => {
                            setDeleteError("");
                            setSelected(service);
                          }}
                        />
                      </View>
                    )}
                  </View>
                )}
              </ServiceCard>
            ),
          )
        )}
        {!loading && (
          <ServiceAction
            title="Refresh services"
            icon="refresh"
            disabled={refreshing}
            onPress={() => void load(true)}
          />
        )}
      </ScrollView>
      {!admin && user?.role === "customer" && (
        <ProfileNavigation active="home" />
      )}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!removing) setSelected(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(20,20,40,0.45)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 24,
            }}
          >
            <Text accessibilityRole="header" style={serviceStyles.title}>
              Are you sure you want to delete this service?
            </Text>
            <Text style={serviceStyles.copy}>
              {selected?.name} will become inactive and be hidden from available
              services. Existing bookings will remain intact.
            </Text>
            <ErrorText>{deleteError}</ErrorText>
            <View style={serviceStyles.row}>
              <View style={{ flex: 1 }}>
                <AddressButton
                  title="Cancel"
                  secondary
                  disabled={removing}
                  onPress={() => setSelected(null)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AddressButton
                  title="Delete"
                  danger
                  busy={removing}
                  onPress={() => void remove()}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
