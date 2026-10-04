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
import { Layers, Search } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
    Alert,
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const active = useRef<AbortController | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      if (refresh) setRefreshing(true);
      else setLoading(true);
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

  const visible = services.filter((service) =>
    admin ? service.isActive !== showInactive : service.isActive,
  );
  const filtered = provider
    ? visible.filter((service) =>
        `${service.name} ${service.category?.name || ""} ${service.description || ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : visible;
  const remove = (service: Service) => {
    if (lock.current) return;
    Alert.alert(
      "Delete service?",
      `${service.name} will be hidden from customers.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            lock.current = true;
            try {
              await deleteService(service._id);
              await load(true);
            } catch (failure) {
              setError(serviceError(failure, "Unable to delete this service."));
            } finally {
              lock.current = false;
            }
          },
        },
      ],
    );
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
          <View style={themed(serviceStyles.searchBox)}>
            <Search size={18} color="#8A91A4" />
            <TextInput
              accessibilityLabel="Search services"
              placeholder="Search services or categories"
              value={query}
              onChangeText={setQuery}
              placeholderTextColor="#8A91A4"
              style={themed(serviceStyles.searchInput)}
            />
          </View>
        )}
        {admin && (
          <View style={serviceStyles.toolbar}>
            <Text style={themed(serviceStyles.sectionLabel)}>
              {filtered.length} {showInactive ? "inactive" : "active"} services
            </Text>
            <ServiceAction
              title="Add service"
              icon="add"
              primary
              onPress={() => router.push("/admin/service-form")}
            />
          </View>
        )}
        {admin && (
          <View style={{ alignItems: "flex-start", marginBottom: 16 }}>
            <ServiceAction
              title={
                showInactive ? "View active services" : "View inactive services"
              }
              icon="archive"
              onPress={() => setShowInactive((current) => !current)}
            />
          </View>
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
        ) : !filtered.length ? (
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
          filtered.map((service) =>
            provider ? (
              <ProviderServiceCard key={service._id} service={service} />
            ) : (
              <ServiceCard key={service._id} service={service}>
                {user?.role === "customer" && (
                  <ServiceAction
                    title="Book and schedule this service"
                    label="Book Service"
                    icon="calendar"
                    primary
                    onPress={() =>
                      router.push({
                        pathname: "/bookings/new",
                        params: { serviceId: service._id },
                      })
                    }
                  />
                )}
                {user?.role === "provider" && (
                  <ServiceAction
                    title="Apply for this service"
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
                        title="Delete"
                        icon="delete"
                        danger
                        onPress={() => remove(service)}
                      />
                    </View>
                  </View>
                )}
              </ServiceCard>
            ),
          )
        )}
      </ScrollView>
      {!admin && user?.role === "customer" && (
        <ProfileNavigation active="home" />
      )}
    </SafeAreaView>
  );
}
