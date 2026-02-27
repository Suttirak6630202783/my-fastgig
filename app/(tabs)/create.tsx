// app/create.tsx
import BottomMenu from "@/components/BottomMenu"; // ✅ Import เมนูล่าง
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "./config";
import { COLORS } from "./theme";

export default function CreateJobsScreen() {
  const router = useRouter();
  const { edit, job } = useLocalSearchParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState("");
  const [payMin, setPayMin] = useState("");
  const [payMax, setPayMax] = useState("");
  const [locationText, setLocationText] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (edit && job) {
      const data = JSON.parse(job as string);
      setTitle(data.title);
      setDescription(data.description);
      setJobType(data.job_type || "");
      setPayMin(data.pay_min?.toString() || "");
      setPayMax(data.pay_max?.toString() || "");
      setLocationText(data.location_text || "");
      setAgeMin(data.age_min?.toString() || "");
      setAgeMax(data.age_max?.toString() || "");
    }
  }, [edit]);

  const handleCreate = async () => {
    if (!title || !description || !payMin)
      return alert("⚠️ กรุณากรอกข้อมูลให้ครบถ้วน");

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${BASE_URL}/api/jobs`,
        {
          title,
          description,
          job_type: jobType || "ทั่วไป",
          pay_min: payMin,
          pay_max: payMax || payMin,
          location_text: locationText,
          age_min: ageMin,
          age_max: ageMax,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("✅ สร้างงานสำเร็จแล้ว!");
      router.replace("/home");
    } catch (e: any) {
      alert(e.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const j = JSON.parse(job as string);
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.put(
        `${BASE_URL}/api/jobs/${j.job_id}`,
        {
          title,
          description,
          pay_min: payMin,
          pay_max: payMax,
          location_text: locationText,
          age_min: ageMin,
          age_max: ageMax,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("✅ แก้ไขงานสำเร็จ!");
      router.replace("/home");
    } catch (e: any) {
      alert(e.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* --- Header สีม่วงโค้งมน --- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {edit ? "แก้ไขงาน" : "สร้างงานใหม่"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* หัวข้อ */}
        <Text style={styles.label}>หัวข้อ :</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="ระบุหัวข้อ"
          placeholderTextColor="#999"
        />

        {/* รายละเอียด */}
        <Text style={styles.label}>รายละเอียด :</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="ระบุรายละเอียด"
          placeholderTextColor="#999"
          textAlignVertical="top"
        />

        {/* ประเภท */}
        <Text style={styles.label}>ประเภท :</Text>
        <TextInput
          style={styles.input}
          value={jobType}
          onChangeText={setJobType}
          placeholder="ระบุประเภทงาน"
          placeholderTextColor="#999"
        />

        {/* สถานที่ */}
        <Text style={styles.label}>สถานที่ :</Text>
        <TextInput
          style={styles.input}
          value={locationText}
          onChangeText={setLocationText}
          placeholder="ระบุสถานที่"
          placeholderTextColor="#999"
        />

        {/* อายุ (คู่ขนาน) */}
        <Text style={styles.label}>อายุ :</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="อายุต่ำสุด"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={ageMin}
            onChangeText={setAgeMin}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="อายุสูงสุด"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={ageMax}
            onChangeText={setAgeMax}
          />
        </View>

        {/* ค่าจ้าง (คู่ขนาน) */}
        <Text style={styles.label}>ค่าจ้าง :</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="ค่าจ้างขั้นต่ำ"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={payMin}
            onChangeText={setPayMin}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="ค่าจ้างสูงสุด"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={payMax}
            onChangeText={setPayMax}
          />
        </View>

        {/* ปุ่ม Submit */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={edit ? handleUpdate : handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>
              {edit ? "บันทึกการแก้ไข" : "โพสต์งาน"}
            </Text>
          )}
        </TouchableOpacity>

        {/* ปุ่มยกเลิก */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelBtnWrapper}
        >
          <Text style={styles.cancelBtnText}>ยกเลิก</Text>
          <View style={styles.underline} />
        </TouchableOpacity>
      </ScrollView>

      {/* เมนูล่าง */}
      <BottomMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // --- Header ---
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
    marginBottom: 10,
    width: "100%", // มั่นใจว่าเต็มจอ
  },
  headerTitle: {
    fontSize: 22,
    color: COLORS.white,
    fontFamily: "Kanit_700Bold",
  },

  // --- Form Content ---
  scrollContent: {
    paddingHorizontal: 20, // ลด Padding ลงนิดนึงให้มีที่หายใจ
    paddingTop: 10,
    paddingBottom: 100,
  },
  label: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: "Kanit_700Bold",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: COLORS.input,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Kanit_400Regular",
    color: "#333",
    marginBottom: 12,
    width: "100%", // ให้ยืดเต็ม Container ของมัน
  },
  textArea: {
    height: 120,
  },

  // ✅ แก้ไขส่วน Row ให้เสถียรขึ้น
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%", // บังคับให้แถวเต็มความกว้างจอ
    gap: 10,
  },
  halfInput: {
    flex: 1, // แบ่งพื้นที่กันคนละครึ่ง (คำนวณจากพื้นที่ที่เหลือ)
  },

  // --- Buttons ---
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    width: "100%",
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontFamily: "Kanit_700Bold",
  },
  cancelBtnWrapper: {
    alignItems: "center",
    marginTop: 16,
  },
  cancelBtnText: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: "Kanit_700Bold",
  },
  underline: {
    height: 2,
    backgroundColor: COLORS.primary,
    width: 60,
    marginTop: 2,
  },
});
