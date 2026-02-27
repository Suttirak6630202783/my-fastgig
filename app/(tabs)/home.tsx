// app/home.tsx
import BottomMenu from "@/components/BottomMenu";
import ChatOverlay from "@/components/ChatOverlay";
import HomeHeader from "@/components/HomeHeader";
import JobCard from "@/components/job-Card";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect } from "expo-router"; // ✅ เพิ่ม useFocusEffect
import React, { useCallback, useState } from "react"; // ✅ เพิ่ม useCallback
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AI_URL, BASE_URL } from "./config";
import { COLORS } from "./theme";

const ai = axios.create({ baseURL: AI_URL, timeout: 10000 });

export default function HomeScreen() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [mode, setMode] = useState<"all" | "match">("all");
  const [showChat, setShowChat] = useState(false);
  const [chat, setChat] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const calcAvg = (min: any, max: any) => {
    const pmin = min != null ? Number(min) : null;
    const pmax = max != null ? Number(max) : null;
    if (pmin == null && pmax == null) return null;
    if (pmin == null) return pmax;
    if (pmax == null) return pmin;
    return (pmin + pmax) / 2;
  };

  const fetchAllJobs = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/jobs`);
      setJobs(res.data);
    } catch (err) {
      console.log("Jobs error:", err);
    }
  };

  const handleMatchNow = async () => {
    try {
      if (!userId) {
        setShowChat(true);
        setChat((prev) => [
          ...prev,
          {
            type: "bot",
            text: "⚠️ กรุณาเข้าสู่ระบบก่อนใช้ฟีเจอร์ Match Now นะครับ",
          },
        ]);
        return;
      }
      setJobs([]);
      const res = await ai.post(`/api/match`, { user_id: userId });
      setJobs(res.data.jobs || []);
      if (res.data?.message) {
        setShowChat(true);
        setChat((prev) => [...prev, { type: "bot", text: res.data.message }]);
      }
    } catch (err) {
      console.error("Match error:", err);
      alert("AI ยังไม่พร้อมใช้งาน");
      fetchAllJobs();
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      if (mode === "all") await fetchAllJobs();
      else await handleMatchNow();
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ เปลี่ยนจาก useEffect เป็น useFocusEffect เพื่อโหลด User ใหม่ทุกครั้ง
  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        // 1. โหลด User ID ล่าสุด
        const id = await AsyncStorage.getItem("user_id");
        if (id) {
          const uid = parseInt(id, 10);
          setUserId(Number.isFinite(uid) ? uid : null);
        } else {
          setUserId(null);
        }

        // 2. โหลดงาน (ถ้าต้องการให้โหลดใหม่ทุกครั้ง)
        fetchAllJobs();
      };

      initialize();

      // ตั้งค่า Chat เริ่มต้น (ทำแค่ครั้งเดียวได้ หรือทำทุกครั้งก็ได้)
      if (chat.length === 0) {
        setChat([
          { type: "bot", text: "🤖 สวัสดีครับ! อยากหางานอะไรบอกผมได้เลย" },
        ]);
      }
    }, []),
  );

  const sendMessage = async () => {
    if (!input.trim()) return;
    setChat((prev) => [...prev, { type: "user", text: input }]);
    const userInput = input;
    setInput("");
    try {
      const res = await ai.post(`/api/chatbot`, {
        message: userInput,
        user_id: userId,
      });
      setChat((prev) => [...prev, { type: "bot", text: res.data.reply }]);
      if (res.data.jobs?.length) {
        const jobCards = res.data.jobs.map((j: any) => ({
          type: "job",
          data: j,
        }));
        setChat((prev) => [...prev, ...jobCards]);
      }
    } catch (e) {
      setChat((prev) => [
        ...prev,
        { type: "bot", text: "Error connecting to AI" },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <HomeHeader
        mode={mode}
        setMode={setMode}
        onRefresh={onRefresh}
        onFetchAll={fetchAllJobs}
        onMatchNow={handleMatchNow}
      />

      <FlatList
        data={jobs}
        renderItem={({ item }) => (
          <JobCard item={item} mode={mode} calcAvg={calcAvg} />
        )}
        keyExtractor={(item, idx) =>
          item?.job_id ? item.job_id.toString() : `job-${idx}`
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>ยังไม่มีงานในขณะนี้</Text>
          </View>
        )}
      />

      {!showChat && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowChat(true)}>
          <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <ChatOverlay
        visible={showChat}
        onClose={() => setShowChat(false)}
        chatData={chat}
        input={input}
        setInput={setInput}
        onSend={sendMessage}
        calcAvg={calcAvg}
      />

      <BottomMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    padding: 20,
    paddingTop: 24,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 16,
    fontFamily: "Kanit_400Regular",
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 999,
  },
});
