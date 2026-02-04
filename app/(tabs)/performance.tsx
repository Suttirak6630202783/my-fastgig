// app/user-performance.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "./config";

type Perf = {
  user_id: number;
  full_name: string | null;
  total_applied: number;
  accepted_jobs: number;
  completed_jobs: number;
  trust_points: number;
  trust_level: string;
};

export default function UserPerformance() {
  const router = useRouter();
  const [data, setData] = useState<Perf | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const uid = await AsyncStorage.getItem("user_id");

      if (!uid) {
        Alert.alert("Error", "ไม่พบ user_id กรุณาเข้าสู่ระบบใหม่");
        return;
      }

      const res = await axios.get(`${BASE_URL}/api/users/${uid}/performance`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setData(res.data);
    } catch (e: any) {
      console.log("performance error:", e?.message);
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPerformance();
    setRefreshing(false);
  }, []);

  // --------- แต้ม → ป้ายระดับ (สี) ----------
  const levelColor = (() => {
    switch (data?.trust_level) {
      case "🌟 Expert":
        return "#2E7D32";
      case "✅ Trusted":
        return "#1E88E5";
      case "🙂 Basic":
        return "#7E57C2";
      case "🆕 Newbie":
        return "#6B4EFF";
      case "⚠️ Negative":
        return "#E53935";
      default:
        return "#6B4EFF";
    }
  })();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>สรุปผลงานผู้ใช้</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Body */}
      {loading && !data ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color="#5D3FD3" />
          <Text style={{ color: "#6b7280", marginTop: 8 }}>
            กำลังโหลดข้อมูล...
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        >
          {/* ชื่อ & ป้ายระดับ */}
          <View style={styles.profileCard}>
            <Text style={styles.nameText}>
              {data?.full_name || "ผู้ใช้ไม่ระบุชื่อ"}
            </Text>

            <View
              style={[
                styles.badge,
                { borderColor: levelColor, backgroundColor: levelColor },
              ]}
            >
              <Ionicons name="shield-checkmark" size={14} color="#fff" />
              <Text style={styles.badgeText}>
                {" "}
                {data?.trust_level || "N/A"}
              </Text>
              <Text style={styles.badgePts}>
                {" "}
                • {data?.trust_points ?? 0} pts
              </Text>
            </View>
          </View>

          {/* การ์ดตัวเลขรวม */}
          <View style={styles.grid}>
            <View style={[styles.kpiCard, { backgroundColor: "#EEF2FF" }]}>
              <View style={styles.kpiRow}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#4F46E5"
                />
                <Text style={styles.kpiLabel}>สมัครทั้งหมด</Text>
              </View>
              <Text style={[styles.kpiValue, { color: "#4F46E5" }]}>
                {data?.total_applied ?? 0}
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: "#ECFDF5" }]}>
              <View style={styles.kpiRow}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={18}
                  color="#059669"
                />
                <Text style={styles.kpiLabel}>ได้รับการตอบรับ</Text>
              </View>
              <Text style={[styles.kpiValue, { color: "#059669" }]}>
                {data?.accepted_jobs ?? 0}
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: "#F0FDF4" }]}>
              <View style={styles.kpiRow}>
                <Ionicons name="trophy-outline" size={18} color="#16A34A" />
                <Text style={styles.kpiLabel}>งานสำเร็จ</Text>
              </View>
              <Text style={[styles.kpiValue, { color: "#16A34A" }]}>
                {data?.completed_jobs ?? 0}
              </Text>
            </View>
          </View>

          {/* ปุ่มรีเฟรช */}
          <TouchableOpacity onPress={onRefresh} style={styles.btn}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.btnText}>รีเฟรชข้อมูล</Text>
          </TouchableOpacity>

          {/* เคสไม่มีข้อมูล */}
          {!loading && data && data.total_applied === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#6b7280"
              />
              <Text style={styles.emptyText}>
                ยังไม่มีการสมัครงาน ลองไปสมัครงานก่อนนะครับ
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 52,
    backgroundColor: "#5D3FD3",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },

  profileCard: {
    backgroundColor: "#F8F8FF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  nameText: { fontSize: 18, fontWeight: "800", color: "#111827" },
  badge: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontWeight: "700" },
  badgePts: { color: "#fff", opacity: 0.95, fontWeight: "600" },

  grid: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  kpiCard: {
    flexBasis: "32%",
    flexGrow: 1,
    minWidth: 110,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  kpiRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  kpiLabel: { color: "#374151", fontSize: 12, fontWeight: "600" },
  kpiValue: { fontSize: 22, fontWeight: "900", marginTop: 6 },

  btn: {
    marginTop: 6,
    backgroundColor: "#5D3FD3",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  emptyBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  emptyText: { color: "#6b7280", fontSize: 13, textAlign: "center" },
});
