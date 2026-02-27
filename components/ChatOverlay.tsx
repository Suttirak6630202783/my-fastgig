import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../app/(tabs)/theme";

interface ChatOverlayProps {
  visible: boolean;
  onClose: () => void;
  chatData: any[];
  input: string;
  setInput: (text: string) => void;
  onSend: () => void;
  calcAvg: (min: any, max: any) => number | null;
}

export default function ChatOverlay({
  visible,
  onClose,
  chatData,
  input,
  setInput,
  onSend,
  calcAvg,
}: ChatOverlayProps) {
  const router = useRouter();

  if (!visible) return null;

  const renderChat = ({ item }: any) => {
    if (item.type === "bot") {
      return (
        <View style={styles.msgRow}>
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/4712/4712108.png",
            }}
            style={styles.aiAvatar}
          />
          <View style={[styles.bubble, styles.botBubble]}>
            <Text style={styles.chatText}>{item.text}</Text>
          </View>
        </View>
      );
    }
    if (item.type === "user") {
      return (
        <View style={[styles.bubble, styles.userBubble]}>
          <Text style={[styles.chatText, { color: COLORS.white }]}>
            {item.text}
          </Text>
        </View>
      );
    }
    if (item.type === "job") {
      const job = item.data;
      const avg =
        job?.avg_pay != null
          ? Number(job.avg_pay)
          : calcAvg(job.pay_min, job.pay_max);
      return (
        <View style={styles.miniJobCard}>
          <Text style={{ fontWeight: "700", color: "#5D3FD3" }}>
            🎯 AI แนะนำ
          </Text>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.metaText}>
            💰 เฉลี่ย: {avg ? avg.toFixed(0) : "-"} บ.
          </Text>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() =>
              router.push({
                pathname: "/job-detail",
                params: { job: JSON.stringify(job) },
              })
            }
          >
            <Text style={{ color: COLORS.white, fontSize: 12 }}>
              ดูรายละเอียด
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.chatOverlay}>
      <View style={styles.chatHeader}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={chatData}
        renderItem={renderChat}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 10 }}
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="ถาม AI..."
          placeholderTextColor="#999"
        />
        <TouchableOpacity onPress={onSend}>
          <Ionicons name="send" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chatOverlay: {
    position: "absolute",
    bottom: 170,
    right: 20,
    width: 300,
    height: 400,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    elevation: 10,
    zIndex: 1000,
    overflow: "hidden",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: COLORS.primary,
  },
  headerTitle: { color: COLORS.white, fontFamily: "Kanit_700Bold" },
  msgRow: { flexDirection: "row", marginBottom: 8 },
  aiAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 6 },
  bubble: { padding: 8, borderRadius: 8, marginBottom: 5, maxWidth: "80%" },
  userBubble: { alignSelf: "flex-end", backgroundColor: COLORS.primary },
  botBubble: { alignSelf: "flex-start", backgroundColor: "#eee" },
  chatText: { fontFamily: "Kanit_400Regular", color: "#333", fontSize: 13 },
  inputArea: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  input: {
    flex: 1,
    marginRight: 10,
    fontFamily: "Kanit_400Regular",
    fontSize: 14,
  },
  miniJobCard: {
    backgroundColor: "#f8f8ff",
    borderWidth: 1,
    borderColor: "#5D3FD3",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  jobTitle: {
    fontFamily: "Kanit_600SemiBold",
    fontSize: 14,
    marginVertical: 4,
  },
  metaText: { fontFamily: "Kanit_400Regular", fontSize: 12, color: "#666" },
  detailBtn: {
    backgroundColor: COLORS.primary,
    padding: 6,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 6,
  },
});
