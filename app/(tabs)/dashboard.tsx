// app/dashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "./config";

type JobSummaryRow = { status_code: string; total_jobs: number };

export default function Dashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<JobSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get<JobSummaryRow[]>(
        `${BASE_URL}/api/admin/job-summary`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      );
      setRows(res.data || []);
    } catch (e: any) {
      console.log("job-summary error:", e?.message);
      Alert.alert("Error", "โหลดสรุปงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const { total, items } = useMemo(() => {
    const mapName: Record<
      string,
      { label: string; color: string; order: number }
    > = {
      OPEN: { label: "เปิดรับ (OPEN)", color: "#2563eb", order: 1 },
      COMPLETED: { label: "สำเร็จ (COMPLETED)", color: "#16a34a", order: 2 },
      CLOSED: { label: "ปิด (CLOSED)", color: "#ef4444", order: 3 },
    };
    const total = rows.reduce((acc, r) => acc + (r.total_jobs || 0), 0);
    const items = rows
      .map((r) => ({
        key: r.status_code,
        label: mapName[r.status_code]?.label ?? r.status_code,
        color: mapName[r.status_code]?.color ?? "#6b7280",
        order: mapName[r.status_code]?.order ?? 99,
        value: r.total_jobs || 0,
      }))
      .sort((a, b) => a.order - b.order);
    return { total, items };
  }, [rows]);

  const renderItem = ({ item }: { item: (typeof items)[number] }) => (
    <View style={[styles.card, { borderColor: item.color }]}>
      <Text style={[styles.cardTitle, { color: item.color }]}>
        {item.label}
      </Text>
      <Text style={[styles.cardValue, { color: item.color }]}>
        {item.value} งาน
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>สรุประบบงาน (Dashboard)</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.topCards}>
        <View style={[styles.topCard, { backgroundColor: "#2563eb" }]}>
          <Text style={styles.topLabel}>งานทั้งหมด</Text>
          <Text style={styles.topNumber}>{total}</Text>
        </View>
        <View style={[styles.topCard, { backgroundColor: "#16a34a" }]}>
          <Text style={styles.topLabel}>สำเร็จ</Text>
          <Text style={styles.topNumber}>
            {items.find((x) => x.key === "COMPLETED")?.value ?? 0}
          </Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.key}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: "center", color: "#6b7280" }}>
              ยังไม่มีข้อมูลสรุป
            </Text>
          ) : null
        }
      />

      <TouchableOpacity onPress={onRefresh} style={styles.fab}>
        <Ionicons name="refresh" size={22} color="#fff" />
      </TouchableOpacity>
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
  topCards: { flexDirection: "row", gap: 10, padding: 16 },
  topCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  topLabel: { color: "#fff", fontSize: 12, opacity: 0.9 },
  topNumber: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 2 },
  card: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#F8F8FF",
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardValue: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 22,
    backgroundColor: "#5D3FD3",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});
