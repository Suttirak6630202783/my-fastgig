// app/ApplicantsListScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  RefreshControl,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL, AI_URL } from "./(tabs)/config";

export default function ApplicantsListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [applicants, setApplicants] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<
    "pass" | "ok" | "fail" | null
  >(null);
  const [targetApp, setTargetApp] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ โหลดผู้สมัครพร้อม Trust Level จาก API
  const fetchApplicants = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !jobId) return;
      const res = await axios.get(`${BASE_URL}/api/jobs/${jobId}/applicants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApplicants(res.data);
    } catch (e: any) {
      console.log("fetchApplicants error:", e.message);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [jobId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchApplicants();
    setRefreshing(false);
  }, [jobId]);

  // ✅ ฟังก์ชันจัดการสถานะ
  const acceptApplicant = async (id: number) => {
    const token = await AsyncStorage.getItem("token");
    try {
      await axios.post(
        `${BASE_URL}/api/applications/${id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("✅ ตอบรับผู้สมัครแล้ว");
      fetchApplicants();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.response?.data?.error || e.message;
      if (e?.response?.status === 409) {
        Alert.alert("⚠ งานนี้มีผู้ถูกเลือกแล้ว", "ไม่สามารถตอบรับได้อีก");
      } else {
        Alert.alert("❌ Error", msg);
      }
    }
  };

  const rejectApplicant = async (id: number) => {
    const token = await AsyncStorage.getItem("token");
    try {
      await axios.post(
        `${BASE_URL}/api/applications/${id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("❌ ปฏิเสธผู้สมัครแล้ว");
      fetchApplicants();
    } catch (e: any) {
      Alert.alert("❌ Error", e.response?.data?.error || e.message);
    }
  };

  const completeJob = (applicationId: number) => {
    setTargetApp(applicationId);
    setModalVisible(true);
  };

  const sendComplete = async () => {
    if (!targetApp || !selectedResult) return;
    const token = await AsyncStorage.getItem("token");
    try {
      const res = await axios.post(
        `${BASE_URL}/api/applications/${targetApp}/complete`,
        { result: selectedResult },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const completedJobs = res.data.completed_jobs ?? 0;

      Alert.alert(
        "🎉 ยืนยันงานเสร็จสิ้นแล้ว",
        `ตอนนี้ผู้สมัครคนนี้ทำงานสำเร็จทั้งหมด ${completedJobs} งาน`
      );

      setModalVisible(false);
      setSelectedResult(null);
      fetchApplicants();
    } catch (e: any) {
      Alert.alert("❌ Error", e.response?.data?.error || e.message);
    }
  };

  const safeBack = () => {
    // @ts-ignore
    if (navigation?.canGoBack && navigation.canGoBack()) navigation.goBack();
    else router.replace("/home");
  };

  const hasAccepted = applicants.some((a) => a.status_code === "ACCEPTED");

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.skill}>{item.skills || "ไม่ระบุทักษะ"}</Text>

          <Text style={styles.trust}>
            ⭐ ระดับความน่าเชื่อถือ:{" "}
            <Text style={styles.trustHighlight}>
              {item.trust_level || "🆕 Newbie"}
            </Text>
          </Text>

          <Text style={styles.trustPoint}>
            ({item.trust_points || 0} คะแนน)
          </Text>

          <Text style={styles.completed}>
            งานสำเร็จแล้ว: {item.completed_jobs ?? 0} งาน
          </Text>

          <Text style={styles.status}>สถานะ: {item.status_code}</Text>
        </View>
      </View>

      {/* ปุ่มสถานะ */}
      {item.status_code === "PENDING" && !hasAccepted && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => acceptApplicant(item.application_id)}
          >
            <Text style={styles.btnText}>ตอบรับ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => rejectApplicant(item.application_id)}
          >
            <Text style={styles.btnText}>ปฏิเสธ</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status_code === "ACCEPTED" && (
        <TouchableOpacity
          style={styles.completeBtn}
          onPress={() => completeJob(item.application_id)}
        >
          <Text style={styles.btnText}>ยืนยันงานเสร็จสิ้น</Text>
        </TouchableOpacity>
      )}

      {item.status_code === "DONE" && (
        <Text style={{ color: "green", marginTop: 6 }}>✔ งานเสร็จแล้ว</Text>
      )}
      {item.status_code === "REJECTED" && (
        <Text style={{ color: "red", marginTop: 6 }}>❌ ถูกปฏิเสธ</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={safeBack} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ผู้สมัครงาน</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={applicants}
        keyExtractor={(item) => item.application_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20, color: "#666" }}>
            ยังไม่มีผู้สมัคร
          </Text>
        }
      />

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ยืนยันผลการทำงาน</Text>

            {["pass", "ok", "fail"].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.optionBtn,
                  selectedResult === r && {
                    backgroundColor:
                      r === "pass" ? "green" : r === "ok" ? "orange" : "red",
                  },
                ]}
                onPress={() => setSelectedResult(r as any)}
              >
                <Text style={styles.optionText}>
                  {r === "pass"
                    ? "ผ่าน (+10)"
                    : r === "ok"
                    ? "พอใช้ (+5)"
                    : "ไม่ผ่าน (-5)"}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={{ flexDirection: "row", marginTop: 20 }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={sendComplete}
              >
                <Text style={styles.confirmText}>ยืนยัน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 6,
  },
  card: {
    backgroundColor: "#F8F8FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#ddd" },
  name: { fontSize: 16, fontWeight: "700", color: "#333" },
  skill: { fontSize: 14, color: "#666", marginTop: 2 },
  trust: { fontSize: 13, color: "#555", marginTop: 4 },
  trustHighlight: { fontWeight: "700", color: "#5D3FD3" },
  trustPoint: { fontSize: 12, color: "#888", marginTop: 1 },
  completed: { fontSize: 12, color: "#555", marginTop: 2, fontWeight: "600" },
  status: { fontSize: 12, color: "#999", marginTop: 2 },
  actionRow: { flexDirection: "row", marginTop: 10 },
  acceptBtn: {
    flex: 1,
    backgroundColor: "green",
    padding: 10,
    borderRadius: 8,
    marginRight: 5,
    alignItems: "center",
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: "red",
    padding: 10,
    borderRadius: 8,
    marginLeft: 5,
    alignItems: "center",
  },
  completeBtn: {
    marginTop: 10,
    backgroundColor: "#5D3FD3",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  optionBtn: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
    alignItems: "center",
    backgroundColor: "#eee",
  },
  optionText: { color: "#000", fontWeight: "600" },
  cancelBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: "#ccc",
    borderRadius: 8,
    marginRight: 5,
    alignItems: "center",
  },
  confirmBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: "#5D3FD3",
    borderRadius: 8,
    marginLeft: 5,
    alignItems: "center",
  },
  cancelText: { color: "#333", fontWeight: "600" },
  confirmText: { color: "#fff", fontWeight: "600" },
});
