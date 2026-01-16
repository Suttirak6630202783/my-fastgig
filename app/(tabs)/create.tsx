import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "./theme";
import { BASE_URL, AI_URL } from "./config";

export default function CreateJobsScreen() {
  const router = useRouter();
  const { edit, job } = useLocalSearchParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState(""); // ✅ NEW: job_type state
  const [payMin, setPayMin] = useState("");
  const [payMax, setPayMax] = useState("");
  const [locationText, setLocationText] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");

  useEffect(() => {
    if (edit && job) {
      const data = JSON.parse(job as string);
      setTitle(data.title);
      setDescription(data.description);
      setJobType(data.job_type || ""); // ✅ prefill ถ้ามี
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

    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${BASE_URL}/api/jobs`,
        {
          title,
          description,
          job_type: jobType || "ทั่วไป", // ✅ ส่ง job_type เข้า DB
          pay_min: payMin,
          pay_max: payMax || payMin,
          location_text: locationText,
          age_min: ageMin,
          age_max: ageMax,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ สร้างงานสำเร็จแล้ว!");
      router.replace("/home");
    } catch (e: any) {
      alert(e.response?.data?.error || "เกิดข้อผิดพลาด");
    }
  };

  // ไม่แตะส่วน update ตามคำขอ (แก้เฉพาะตอน create ให้เพิ่ม job_type)
  const handleUpdate = async () => {
    const j = JSON.parse(job as string);
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
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ แก้ไขงานสำเร็จ!");
      router.replace("/home");
    } catch (e: any) {
      alert(e.response?.data?.error || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{edit ? "แก้ไขงาน" : "สร้างงานใหม่"}</Text>

        {/* หัวข้อ */}
        <Text style={styles.label}>หัวข้อ :</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="เช่น รับจ้างย้ายของ, ทำความสะอาด"
        />

        {/* รายละเอียด */}
        <Text style={styles.label}>รายละเอียด :</Text>
        <TextInput
          style={[styles.input, { height: 100 }]}
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="รายละเอียดของงาน"
        />

        {/* ✅ ประเภทงาน (Job type) */}
        <Text style={styles.label}>ประเภทงาน (Job type) :</Text>
        <TextInput
          style={styles.input}
          value={jobType}
          onChangeText={setJobType}
          placeholder='เช่น "ทั่วไป", "พาร์ทไทม์", "ส่งของ", "แม่บ้าน"'
        />

        {/* สถานที่ */}
        <Text style={styles.label}>📍 สถานที่ :</Text>
        <TextInput
          style={styles.input}
          value={locationText}
          onChangeText={setLocationText}
          placeholder="เช่น ศรีราชา, ชลบุรี, บ้านเลขที่ 22/3"
        />

        {/* อายุที่ต้องการ */}
        <Text style={styles.label}>อายุที่ต้องการ :</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="อายุต่ำสุด (เช่น 18)"
            keyboardType="numeric"
            value={ageMin}
            onChangeText={setAgeMin}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="อายุสูงสุด (เช่น 35)"
            keyboardType="numeric"
            value={ageMax}
            onChangeText={setAgeMax}
          />
        </View>

        {/* ค่าจ้าง */}
        <Text style={styles.label}>💰 ค่าจ้าง :</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="ขั้นต่ำ"
            keyboardType="numeric"
            value={payMin}
            onChangeText={setPayMin}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="สูงสุด"
            keyboardType="numeric"
            value={payMax}
            onChangeText={setPayMax}
          />
        </View>

        {/* ปุ่มหลัก */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={edit ? handleUpdate : handleCreate}
        >
          <Text style={styles.primaryBtnText}>
            {edit ? "บันทึกการแก้ไข" : "โพสต์งาน"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 12 }}
        >
          <Text style={styles.cancel}>ยกเลิก</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  container: { padding: 20 },
  title: {
    fontSize: 22,
    color: COLORS.primary,
    marginBottom: 16,
    fontFamily: "Kanit_700Bold",
  },
  label: {
    fontFamily: "Kanit_600SemiBold",
    marginTop: 12,
    marginBottom: 4,
    color: COLORS.text,
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  primaryBtnText: {
    color: "#fff",
    textAlign: "center",
    fontFamily: "Kanit_600SemiBold",
  },
  cancel: { textAlign: "center", color: COLORS.sub, marginTop: 8 },
});
