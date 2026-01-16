import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  Modal,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { COLORS } from "./theme";
import { BASE_URL, AI_URL } from "./config";

export default function HistoryPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"find" | "my">("find");
  const [data, setData] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFindJobs = async () => {
    const token = await AsyncStorage.getItem("token");
    const res = await axios.get(`${BASE_URL}/api/my-applications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(res.data);
  };

  const fetchMyJobs = async () => {
    const token = await AsyncStorage.getItem("token");
    const res = await axios.get(`${BASE_URL}/api/my-jobs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(res.data);
  };

  useEffect(() => {
    mode === "find" ? fetchFindJobs() : fetchMyJobs();
  }, [mode]);

  const confirmDelete = (jobId: number) => {
    setSelectedJobId(jobId);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedJobId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(`${BASE_URL}/api/jobs/${selectedJobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowModal(false);
      await fetchMyJobs();
    } catch (e: any) {
      console.log("Delete Error:", e.response?.data || e.message);
      alert(e.response?.data?.error || "ลบงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const renderFindJobs = ({ item }: any) => {
    let color = "#999";
    if (item.status_code === "PENDING") color = "#FFD700";
    else if (item.status_code === "COMPLETED") color = "#32CD32";
    else if (item.status_code === "REJECTED" || item.status_code === "MISS")
      color = "#FF4500";

    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.desc}>{item.description}</Text>
        <Text style={[styles.status, { color }]}>
          สถานะ: {item.status_code}
        </Text>
      </View>
    );
  };

  const renderMyJobs = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.desc}>{item.description}</Text>
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: COLORS.primary }]}
          onPress={() =>
            router.push(`/ApplicantsListScreen?jobId=${item.job_id}`)
          }
        >
          <Text style={styles.btnText}>ดูผู้สมัคร</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#FFA500" }]}
          onPress={() =>
            router.push({
              pathname: "/create",
              params: { edit: "true", job: JSON.stringify(item) },
            })
          }
        >
          <Text style={styles.btnText}>แก้ไข</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#FF4500" }]}
          onPress={() => confirmDelete(item.job_id)}
        >
          <Text style={styles.btnText}>ลบ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        {/* แถวบน: ชื่อหน้า + ปุ่มไปหน้าวิว */}
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>History</Text>

          {/* ✅ ปุ่มไปหน้าดู VIEW */}
          <TouchableOpacity
            onPress={() => router.push("/ViewUserApplicationsScreen")}
            style={styles.viewBtn}
          >
            <Text style={styles.viewBtnText}>UserApplications (VIEW)</Text>
          </TouchableOpacity>

          {/* ✅ ปุ่มเข้าไปดูพ้อย (เพิ่มเฉพาะปุ่มนี้) */}
          <TouchableOpacity
            onPress={() => router.push("/ViewUserPointsScreen")}
            style={styles.viewBtn}
          >
            <Text style={styles.viewBtnText}>UserPoints (VIEW)</Text>
          </TouchableOpacity>
        </View>

        {/* แถวล่าง: สวิตช์ Find / My */}
        <View style={styles.switchRow}>
          <TouchableOpacity
            style={[styles.switchBtn, mode === "find" && styles.switchActive]}
            onPress={() => setMode("find")}
          >
            <Text
              style={[
                styles.switchText,
                { color: mode === "find" ? "#fff" : "#5D3FD3" },
              ]}
            >
              Find Jobs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchBtn, mode === "my" && styles.switchActive]}
            onPress={() => setMode("my")}
          >
            <Text
              style={[
                styles.switchText,
                { color: mode === "my" ? "#fff" : "#5D3FD3" },
              ]}
            >
              My Jobs
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={data}
        keyExtractor={(item, i) => i.toString()}
        renderItem={mode === "find" ? renderFindJobs : renderMyJobs}
        contentContainerStyle={{ padding: 16 }}
      />

      {/* 🟣 Custom Delete Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View className="modalOverlay" style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>ลบงานนี้หรือไม่?</Text>
            <Text style={styles.modalText}>งานนี้จะถูกลบถาวรจากระบบ</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ccc" }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={{ color: "#333", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.primary }]}
                onPress={handleDelete}
                disabled={loading}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {loading ? "Deleting..." : "Confirm"}
                </Text>
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
    backgroundColor: "#5D3FD3",
    paddingVertical: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  // ✅ แถวบนของ header: ชื่อ + ปุ่มไปหน้าวิว
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  // ✅ สไตล์ปุ่มไปหน้าวิว
  viewBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBtnText: {
    color: "#5D3FD3",
    fontWeight: "700",
    fontSize: 12,
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
  switchBtn: {
    backgroundColor: "#EFEFFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 6,
    borderRadius: 8,
  },
  switchActive: { backgroundColor: "#5D3FD3" },
  switchText: { fontWeight: "700", fontSize: 14 },

  card: {
    backgroundColor: "#F8F8FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#333" },
  desc: { fontSize: 13, color: "#666", marginVertical: 4 },
  status: { fontSize: 13, fontWeight: "600" },

  btnRow: { flexDirection: "row", marginTop: 10 },
  btn: { flex: 1, padding: 8, borderRadius: 8, marginHorizontal: 4 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#333",
  },
  modalText: { fontSize: 14, color: "#666", marginBottom: 20 },
  modalBtns: { flexDirection: "row", width: "100%" },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 6,
  },
});
