// app/notifications.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://127.0.0.1:5000";

// ✅ ตัด is_read ออก
type Notification = {
  notification_id: number;
  notif_type: string;
  content: string;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
    } catch (e: any) {
      console.log("fetchNotifications error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const renderItem = ({ item }: { item: Notification }) => {
    let icon = "notifications-outline";
    let color = "#5D3FD3";

    if (item.notif_type === "APPLICATION_ACCEPTED") {
      icon = "checkmark-circle";
      color = "green";
    } else if (item.notif_type === "APPLICATION_REJECTED") {
      icon = "close-circle";
      color = "red";
    } else if (item.notif_type === "TRUST_POINTS") {
      icon = "star";
      color = "#f1c40f";
    }

    return (
      <View style={styles.card}>
        <Ionicons
          name={icon as any}
          size={28}
          color={color}
          style={{ marginRight: 10 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.content}>{item.content}</Text>
          <Text style={styles.time}>
            {new Date(item.created_at).toLocaleString("th-TH")}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notification</Text>
        </View>
        <ActivityIndicator
          size="large"
          color="#5D3FD3"
          style={{ marginTop: 50 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notification</Text>
      </View>

      {/* List */}
      {notifications.length === 0 ? (
        <View style={styles.noDataContainer}>
          <View style={styles.line} />
          <Text style={styles.noData}>No Data</Text>
          <View style={styles.line} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notification_id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7F7" },
  header: {
    backgroundColor: "#5D3FD3",
    paddingVertical: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "700",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  content: { fontSize: 14, color: "#333", fontWeight: "600" },
  time: { fontSize: 12, color: "#999", marginTop: 2 },
  noDataContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  noData: { color: "#b3b3b3", marginHorizontal: 6, fontWeight: "700" },
  line: {
    height: 1,
    backgroundColor: "#ccc",
    width: 60,
  },
});
