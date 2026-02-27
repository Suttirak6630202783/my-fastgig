// app/job-detail.tsx
import BottomMenu from "@/components/BottomMenu"; // ✅ ดึงเมนูล่างมาใส่
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "./config";
import { COLORS } from "./theme";

export default function JobDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const job = params.job ? JSON.parse(params.job as string) : null;

  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (userId && job) {
        if (String(userId) === String(job.user_id)) setIsOwner(true);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleApply = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("แจ้งเตือน", "กรุณาเข้าสู่ระบบก่อนรับงาน", [
          { text: "Login", onPress: () => router.push("/") }, // แก้ path เป็น /login ถ้าแยกหน้า
          { text: "Cancel" },
        ]);
        return;
      }

      await axios.post(
        `${BASE_URL}/api/applications`,
        { job_id: job.job_id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      Alert.alert("สำเร็จ", "รับงานเรียบร้อยแล้ว!");
      setHasApplied(true);
    } catch (e: any) {
      const msg = e.response?.data?.error || "เกิดข้อผิดพลาด";
      if (msg.includes("สมัครงานนี้แล้ว")) {
        setHasApplied(true);
        Alert.alert("แจ้งเตือน", "คุณได้รับงานนี้ไปแล้วครับ");
      } else if (msg.includes("งานของตัวเอง")) {
        setIsOwner(true);
        Alert.alert("แจ้งเตือน", "ไม่สามารถรับงานตัวเองได้ครับ");
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!job) return null;

  // รูปโปรไฟล์คนจ้าง
  const profileUri = job.profile_image
    ? `${BASE_URL}${job.profile_image}`
    : "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  // คำนวณค่าเฉลี่ย (ถ้าไม่มีมาใน API)
  const avgPay = job.avg_pay
    ? Math.round(Number(job.avg_pay))
    : Math.round((Number(job.pay_min) + Number(job.pay_max)) / 2);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* --- ส่วน Header สีม่วงโค้ง --- */}
        <View style={styles.headerContainer}>
          <Text style={styles.pageTitle}>รายละเอียดงาน</Text>

          {/* รูปโปรไฟล์ตรงกลาง */}
          <View style={styles.profileWrapper}>
            <Image source={{ uri: profileUri }} style={styles.avatar} />
          </View>

          <Text style={styles.usernameText}>
            Username : {job.full_name || "ไม่ระบุชื่อ"}
          </Text>

          {/* ชื่องานตัวใหญ่ */}
          <Text style={styles.jobTitle}>{job.title}</Text>

          {/* Badge 3 อันเรียงกัน */}
          <View style={styles.badgesRow}>
            {/* สถานที่ */}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {job.location_text || "ไม่ระบุ"}
              </Text>
            </View>
            {/* ช่วงราคา */}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {job.pay_min} - {job.pay_max} บาท
              </Text>
            </View>
            {/* ราคาเฉลี่ย */}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>เฉลี่ย : {avgPay} บาท</Text>
            </View>
          </View>
        </View>

        {/* --- ส่วนเนื้อหา (Description) --- */}
        <View style={styles.contentContainer}>
          <Text style={styles.descHeader}>Description</Text>
          <View style={styles.descLine} />

          {/* กล่องข้อความ Description */}
          <View style={styles.descBox}>
            <Text style={styles.descText}>{job.description}</Text>
          </View>

          {/* ปุ่ม Action */}
          <View style={styles.actionArea}>
            {isOwner ? (
              <TouchableOpacity
                style={[styles.mainBtn, { backgroundColor: COLORS.accent }]}
              >
                <Text style={styles.mainBtnText}>แก้ไขงานของคุณ</Text>
              </TouchableOpacity>
            ) : hasApplied ? (
              <TouchableOpacity
                style={[styles.mainBtn, { backgroundColor: "#BDBDBD" }]}
                disabled
              >
                <Text style={styles.mainBtnText}>ส่งใบสมัครแล้ว</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.mainBtn}
                onPress={handleApply}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.mainBtnText}>รับงาน</Text>
                )}
              </TouchableOpacity>
            )}

            {/* ปุ่มย้อนกลับ */}
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => router.back()}
            >
              <Text style={styles.backLinkText}>ย้อนกลับ</Text>
              <View style={styles.underline} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Menu Bar ล่างสุด */}
      <BottomMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // พื้นหลังสีขาวอมเทานิดๆ
  },
  // --- Header Styles ---
  headerContainer: {
    backgroundColor: COLORS.primary, // สีม่วง
    paddingTop: 50,
    paddingBottom: 40,
    borderBottomLeftRadius: 40, // ความโค้งมนด้านล่าง
    borderBottomRightRadius: 40,
    alignItems: "center",
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  pageTitle: {
    fontSize: 20,
    color: COLORS.white,
    fontFamily: "Kanit_700Bold",
    marginBottom: 20,
  },
  profileWrapper: {
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  usernameText: {
    color: "#E0E0E0",
    fontSize: 14,
    fontFamily: "Kanit_400Regular",
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 22,
    color: COLORS.white,
    fontFamily: "Kanit_700Bold",
    textAlign: "center",
    marginBottom: 20,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: COLORS.primaryBtn, // สีม่วงอ่อนกว่าพื้นหลังนิดหน่อย (ตามรูป)
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: "Kanit_500Medium",
  },

  // --- Content Styles ---
  contentContainer: {
    padding: 24,
  },
  descHeader: {
    fontSize: 20,
    color: COLORS.primary, // สีม่วงเข้ม
    fontFamily: "Kanit_700Bold",
    marginBottom: 4,
  },
  descLine: {
    height: 2,
    backgroundColor: COLORS.line, // เส้นขีดจางๆ ใต้หัวข้อ
    width: 120,
    marginBottom: 20,
  },
  descBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    minHeight: 120, // ความสูงขั้นต่ำของกล่อง
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3, // เงาให้ดูลอย
    marginBottom: 30,
  },
  descText: {
    fontSize: 16,
    color: COLORS.sub,
    fontFamily: "Kanit_400Regular",
    lineHeight: 24,
  },

  // --- Buttons ---
  actionArea: {
    alignItems: "center",
  },
  mainBtn: {
    backgroundColor: COLORS.primary, // ปุ่มสีม่วง
    width: "80%",
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  mainBtnText: {
    color: COLORS.white,
    fontSize: 20,
    fontFamily: "Kanit_600SemiBold",
  },
  backLink: {
    alignItems: "center",
    padding: 5,
  },
  backLinkText: {
    color: COLORS.primary,
    fontSize: 18,
    fontFamily: "Kanit_700Bold",
  },
  underline: {
    height: 2,
    backgroundColor: COLORS.primary,
    width: "100%",
    marginTop: 2,
  },
});
