import { useCallback, useRef, useState } from "react";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Modal, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { addressError, createAddress, deleteAddress, getAddress, getAddresses, updateAddress } from "@/api/addresses";
import { addressFields, emptyAddress, validateAddress, type AddressDraft, type AddressErrors } from "@/validation/address";
import { Input } from "@/components/ui";
import ErrorText from "@/components/ErrorText";
import { LoadingState } from "@/components/DataState";
import { AddressButton, AddressPage, addressStyles } from "@/components/address/AddressUI";

export default function AddressFormScreen() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = id !== undefined;
  const [draft, setDraft] = useState<AddressDraft>(emptyAddress);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [lockedDefault, setLockedDefault] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [serverErrors, setServerErrors] = useState<AddressErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof AddressErrors, boolean>>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const request = useRef<AbortController | null>(null);
  const mutationLock = useRef(false);
  const errors = validateAddress(draft);
  const invalid = Object.keys(errors).length > 0 || Object.values(serverErrors).some(Boolean);

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setReady(false); setError(""); setExpired(false);
    setBusy(null); mutationLock.current = false; setConfirmDelete(false);
    setServerErrors({}); setTouched({});
    try {
      let initial: AddressDraft;
      if (editing) {
        if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) throw new Error("Invalid address ID");
        const address = await getAddress(id, controller.signal);
        initial = { label: address.label, line1: address.line1, areaCity: address.areaCity, landmark: address.landmark, isDefault: address.isDefault };
      } else {
        const addresses = await getAddresses(controller.signal);
        initial = { ...emptyAddress(), isDefault: addresses.length === 0 };
      }
      if (controller.signal.aborted) return;
      setDraft(initial); setLockedDefault(initial.isDefault); setReady(true);
    } catch (failure) {
      if (controller.signal.aborted) return;
      const details = addressError(failure, "Unable to load this address form. Please try again.");
      setError(details.message); setExpired(details.sessionExpired);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [editing, id]);
  useFocusEffect(useCallback(() => {
    if (authLoading || !userId) return;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; request.current?.abort(); };
  }, [authLoading, userId, load]));

  const mutate = async (action: "save" | "delete") => {
    if (mutationLock.current || !ready || loading || expired) return;
    if (action === "save" && Object.keys(errors).length) {
      setTouched({ label: true, line1: true, areaCity: true, landmark: true });
      return;
    }
    if (action === "delete" && (!editing || !confirmDelete)) return;
    mutationLock.current = true; setBusy(action); setError(""); setServerErrors({});
    const controller = new AbortController();
    request.current = controller;
    try {
      if (action === "delete") await deleteAddress(id!, controller.signal);
      else if (editing) await updateAddress(id!, draft, controller.signal);
      else await createAddress(draft, controller.signal);
      if (controller.signal.aborted) return;
      router.dismissTo({ pathname: "/addresses", params: { result: action === "delete" ? "deleted" : editing ? "updated" : "created" } });
    } catch (failure) {
      if (controller.signal.aborted) return;
      const details = addressError(failure, "We couldn't confirm your changes. Check your connection and reopen your addresses before retrying.");
      setError(details.message); setServerErrors(details.fields); setExpired(details.sessionExpired);
      setConfirmDelete(false);
    } finally {
      if (request.current === controller) {
        mutationLock.current = false;
        if (!controller.signal.aborted) setBusy(null);
      }
    }
  };

  if (!authLoading && !user) return <Redirect href="/auth/login" />;
  return (
    <AddressPage title={editing ? "Edit your place." : "Add a new place."}
      subtitle="A few details help your provider find you." busy={!!busy} onBack={() => router.dismissTo("/addresses")}>
      {loading || authLoading ? <LoadingState label="Loading address details..." /> : !ready ? (
        <View><ErrorText>{error}</ErrorText><AddressButton title={expired ? "Sign in" : "Try again"} secondary
          onPress={() => expired ? router.replace("/auth/login") : void load()} /></View>
      ) : <>
        {addressFields.map(({ key, title, optional, placeholder }) => {
          const fieldError = serverErrors[key] || (touched[key] ? errors[key] : undefined);
          return <View key={key} style={addressStyles.field}>
            <Text style={addressStyles.label}>{title}{optional ? " – optional" : ""}</Text>
            <Input accessibilityLabel={`${title}${optional ? ", optional" : ", required"}`}
              value={draft[key]} placeholder={placeholder} editable={!busy && !expired}
              style={[addressStyles.input, !!fieldError && addressStyles.invalid]}
              onBlur={() => setTouched((current) => ({ ...current, [key]: true }))}
              onChangeText={(value) => {
                setDraft((current) => ({ ...current, [key]: value }));
                setTouched((current) => ({ ...current, [key]: true }));
                setServerErrors((current) => ({ ...current, [key]: undefined })); setError("");
              }} />
            <ErrorText>{fieldError}</ErrorText>
          </View>;
        })}
        <View style={styles.defaultRow}>
          <Text style={styles.defaultLabel}>Set as default address</Text>
          <Switch accessibilityLabel="Set as default address" value={draft.isDefault}
            disabled={!!busy || expired || lockedDefault} trackColor={{ false: "#D9DDEA", true: "#BBA8FF" }} thumbColor={draft.isDefault ? "#633CFF" : "#FFFFFF"}
            onValueChange={(value) => setDraft((current) => ({ ...current, isDefault: value }))} />
        </View>
        <Text style={addressStyles.hint}>{lockedDefault
          ? editing ? "This is your default. To change it, open another address and set that as default." : "Your first saved address becomes your default."
          : "Selecting this replaces your current default address."}</Text>
        <View style={addressStyles.footer}>
          <ErrorText>{error}</ErrorText>
          {expired ? <AddressButton title="Sign in" onPress={() => router.replace("/auth/login")} /> : <>
            <AddressButton title={busy === "save" ? "Saving address..." : "Save address"} busy={busy === "save"}
              disabled={!!busy || invalid} onPress={() => void mutate("save")} />
            {editing && <AddressButton title="Delete address" secondary disabled={!!busy} onPress={() => setConfirmDelete(true)} />}
          </>}
        </View>
      </>}
      <Modal transparent visible={confirmDelete} animationType="fade" onRequestClose={() => { if (!busy) setConfirmDelete(false); }}>
        <View style={styles.scrim}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <Text accessibilityRole="header" style={styles.dialogTitle}>Delete this address?</Text>
            <Text style={styles.dialogText}>This removes your saved place. You can add it again later. If it is your default, one of your remaining addresses will become the default.</Text>
            <AddressButton title={busy === "delete" ? "Deleting..." : "Delete address"} danger busy={busy === "delete"}
              disabled={!!busy} onPress={() => void mutate("delete")} />
            <AddressButton title="Keep address" secondary disabled={!!busy} onPress={() => setConfirmDelete(false)} />
          </View>
        </View>
      </Modal>
    </AddressPage>
  );
}
const styles = StyleSheet.create({
  defaultRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  defaultLabel: { color: "#303B55", fontSize: 14, fontWeight: "700", flex: 1 },
  scrim: { flex: 1, backgroundColor: "rgba(36,46,73,0.4)", padding: 24, alignItems: "center", justifyContent: "center" },
  dialog: { width: "100%", maxWidth: 400, borderRadius: 24, padding: 24, backgroundColor: "#FFFFFF", gap: 14 },
  dialogTitle: { color: "#242E49", fontSize: 22, fontWeight: "800" },
  dialogText: { color: "#7C879F", fontSize: 14, lineHeight: 22 },
});
