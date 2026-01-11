// app/job-detail.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "./theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://127.0.0.1:5000";

export default function JobDetail() {
  const { job } = useLocalSearchParams<{ job: string }>();
  const router = useRouter();
  const data = job ? JSON.parse(job) : {};

  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // ✅ ฟังก์ชันคำนวณราคาเฉลี่ย (แตะเท่าที่จำเป็น)
  const calcAvg = (min: any, max: any) => {
    const pmin = min != null ? Number(min) : null;
    const pmax = max != null ? Number(max) : null;
    if (pmin == null && pmax == null) return null;
    if (pmin == null) return pmax;
    if (pmax == null) return pmin;
    return (pmin + pmax) / 2;
  };
  const avg = calcAvg(data?.pay_min, data?.pay_max);

  // ✅ รอจน job_id มีค่าแล้วค่อยเช็ค
  useEffect(() => {
    const init = async () => {
      if (!data?.job_id) return;

      const uid = await AsyncStorage.getItem("user_id");
      if (uid && data?.user_id && Number(uid) === Number(data.user_id)) {
        setIsOwner(true);
      }

      await checkApplied();
    };
    init();
  }, [data.job_id]);

  const checkApplied = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const uid = await AsyncStorage.getItem("user_id");
      if (!token || !uid) return;
      if (!data?.job_id) return;

      const res = await axios.get(`${BASE_URL}/api/my-applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const found = res.data.find(
        (a: any) => Number(a.job_id) === Number(data.job_id)
      );
      if (found) setAlreadyApplied(true);
      else setAlreadyApplied(false);
    } catch (e: any) {
      console.log("checkApplied error:", e.message);
    }
  };

  // ✅ สมัครงาน
  const handleAcceptJob = async () => {
    if (isOwner) {
      Alert.alert("ไม่สามารถสมัครงานของตัวเองได้");
      return;
    }
    if (alreadyApplied) return;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("กรุณาเข้าสู่ระบบก่อน");
        return;
      }

      await axios.post(
        `${BASE_URL}/api/applications`,
        { job_id: Number(data.job_id) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("✅ สมัครงานสำเร็จ");
      setAlreadyApplied(true);
    } catch (e: any) {
      const msg = e.response?.data?.error || "เกิดข้อผิดพลาด";
      if (msg.includes("คุณสมัครงานนี้แล้ว")) {
        setAlreadyApplied(true);
        Alert.alert("⚠️ สมัครงานไม่สำเร็จ", "คุณสมัครงานนี้ไปแล้ว");
      } else if (msg.includes("ห้ามสมัครงานของตัวเอง")) {
        setIsOwner(true);
        Alert.alert("ไม่สามารถสมัครงานของตัวเองได้");
      } else {
        Alert.alert("❌ สมัครงานไม่สำเร็จ", msg);
      }
    }
  };

  const acceptDisabled = alreadyApplied || isOwner;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarBig}>
          <Ionicons name="person-outline" size={64} color="#C9C9E4" />
        </View>
        <Text style={styles.title}>{data.title}</Text>
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Ionicons name="location-outline" size={16} color="#fff" />
            <Text style={styles.chipText}>
              {data.location_text || "ไม่ระบุสถานที่"}
            </Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="card-outline" size={16} color="#fff" />
            <Text style={styles.chipText}>
              {data.pay_min} - {data.pay_max} บาท
            </Text>
          </View>
          {/* ✅ ชิป “ราคาค่าเฉลี่ย” พร้อมอิโมจิถุงเงิน */}
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              💰 ราคาค่าเฉลี่ย:{" "}
              {avg != null ? `${Number(avg).toFixed(2)} บาท` : "-"}
            </Text>
          </View>
        </View>
      </View>

      {/* Description */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <Text style={styles.sectionTitle}>Description</Text>
        <View style={styles.descBox}>
          <Text style={styles.descText}>{data.description}</Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={{ padding: 16, marginTop: 8 }}>
        <TouchableOpacity
          style={[styles.primaryBtn, acceptDisabled && styles.disabledBtn]}
          onPress={handleAcceptJob}
          disabled={acceptDisabled}
        >
          <Text style={styles.primaryBtnText}>
            {isOwner
              ? "เป็นเจ้าของงาน"
              : alreadyApplied
              ? "สมัครแล้ว"
              : "Accept Job"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 8 }}
        >
          <Text style={{ textAlign: "center", color: COLORS.sub }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarBig: {
    backgroundColor: "#F0F0FA",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Kanit_700Bold",
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    backgroundColor: COLORS.primaryDark,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 4,
    marginVertical: 4, // ให้ขึ้นบรรทัดใหม่ได้ถ้าช่องแคบ
    alignItems: "center",
  },
  chipText: { color: "#fff", fontSize: 12 },
  sectionTitle: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
    fontFamily: "Kanit_600SemiBold",
  },
  descBox: { backgroundColor: "#F8F8FF", borderRadius: 10, padding: 12 },
  descText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
  },
  disabledBtn: { backgroundColor: "#BDBDBD" },
  primaryBtnText: {
    color: "#fff",
    textAlign: "center",
    fontFamily: "Kanit_600SemiBold",
    fontSize: 16,
  },
});
