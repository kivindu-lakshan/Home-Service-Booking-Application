import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { MyProfile } from "@/api/profile";

export function ProfileAvatar({ profile }: { profile: MyProfile }) {
  const [failed, setFailed] = useState(false);
  const words = profile.fullName.trim().split(/\s+/).filter(Boolean);
  const initials = (words.length > 1
    ? `${Array.from(words[0])[0]}${Array.from(words[words.length - 1])[0]}`
    : Array.from(words[0] || "?").slice(0, 2).join("")
  ).toLocaleUpperCase();
  const photo = profile.avatarUrl?.trim();
  return (
    <View style={styles.avatar}>
      {photo && /^https?:\/\//i.test(photo) && !failed ? (
        <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover"
          accessibilityLabel={`${profile.fullName}'s profile photo`} onError={() => setFailed(true)} />
      ) : <Text style={styles.initials} accessibilityLabel={`${profile.fullName}'s initials`}>{initials}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#633CFF", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photo: { width: 60, height: 60 },
  initials: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
});
