import { useAccountStyles } from "@/context/AccountThemeContext";
import { useCallback, useRef, useState } from "react";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";
import { useAuth } from "@/context/AuthContext";
import { addressError, getAddresses, type SavedAddress } from "@/api/addresses";
import { EmptyState, LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
import { ProfileIcon } from "@/components/profile/ProfileIcon";
import { AddressButton, AddressNotice, AddressPage, addressStyles } from "@/components/address/AddressUI";

const messages: Record<string, string> = { created: "Your new address has been saved.", updated: "Your address has been updated.", deleted: "Your address has been deleted." };

export default function SavedAddressesScreen() {
  const themed = useAccountStyles();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { result } = useLocalSearchParams<{ result?: string }>();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setExpired(false);
    try {
      const items = await getAddresses(controller.signal);
      if (!controller.signal.aborted) setAddresses(items);
    } catch (failure) {
      if (controller.signal.aborted) return;
      const details = addressError(failure, "Unable to load your addresses. Please try again.");
      setError(details.message);
      setExpired(details.sessionExpired);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    if (authLoading || !userId) return;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; request.current?.abort(); };
  }, [authLoading, userId, load]));

  if (!authLoading && !user) return <Redirect href="/auth/login" />;
  const open = (id?: string) => {
    router.setParams({ result: undefined });
    router.push({ pathname: "/addresses/form", params: id ? { id } : {} });
  };
  return (
    <AddressPage title="Your places." subtitle="Keep your favourite service locations handy." onBack={() => router.dismissTo("/profile")}>
      {result && messages[result] && <AddressNotice>{messages[result]}</AddressNotice>}
      {loading || authLoading ? <LoadingState label="Loading your addresses..." /> : error ? (
        <View><ErrorText>{error}</ErrorText><AddressButton title={expired ? "Sign in" : "Try again"}
          secondary onPress={() => expired ? router.replace("/auth/login") : void load()} /></View>
      ) : addresses.length === 0 ? <EmptyState label="No saved addresses yet. Add your first place below." /> : (
        <View style={themed(styles.cards)}>
          {addresses.map((address) => (
            <Pressable key={address._id} accessibilityRole="button"
              accessibilityLabel={`Edit ${address.label}${address.isDefault ? ", default address" : ""}. ${address.line1}, ${address.areaCity}`}
              onPress={() => open(address._id)} style={themed(({ pressed }) => [styles.card, pressed && addressStyles.disabled])}>
              <View style={themed(styles.icon)}><ProfileIcon name={address.label.toLowerCase() === "home" ? "home" : "pin"} /></View>
              <View style={themed(styles.copy)}>
                <View style={themed(styles.cardHeading)}>
                  <Text style={themed(styles.name)}>{address.label}</Text>
                  {address.isDefault && <Text style={themed(styles.badge)}>Default</Text>}
                </View>
                <Text style={themed(styles.summary)}>{address.line1}{"\n"}{address.areaCity}</Text>
              </View>
              <Text style={themed(styles.chevron)} accessible={false}>›</Text>
            </Pressable>
          ))}
          <Text style={themed(addressStyles.hint)}>Choose a place to edit its details or change your default address.</Text>
        </View>
      )}
      <View style={themed(addressStyles.footer)}>
        <AddressButton title="+ Add a new address" disabled={authLoading || loading || expired} onPress={() => open()} />
      </View>
    </AddressPage>
  );
}
const styles = StyleSheet.create({
  cards: { gap: 14 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 22, backgroundColor: "#FFFFFF", padding: 16, borderWidth: 1, borderColor: "#E6EAF3" },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#EEE8FF" },
  copy: { flex: 1 },
  cardHeading: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  name: { color: "#303B55", fontSize: 16, fontWeight: "700", flexShrink: 1 },
  badge: { color: "#633CFF", fontSize: 11, fontWeight: "700", backgroundColor: "#EEE8FF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  summary: { color: "#7D89A1", fontSize: 13, lineHeight: 20, marginTop: 6 },
  chevron: { color: "#8B97AE", fontSize: 26, lineHeight: 27 },
});
