// app/ViewUserPointsScreen.tsx
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
  TextInput,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import { BASE_URL, AI_URL } from "./config";

type Row = {
  user_id: number;
  full_name: string | null;
  email: string | null;
  total_points: number;
};

export default function ViewUserPointsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const q = query.trim()
        ? `?query=${encodeURIComponent(query.trim())}`
        : "";
      const res = await axios.get(`${BASE_URL}/api/view/user-points${q}`);
      setRows(res.data || []);
    } catch (e: any) {
      console.log("fetch user-points error:", e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderItem = ({ item }: { item: Row }) => {
    const color =
      item.total_points > 0
        ? "#32CD32"
        : item.total_points < 0
        ? "#FF4500"
        : "#666";
    return (
      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.name}>{item.full_name ?? "—"}</Text>
          <Text style={[styles.points, { color }]}>
            {item.total_points} pts
          </Text>
        </View>
        <Text style={styles.email}>{item.email ?? "no-email"}</Text>
        <Text style={styles.uid}>UID: {item.user_id}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>UserPoints (VIEW)</Text>

        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ค้นหาชื่อหรืออีเมล"
            placeholderTextColor="#aaa"
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={fetchData}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={fetchData}>
            <Text style={styles.searchBtnText}>ค้นหา</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.smallBtn} onPress={fetchData}>
            <Text style={styles.smallBtnText}>รีเฟรช</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.smallBtnText}>ย้อนกลับ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 20 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.user_id)}
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
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  searchBtnText: { color: "#5D3FD3", fontWeight: "700" },

  headerBtns: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    justifyContent: "flex-end",
  },
  smallBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallBtnText: { color: "#5D3FD3", fontWeight: "700", fontSize: 12 },

  card: {
    backgroundColor: "#F8F8FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: "700", color: "#333" },
  email: { fontSize: 13, color: "#666", marginTop: 2 },
  uid: { fontSize: 12, color: "#888", marginTop: 4 },
  points: { fontSize: 16, fontWeight: "800" },
});
