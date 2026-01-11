// app/ViewUserApplicationsScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  ActivityIndicator,
} from "react-native";
import axios from "axios";

const BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://127.0.0.1:5000";

type Row = {
  application_id: number;
  full_name: string;
  job_title: string;
  status_code: string;
  applied_at: string;
};

const STATUSES = ["ALL", "PENDING", "ACCEPTED", "REJECTED", "DONE"];

export default function ViewUserApplicationsScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("ALL");

  const fetchData = async () => {
    try {
      setLoading(true);
      const qs = status === "ALL" ? "" : `?status=${status}`;
      const res = await axios.get(
        `${BASE_URL}/api/view/user-applications${qs}`
      );
      setRows(res.data || []);
    } catch (e: any) {
      console.log("fetch view error:", e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [status]);

  const renderItem = ({ item }: { item: Row }) => {
    let color = "#666";
    if (item.status_code === "PENDING") color = "#FFD700";
    else if (item.status_code === "ACCEPTED") color = "#5D3FD3";
    else if (item.status_code === "REJECTED") color = "#FF4500";
    else if (item.status_code === "DONE") color = "#32CD32";

    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.job_title}</Text>
        <Text style={styles.desc}>ผู้สมัคร: {item.full_name}</Text>
        <Text style={[styles.status, { color }]}>
          สถานะ: {item.status_code}
        </Text>
        <Text style={styles.time}>
          สมัครเมื่อ: {new Date(item.applied_at).toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>UserApplications (VIEW)</Text>
        <View style={styles.filterRow}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterBtn, status === s && styles.filterActive]}
              onPress={() => setStatus(s)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: status === s ? "#fff" : "#5D3FD3" },
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 20 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.application_id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#888" }}>
              ไม่มีข้อมูล
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: "#5D3FD3",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 12,
  },
  filterBtn: {
    backgroundColor: "#EFEFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    margin: 4,
  },
  filterActive: { backgroundColor: "#5D3FD3" },
  filterText: { fontWeight: "700", fontSize: 12 },
  card: {
    backgroundColor: "#F8F8FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#333" },
  desc: { fontSize: 13, color: "#666", marginVertical: 4 },
  status: { fontSize: 13, fontWeight: "700" },
  time: { fontSize: 12, color: "#777", marginTop: 4 },
});
