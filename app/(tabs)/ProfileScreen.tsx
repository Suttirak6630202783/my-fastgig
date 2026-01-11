// app/ProfileScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router"; // ✅ เพิ่ม

const BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://127.0.0.1:5000";

// ✅ fallback: คำนวณระดับจากคะแนน (ใช้เมื่อ API ยังไม่ส่ง trust_level)
function getTrustMeta(points: number) {
  if (points >= 100) return { label: "🌟 Expert", color: "#2E7D32" };
  if (points >= 50) return { label: "✅ Trusted", color: "#1E88E5" };
  if (points >= 10) return { label: "🙂 Basic", color: "#7E57C2" };
  if (points >= 0) return { label: "🆕 Newbie", color: "#6B4EFF" };
  return { label: "⚠️ Negative", color: "#E53935" };
}

// ✅ map สีจาก label ที่มาจาก DB
function getColorForLevel(level: string) {
  switch (level) {
    case "🌟 Expert":
      return "#2E7D32";
    case "✅ Trusted":
      return "#1E88E5";
    case "🙂 Basic":
      return "#7E57C2";
    case "🆕 Newbie":
      return "#6B4EFF";
    case "⚠️ Negative":
      return "#E53935";
    default:
      return "#6B4EFF";
  }
}

export default function ProfileScreen() {
  const router = useRouter(); // ✅ เพิ่ม

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // form states
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [skills, setSkills] = useState("");
  const [trustPoints, setTrustPoints] = useState("0");
  const [phone, setPhone] = useState("");

  // badge states
  const [trustLabel, setTrustLabel] = useState("🆕 Newbie");
  const [trustColor, setTrustColor] = useState("#6B4EFF");

  // completed jobs
  const [completedJobs, setCompletedJobs] = useState(0);

  // โหลดข้อมูลโปรไฟล์
  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(`${BASE_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfile(res.data);

      setUsername(res.data.full_name || "");
      setAge(res.data.age?.toString() || "");
      setEmail(res.data.email || "");
      setSkills(res.data.skills || "");
      const tp = Number(res.data.trust_points ?? 0);
      setTrustPoints(tp.toString());
      setPhone(res.data.phone || "");

      // ✅ ใช้ trust_level จาก DB ถ้ามี; ถ้าไม่มีใช้ fallback
      if (res.data.trust_level) {
        const levelFromDB = String(res.data.trust_level);
        setTrustLabel(levelFromDB);
        setTrustColor(getColorForLevel(levelFromDB));
      } else {
        const meta = getTrustMeta(tp);
        setTrustLabel(meta.label);
        setTrustColor(meta.color);
      }

      setCompletedJobs(Number(res.data.completed_jobs ?? 0));
    } catch (e: any) {
      console.log("Profile load error:", e.message);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // อัปโหลดรูป (Mobile)
  const uploadProfileMobile = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert("กรุณาเข้าสู่ระบบ");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("ต้องอนุญาตเข้าถึงรูปภาพก่อน");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    let localUri = result.assets[0].uri;
    let filename = localUri.split("/").pop()!;
    let formData = new FormData();

    formData.append("profile", {
      uri: localUri,
      name: filename,
      type: "image/jpeg",
    } as any);

    try {
      setLoading(true);
      const res = await axios.post(`${BASE_URL}/api/upload-profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setProfile((p: any) => ({ ...p, profile_image: res.data.profile_image }));
      await fetchProfile();
    } catch (err: any) {
      Alert.alert("❌ Upload error", err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // อัปโหลดรูป (Web)
  const uploadProfileWeb = async (file: File) => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    let formData = new FormData();
    formData.append("profile", file);

    try {
      setLoading(true);
      const res = await axios.post(`${BASE_URL}/api/upload-profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setProfile((p: any) => ({ ...p, profile_image: res.data.profile_image }));
      await fetchProfile();
    } catch (err: any) {
      alert("❌ Upload error: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // บันทึกโปรไฟล์
  const saveProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      await axios.put(
        `${BASE_URL}/api/me`,
        { full_name: username, age, skills, phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("✅ บันทึกแล้ว");
      setEditMode(false);
      await fetchProfile();
    } catch (err: any) {
      Alert.alert("❌ Update error", err.response?.data?.error || err.message);
    }
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#5D3FD3" />
      </SafeAreaView>
    );
  }

  const profileImageUri = profile.profile_image
    ? `${BASE_URL}${profile.profile_image}`
    : "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Image source={{ uri: profileImageUri }} style={styles.avatar} />

          {/* ปุ่มเปลี่ยนรูป */}
          {Platform.OS === "web" ? (
            <View style={{ alignItems: "center" }}>
              <input
                id="uploadWeb"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file =
                    (e.target as HTMLInputElement).files?.[0] ||
                    (e.target as any).files?.[0];
                  if (file) uploadProfileWeb(file);
                }}
                style={{ display: "none" }}
              />
              <TouchableOpacity
                style={styles.editPhotoBtn}
                onPress={() =>
                  (document.getElementById("uploadWeb") as any)?.click()
                }
              >
                <Text style={{ color: "#fff", fontSize: 12 }}>เปลี่ยนรูป</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editPhotoBtn}
              onPress={uploadProfileMobile}
            >
              <Text style={{ color: "#fff", fontSize: 12 }}>เปลี่ยนรูป</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.username}>{username}</Text>

          {/* ✅ Trust Badge */}
          <View
            style={[
              styles.badge,
              {
                backgroundColor: trustColor,
                borderColor: trustColor,
                borderWidth: 2,
              },
            ]}
          >
            <Text style={styles.badgeText}>{trustLabel}</Text>
            <Text style={styles.badgePoints}> • {trustPoints} pts</Text>
          </View>

          {/* ✅ จำนวนงานสำเร็จ */}
          <Text style={styles.completedText}>
            งานที่ทำสำเร็จแล้ว: {completedJobs} งาน
          </Text>

          {/* ✅ ปุ่มใหม่: ไปหน้า “สรุปผลงานผู้ใช้” */}
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => router.push("/performance")}
          >
            <Text style={styles.navBtnText}>📊 ดูผลงานฉัน</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={[styles.input, styles.readonly]}
            value={username}
            editable={false}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.readonly]}
            value={email}
            editable={false}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={[styles.input, !editMode && styles.readonly]}
            value={phone}
            onChangeText={setPhone}
            editable={editMode}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Age</Text>
          <TextInput
            style={[styles.input, !editMode && styles.readonly]}
            value={age}
            onChangeText={setAge}
            editable={editMode}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Skill</Text>
          <TextInput
            style={[styles.input, !editMode && styles.readonly]}
            value={skills}
            onChangeText={setSkills}
            editable={editMode}
          />

          <Text style={styles.label}>Trust Points</Text>
          <TextInput
            style={[styles.input, styles.readonly]}
            value={trustPoints}
            editable={false}
          />
        </View>

        {/* ปุ่มแก้ไข/บันทึก */}
        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            if (editMode) saveProfile();
            else setEditMode(true);
          }}
        >
          <Text style={styles.btnText}>
            {editMode ? "บันทึกโปรไฟล์" : "แก้ไขโปรไฟล์"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: "#6B4EFF",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: "center",
    paddingVertical: 30,
  },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
  editPhotoBtn: {
    backgroundColor: "#5D3FD3",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 6,
  },
  username: { fontSize: 22, fontWeight: "700", color: "#fff", marginTop: 6 },

  // ✅ Trust badge
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  badgeText: { color: "#fff", fontWeight: "700" },
  badgePoints: { color: "#fff", opacity: 0.9, fontWeight: "600" },

  completedText: { color: "#fff", marginTop: 6, fontWeight: "600" },

  // ✅ ปุ่มไปหน้า Performance
  navBtn: {
    marginTop: 10,
    backgroundColor: "#FFE082",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  navBtnText: { fontWeight: "800", color: "#5D3FD3" },

  form: { padding: 20 },
  label: { fontSize: 14, color: "#555", marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
    marginBottom: 10,
  },
  readonly: { backgroundColor: "#eee", color: "#777" },
  btn: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#5D3FD3",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
