import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../app/(tabs)/theme"; // ⚠️ เช็ค Path ให้ถูก (ถ้า theme อยู่ใน app/)

interface HomeHeaderProps {
  mode: "all" | "match";
  setMode: (mode: "all" | "match") => void;
  onRefresh: () => void;
  onFetchAll: () => void;
  onMatchNow: () => void;
}

export default function HomeHeader({
  mode,
  setMode,
  onRefresh,
  onFetchAll,
  onMatchNow,
}: HomeHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>งานทั้งหมด</Text>
        <TouchableOpacity style={styles.refreshBtnSmall} onPress={onRefresh}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, mode === "all" && styles.tabBtnActive]}
          onPress={() => {
            setMode("all");
            onFetchAll();
          }}
        >
          <Text
            style={[styles.tabText, mode === "all" && styles.tabTextActive]}
          >
            All Jobs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, mode === "match" && styles.tabBtnActive]}
          onPress={() => {
            setMode("match");
            onMatchNow();
          }}
        >
          <Text
            style={[styles.tabText, mode === "match" && styles.tabTextActive]}
          >
            AI Match
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => router.push("/dashboard")}
        >
          <Text style={styles.tabText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, styles.createBtn]}
          onPress={() => router.push("/create")}
        >
          <Text
            style={[
              styles.tabText,
              { color: "#fff", fontFamily: "Kanit_600SemiBold" },
            ]}
          >
            + Create
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.primary,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    elevation: 6,
    zIndex: 10,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Kanit_700Bold",
    color: "#fff",
  },
  refreshBtnSmall: {
    backgroundColor: COLORS.primaryBtn,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: COLORS.white,
    fontFamily: "Kanit_600SemiBold",
    fontSize: 12,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  tabBtnActive: {
    backgroundColor: COLORS.white,
  },
  createBtn: {
    backgroundColor: COLORS.primaryBtn,
  },
  tabText: {
    color: "#E0E0E0",
    fontSize: 12,
    fontFamily: "Kanit_500Medium",
  },
  tabTextActive: {
    color: COLORS.primary,
  },
});
