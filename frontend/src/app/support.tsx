import { createTicket, getMyTickets } from "@/api/domain";
import { EmptyState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
import { Button, Card, Input } from "@/components/ui";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function Support() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setTickets((await getMyTickets()).data.data);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const submit = async () => {
    if (!subject.trim() || !message.trim())
      return setError("Add a subject and describe the issue.");
    setBusy(true);
    setError("");
    try {
      await createTicket({ subject, message });
      setSubject("");
      setMessage("");
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to submit ticket.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      style={{ backgroundColor: "#F7F7FB" }}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={{ fontSize: 30, fontWeight: "900", color: "#25213D" }}>
        Support
      </Text>
      <Text style={{ color: "#747B90", marginVertical: 8 }}>
        Send a complaint or service question.
      </Text>
      <Card>
        <Input
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
        />
        <Input
          placeholder="Tell us what happened"
          value={message}
          onChangeText={setMessage}
          multiline
          style={{ minHeight: 100, textAlignVertical: "top" }}
        />
        <ErrorText>{error}</ErrorText>
        <Button onPress={() => void submit()}>
          {busy ? "Sending..." : "Submit ticket"}
        </Button>
      </Card>
      <Text
        style={{
          color: "#25213D",
          fontSize: 20,
          fontWeight: "900",
          marginBottom: 12,
        }}
      >
        Your tickets
      </Text>
      {!tickets.length ? (
        <EmptyState label="No support tickets yet." />
      ) : (
        tickets.map((ticket) => (
          <Card key={ticket._id}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: "#25213D", fontWeight: "900", flex: 1 }}>
                {ticket.subject}
              </Text>
              <Text style={{ color: "#0F9D8A", fontWeight: "800" }}>
                {ticket.status.replace("_", " ")}
              </Text>
            </View>
            <Text style={{ color: "#747B90", marginTop: 8 }}>
              {ticket.message}
            </Text>
            {ticket.adminResponse ? (
              <Text style={{ color: "#25213D", marginTop: 12 }}>
                Admin: {ticket.adminResponse}
              </Text>
            ) : null}
          </Card>
        ))
      )}
    </ScrollView>
  );
}
