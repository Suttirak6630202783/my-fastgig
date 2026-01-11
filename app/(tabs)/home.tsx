// app/home.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "./theme";

const BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://127.0.0.1:5000";

const AI_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5001" : "http://127.0.0.1:5001";

/** axios instance สำหรับ AI + timeout */
const ai = axios.create({ baseURL: AI_URL, timeout: 10000 });

type ChatItem =
  | { type: "user"; text: string }
  | { type: "bot"; text: string }
  | { type: "job"; data: any };

export default function HomeScreen() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [mode, setMode] = useState<"all" | "match">("all");
  const [showChat, setShowChat] = useState(false);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // ✅ คำนวณค่าเฉลี่ยฝั่งแอป (ไม่แตะ API)
  const calcAvg = (min: any, max: any) => {
    const pmin = min != null ? Number(min) : null;
    const pmax = max != null ? Number(max) : null;
    if (pmin == null && pmax == null) return null;
    if (pmin == null) return pmax;
    if (pmax == null) return pmin;
    return (pmin + pmax) / 2;
  };

  // ----- โหลด All Jobs -----
  const fetchAllJobs = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/jobs`);
      setJobs(res.data);
    } catch (err) {
      console.log("Jobs error:", err);
    }
  };

  // ----- Match Jobs (จาก AI Service) -----
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

      // ✅ เช็คสุขภาพ AI ก่อนเรียก
      const health = await ai
        .get("/_health")
        .then((r) => r.data)
        .catch(() => null);
      if (!health?.ok) {
        setShowChat(true);
        setChat((prev) => [
          ...prev,
          { type: "bot", text: "❌ AI ยังไม่พร้อม (เช็คที่ /_health ไม่ผ่าน)" },
        ]);
        return;
      }

      const res = await ai.post(`/api/match`, { user_id: userId });

      // โชว์ข้อความสรุปของ AI ถ้ามี
      if (res.data?.message) {
        setShowChat(true);
        setChat((prev) => [...prev, { type: "bot", text: res.data.message }]);
      }

      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error("Match error:", err);
      setShowChat(true);
      setChat((prev) => [
        ...prev,
        {
          type: "bot",
          text: "❌ เกิดข้อผิดพลาดในการเรียกใช้ Match Now โปรดลองอีกครั้ง",
        },
      ]);
    }
  };

  // ----- pull-to-refresh -----
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      if (mode === "all") {
        await fetchAllJobs();
      } else {
        await handleMatchNow();
      }
    } finally {
      setRefreshing(false);
    }
  };

  // ----- โหลดครั้งแรก -----
  useEffect(() => {
    fetchAllJobs();
    setChat([
      {
        type: "bot",
        text: "🤖 สวัสดีครับ! ผมคือผู้ช่วย AI หากคุณอยากหางาน พิมพ์เช่น 'อยากทำอาหาร', 'อยากขนของ' ได้เลยครับ 🍀",
      },
    ]);
  }, []);

  // ----- โหลด user_id จาก AsyncStorage -----
  useEffect(() => {
    const loadUserId = async () => {
      const id = await AsyncStorage.getItem("user_id");
      if (id) {
        const uid = parseInt(id, 10);
        const valid = Number.isFinite(uid) ? uid : null;
        setUserId(valid);
        console.log("Loaded user_id:", valid);
      } else {
        console.warn("⚠️ ไม่มี user_id ใน AsyncStorage");
      }
    };
    loadUserId();
  }, []);

  // ----- Chatbot -----
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

      setChat((prev) => [
        ...prev,
        {
          type: "bot",
          text:
            res.data.reply ||
            `จากสิ่งที่คุณพิมพ์มา ผมแนะนำงานที่ใกล้เคียงครับ 🔎`,
        },
      ]);

      if (res.data.jobs?.length) {
        const jobCards = res.data.jobs.map((j: any) => ({
          type: "job",
          data: j,
        }));
        setChat((prev) => [...prev, ...jobCards]);
      }
    } catch (e) {
      console.log("Chatbot error:", e);
      setChat((prev) => [
        ...prev,
        { type: "bot", text: "❌ เกิดข้อผิดพลาดในการเชื่อมต่อ AI" },
      ]);
    }
  };

  // ----- render ข้อความ/การ์ด -----
  const renderChat = ({ item }: any) => {
    if (item.type === "bot") {
      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 8,
          }}
        >
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/4712/4712108.png",
            }}
            style={styles.aiAvatar}
          />
          <View style={[styles.msgBubble, styles.botMsg]}>
            <Text style={styles.aiText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    if (item.type === "user") {
      return (
        <View style={{ alignSelf: "flex-end", marginBottom: 8 }}>
          <View style={[styles.msgBubble, styles.userMsg]}>
            <Text style={{ color: "#fff" }}>{item.text}</Text>
          </View>
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
        <View
          style={[
            styles.jobCard,
            {
              borderColor: "#5D3FD3",
              borderWidth: 1,
              backgroundColor: "#f8f8ff",
            },
          ]}
        >
          <Text style={{ fontWeight: "700", color: "#5D3FD3" }}>
            🎯 AI แนะนำ
          </Text>
          <Text style={styles.jobTitle}>{job.title}</Text>

          {job.job_type ? (
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>{job.job_type}</Text>
            </View>
          ) : null}

          <Text style={styles.jobDesc}>{job.description}</Text>

          <Text style={[styles.metaText, { marginTop: 2 }]}>
            💰 ราคาค่าเฉลี่ย:{" "}
            {avg != null ? `${Number(avg).toFixed(2)} บาท` : "-"}
          </Text>

          <Text style={styles.metaText}>
            อายุที่ต้องการ: {job.age_min || "-"} - {job.age_max || "-"} ปี
          </Text>
          <Text style={styles.metaText}>
            💵 {job.pay_min || "-"} - {job.pay_max || "-"} บาท
          </Text>
          <Text style={styles.metaText}>
            📍 {job.location_text || "ไม่ระบุสถานที่"}
          </Text>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() =>
              router.push({
                pathname: "/job-detail",
                params: { job: JSON.stringify(job) },
              })
            }
          >
            <Text style={styles.acceptBtnText}>ดูรายละเอียด</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  // ----- render การ์ดงานใน Home -----
  const renderJobHome = ({ item }: any) => {
    const avg =
      item?.avg_pay != null
        ? Number(item.avg_pay)
        : calcAvg(item.pay_min, item.pay_max);
    return (
      <View style={styles.jobCard}>
        {mode === "match" && (
          <View style={styles.recommendBadge}>
            <Text style={styles.recommendText}>งานแนะนำ</Text>
          </View>
        )}
        <View style={styles.ownerRow}>
          <Image
            source={{
              uri: item.profile_image
                ? `${BASE_URL}${item.profile_image}`
                : "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            }}
            style={styles.avatar}
          />
          <Text style={styles.ownerName}>{item.full_name}</Text>
        </View>

        <Text style={styles.jobTitle}>{item.title}</Text>

        {item.job_type ? (
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{item.job_type}</Text>
          </View>
        ) : null}

        <Text style={styles.jobDesc} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.metaText}>
          อายุที่ต้องการ: {item.age_min || "-"} - {item.age_max || "-"} ปี
        </Text>

        <Text style={[styles.metaText, { marginTop: 2 }]}>
          💰 ราคาค่าเฉลี่ย:{" "}
          {avg != null ? `${Number(avg).toFixed(2)} บาท` : "-"}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={14} color="#5D3FD3" />
            <Text style={styles.metaText}>
              {item.pay_min} - {item.pay_max} บาท
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color="#5D3FD3" />
            <Text style={styles.metaText}>
              {item.location_text && item.location_text.trim() !== ""
                ? item.location_text
                : item.distance_km
                ? `${item.distance_km.toFixed(1)} กม.`
                : "ไม่ระบุสถานที่"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() =>
            router.push({
              pathname: "/job-detail",
              params: { job: JSON.stringify(item) },
            })
          }
        >
          <Text style={styles.acceptBtnText}>ดูรายละเอียด</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ----- UI หลัก -----
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>FIND JOBS</Text>

        {/* ✅ แถวปุ่มมุมขวาบน: Refresh + Logout */}
        <View style={styles.topRightRow}>
          <TouchableOpacity style={styles.refreshBtnHero} onPress={onRefresh}>
            <Ionicons name="refresh" size={16} color={COLORS.primary} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtnHero}
            onPress={async () => {
              await AsyncStorage.removeItem("token");
              await AsyncStorage.removeItem("user_id");
              router.replace("/"); // เด้งไปหน้า Login
            }}
          >
            <Ionicons name="log-out-outline" size={16} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Jobs Section */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row" }}>
            {/* ✅ ปุ่มใหม่: ไปหน้า Dashboard */}
            <TouchableOpacity
              style={[
                styles.createBtn,
                { marginRight: 8, backgroundColor: "#5D3FD3" },
              ]}
              onPress={() => router.push("/dashboard")}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                📊 Dashboard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createBtn, { marginRight: 8 }]}
              onPress={() => router.push("/create")}
            >
              <Text style={styles.createBtnText}>+ Create Jobs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.createBtn,
                mode === "all" && { backgroundColor: "#5D3FD3" },
              ]}
              onPress={() => {
                setMode("all");
                fetchAllJobs();
              }}
            >
              <Text style={{ color: mode === "all" ? "#fff" : COLORS.primary }}>
                All Jobs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.createBtn,
                { marginLeft: 8 },
                mode === "match" && { backgroundColor: "#5D3FD3" },
              ]}
              onPress={() => {
                setMode("match");
                setJobs([]);
                handleMatchNow();
              }}
            >
              <Text
                style={{ color: mode === "match" ? "#fff" : COLORS.primary }}
              >
                🎯 Match Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View
          style={{ height: 1, backgroundColor: COLORS.line, marginTop: 6 }}
        />
      </View>

      <FlatList
        data={jobs}
        renderItem={renderJobHome}
        keyExtractor={(item, idx) =>
          item?.job_id ? item.job_id.toString() : `job-${idx}`
        }
        contentContainerStyle={{ padding: 16 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={() => (
          <Text
            style={{ textAlign: "center", color: COLORS.sub, marginTop: 24 }}
          >
            {mode === "match"
              ? "ยังไม่มีงานที่ตรงกับสกิลของคุณ"
              : "ยังไม่มีงาน"}
          </Text>
        )}
      />

      {/* Floating Chat Button */}
      {!showChat && (
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => setShowChat(true)}
        >
          <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Chat Overlay */}
      {showChat && (
        <View style={styles.chatOverlay}>
          <View style={styles.chatHeader}>
            <Text style={{ fontWeight: "700", color: "#fff" }}>
              AI Assistant
            </Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={chat}
            keyExtractor={(_, i) => i.toString()}
            renderItem={renderChat}
            contentContainerStyle={{ padding: 12 }}
          />

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="พิมพ์ข้อความ..."
              value={input}
              onChangeText={setInput}
            />
            <TouchableOpacity style={styles.btn} onPress={sendMessage}>
              <Text style={{ color: "#fff" }}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroTitle: { fontSize: 22, color: "#fff", fontFamily: "Kanit_700Bold" },

  // ✅ แถวปุ่มมุมขวาบน
  topRightRow: {
    position: "absolute",
    right: 12,
    top: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  // ✅ ปุ่ม Refresh (ไม่ใช้ absolute แล้ว)
  refreshBtnHero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshText: {
    marginLeft: 6,
    color: COLORS.primary,
    fontFamily: "Kanit_600SemiBold",
    fontSize: 12,
  },

  // ✅ ปุ่ม Logout ข้างๆ Refresh
  logoutBtnHero: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E74C3C",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowOpacity: 0.2,
    elevation: 3,
  },
  logoutText: {
    marginLeft: 6,
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },

  sectionBarTitle: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: "Kanit_600SemiBold",
  },
  createBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#EFEFFF",
  },
  createBtnText: {
    fontFamily: "Kanit_500Medium",
    color: COLORS.primary,
    fontSize: 13,
  },
  jobCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowOpacity: 0.05,
    elevation: 2,
  },
  ownerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  ownerName: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  jobTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },

  // ✅ ป้ายประเภทงาน
  typePill: {
    alignSelf: "flex-start",
    backgroundColor: "#EFEFFF",
    borderWidth: 1,
    borderColor: "#5D3FD3",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 6,
    marginBottom: 6,
  },
  typePillText: {
    fontSize: 12,
    color: "#5D3FD3",
    fontWeight: "700",
  },

  jobDesc: { fontSize: 13, color: COLORS.sub, marginTop: 2 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: {
    fontSize: 12,
    color: COLORS.sub,
    marginLeft: 4,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  acceptBtnText: {
    fontSize: 14,
    color: "#fff",
    fontFamily: "Kanit_600SemiBold",
    textAlign: "center",
  },

  chatBtn: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: "#5D3FD3",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  chatOverlay: {
    position: "absolute",
    bottom: 80,
    right: 20,
    width: 300,
    height: 420,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowOpacity: 0.2,
    elevation: 6,
    overflow: "hidden",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#5D3FD3",
  },
  msgBubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  userMsg: { alignSelf: "flex-end", backgroundColor: "#5D3FD3" },
  botMsg: { alignSelf: "flex-start", backgroundColor: "#666" },
  inputRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btn: {
    marginLeft: 8,
    backgroundColor: "#5D3FD3",
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: "center",
  },

  recommendBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendText: { fontSize: 12, fontWeight: "700", color: "#333" },
  aiAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  aiText: { color: "#fff", fontSize: 14 },
});
