// app/performance.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "./config";

export default function PerformanceScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // ✅ สถานะ Refresh

  const fetchPerformance = async (isRefresh = false) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("user_id");

      if (!token || !userId) {
        router.replace("/");
        return;
      }

      // ถ้าเป็นการ Refresh ไม่ต้องโชว์ Loading ใหญ่ (ใช้ Spinner เล็กแทน)
      if (!isRefresh) setLoading(true);

      const res = await axios.get(
        `${BASE_URL}/api/users/${userId}/performance`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setStats(res.data);
    } catch (error) {
      console.log("Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false); // ✅ ปิด Spinner Refresh
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  // ✅ ฟังก์ชันสำหรับ Pull-to-Refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchPerformance(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5D3FD3" />
      </View>
    );
  }

  // คำนวณสีตามเกรด
  const trustLevel = stats?.trust_level || "Newbie";
  let gradeColor = "#6B4EFF";
  if (trustLevel === "Professional") gradeColor = "#2E7D32";
  else if (trustLevel === "Trusted") gradeColor = "#1E88E5";
  else if (trustLevel === "Active") gradeColor = "#7E57C2";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ผลงานของฉัน</Text>

        {/* ✅ ปุ่ม Refresh มุมขวาบน */}
        <TouchableOpacity
          onPress={() => fetchPerformance(false)}
          style={styles.refreshBtn}
        >
          <Ionicons name="refresh" size={24} color="#5D3FD3" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          // ✅ เพิ่ม Pull-to-Refresh
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#5D3FD3"]}
          />
        }
      >
        {/* การ์ดสรุปคะแนนหลัก */}
        <View style={[styles.mainCard, { backgroundColor: gradeColor }]}>
          <Text style={styles.gradeTitle}>ระดับความน่าเชื่อถือ</Text>
          <Text style={styles.gradeText}>{trustLevel}</Text>
          <Text style={styles.pointsText}>
            {stats?.trust_points || 0} คะแนน
          </Text>
          <Ionicons
            name="trophy"
            size={80}
            color="rgba(255,255,255,0.2)"
            style={styles.bgIcon}
          />
        </View>

        {/* สถิติย่อย */}
        <View style={styles.statsRow}>
          {/* งานที่ทำเสร็จ */}
          <View style={styles.statBox}>
            <View style={[styles.iconCircle, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.statNum}>{stats?.completed_jobs || 0}</Text>
            <Text style={styles.statLabel}>งานที่ทำสำเร็จ</Text>
          </View>

          {/* งานที่สมัครไป */}
          <View style={styles.statBox}>
            <View style={[styles.iconCircle, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="paper-plane" size={24} color="#2196F3" />
            </View>
            <Text style={styles.statNum}>{stats?.total_applied || 0}</Text>
            <Text style={styles.statLabel}>งานที่สมัคร</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {/* งานที่ได้รับเลือก */}
          <View style={styles.statBox}>
            <View style={[styles.iconCircle, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="briefcase" size={24} color="#FF9800" />
            </View>
            <Text style={styles.statNum}>{stats?.accepted_jobs || 0}</Text>
            <Text style={styles.statLabel}>งานที่ได้รับเลือก</Text>
          </View>

          {/* อัตราความสำเร็จ */}
          <View style={styles.statBox}>
            <View style={[styles.iconCircle, { backgroundColor: "#F3E5F5" }]}>
              <Ionicons name="pie-chart" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.statNum}>
              {stats?.total_applied > 0
                ? Math.round((stats.accepted_jobs / stats.total_applied) * 100)
                : 0}
              %
            </Text>
            <Text style={styles.statLabel}>อัตราการได้งาน</Text>
          </View>
        </View>

        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>💡 คำแนะนำเพื่อเพิ่มคะแนน</Text>
          <Text style={styles.tipsText}>
            • ทำงานให้สำเร็จและกดจบงานเพื่อรับแต้ม
          </Text>
          <Text style={styles.tipsText}>• กรอกข้อมูลโปรไฟล์ให้ครบถ้วน</Text>
          <Text style={styles.tipsText}>
            • หลีกเลี่ยงการยกเลิกงานหลังจากได้รับการจ้าง
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 }, // ✅ Style ปุ่ม Refresh
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },

  mainCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
    overflow: "hidden",
  },
  gradeTitle: { color: "rgba(255,255,255,0.9)", fontSize: 16, marginBottom: 4 },
  gradeText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  pointsText: { color: "#fff", fontSize: 18, marginTop: 4, fontWeight: "500" },
  bgIcon: { position: "absolute", right: -10, bottom: -10 },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statBox: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statNum: { fontSize: 24, fontWeight: "bold", color: "#333" },
  statLabel: { fontSize: 13, color: "#666", marginTop: 4 },

  tipsBox: {
    marginTop: 10,
    backgroundColor: "#FFFDE7",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFF59D",
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#F57F17",
    marginBottom: 8,
  },
  tipsText: { fontSize: 14, color: "#555", marginBottom: 6, lineHeight: 20 },
});
