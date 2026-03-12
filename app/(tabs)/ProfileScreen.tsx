// app/ProfileScreen.tsx
import BottomMenu from "@/components/BottomMenu";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router"; // ✅ เพิ่ม useFocusEffect
import React, { useCallback, useState } from "react"; // ✅ เพิ่ม useCallback
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
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

// ✅ Helper Function: Popup รองรับ Web/Mobile
const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ตกลง", onPress: onConfirm },
    ]);
  }
};

function getTrustMeta(points: number) {
  if (points >= 100) return { label: "🌟 Expert", color: "#2E7D32" };
  if (points >= 50) return { label: "✅ Trusted", color: "#1E88E5" };
  if (points >= 10) return { label: "🙂 Basic", color: "#7E57C2" };
  if (points >= 0) return { label: "🆕 Newbie", color: "#6B4EFF" };
  return { label: "⚠️ Negative", color: "#E53935" };
}

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
  const router = useRouter();

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
  const [trustLabel, setTrustLabel] = useState("🆕 Newbie");
  const [trustColor, setTrustColor] = useState("#6B4EFF");
  const [completedJobs, setCompletedJobs] = useState(0);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        // ถ้าไม่มี token ให้เคลียร์ข้อมูล (กันแสดงของคนเก่า)
        setProfile(null);
        return;
      }

      const res = await axios.get(`${BASE_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data;
      setProfile(data);

      setUsername(data.full_name || "");
      setAge(data.age?.toString() || "");
      setEmail(data.email || "");
      setSkills(data.skills || "");
      const tp = Number(data.trust_points ?? 0);
      setTrustPoints(tp.toString());
      setPhone(data.phone || "");
      setCompletedJobs(Number(data.completed_jobs ?? 0));

      if (data.trust_level) {
        const levelFromDB = String(data.trust_level);
        setTrustLabel(levelFromDB);
        setTrustColor(getColorForLevel(levelFromDB));
      } else {
        const meta = getTrustMeta(tp);
        setTrustLabel(meta.label);
        setTrustColor(meta.color);
      }
    } catch (e: any) {
      console.log("Profile load error:", e.message);
      // ถ้า Error 401/403 (Token หมดอายุ) ให้เด้งออก
      if (
        e.response &&
        (e.response.status === 401 || e.response.status === 403)
      ) {
        await AsyncStorage.multiRemove(["token", "user_id"]);
        router.replace("/login");
      }
    }
  };

  // ✅ ใช้ useFocusEffect แทน useEffect
  // โค้ดนี้จะทำงาน "ทุกครั้ง" ที่หน้าจอนี้ถูกเปิดดู (Focus)
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, []),
  );

  const executeUpload = async (formData: FormData, token: string) => {
    try {
      setLoading(true);
      const res = await axios.post(`${BASE_URL}/api/upload-profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setProfile((p: any) => ({ ...p, profile_image: res.data.profile_image }));

      if (Platform.OS === "web") {
        alert("เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้วครับ ✅");
      } else {
        Alert.alert("สำเร็จ", "เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้วครับ ✅");
      }
    } catch (err: any) {
      console.error("Upload Error:", err);
      alert(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadProfileMobile = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return alert("กรุณาเข้าสู่ระบบ");

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return alert("ต้องอนุญาตเข้าถึงรูปภาพก่อน");

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    showConfirm(
      "ยืนยันรูปโปรไฟล์",
      "คุณต้องการใช้รูปนี้ใช่หรือไม่?",
      async () => {
        try {
          const asset = result.assets[0];
          let localUri = asset.uri;
          let filename = localUri.split("/").pop() || "profile.jpg";
          let match = /\.(\w+)$/.exec(filename);
          let type = match ? `image/${match[1]}` : `image/jpeg`;

          let formData = new FormData();

          if (Platform.OS === "web") {
            const response = await fetch(localUri);
            const blob = await response.blob();
            formData.append("profile", blob, filename);
          } else {
            // @ts-ignore
            formData.append("profile", {
              uri: localUri,
              name: filename,
              type: type,
            });
          }

          await executeUpload(formData, token);
        } catch (e) {
          console.error("Image Prep Error:", e);
          alert("เกิดข้อผิดพลาดในการเตรียมไฟล์รูป");
        }
      },
    );
  };

  const saveProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      await axios.put(
        `${BASE_URL}/api/me`,
        { full_name: username, age, skills, phone },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (Platform.OS === "web") {
        alert("✅ บันทึกข้อมูลเรียบร้อยแล้ว");
      } else {
        Alert.alert("✅ สำเร็จ", "บันทึกข้อมูลเรียบร้อยแล้ว");
      }

      setEditMode(false);
      fetchProfile(); // โหลดใหม่หลังบันทึก
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleLogout = async () => {
    showConfirm("ออกจากระบบ", "คุณต้องการออกจากระบบใช่หรือไม่?", async () => {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user_id");
      router.replace("/login");
    });
  };

  const handleMainButton = () => {
    if (editMode) {
      showConfirm(
        "ยืนยันการบันทึก",
        "คุณต้องการบันทึกการเปลี่ยนแปลงใช่หรือไม่?",
        saveProfile,
      );
    } else {
      setEditMode(true);
    }
  };

  if (!profile && !loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const profileImageUri = profile?.profile_image
    ? `${BASE_URL}${profile.profile_image}`
    : "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <View style={styles.avatarContainer}>
            <Image source={{ uri: profileImageUri }} style={styles.avatar} />
          </View>

          <TouchableOpacity
            style={styles.changePhotoBtn}
            onPress={uploadProfileMobile}
          >
            <Text style={styles.changePhotoText}>เปลี่ยนรูป</Text>
          </TouchableOpacity>

          <Text style={styles.headerName}>{username || "No Name"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: "#483085" }]}>
            <Text style={styles.statusText}>
              {trustLabel} : {trustPoints} pts
            </Text>
          </View>
          <Text style={styles.jobCountText}>
            งานที่สำเร็จแล้ว : {completedJobs} งาน
          </Text>

          <TouchableOpacity
            style={styles.myWorksBtn}
            onPress={() => router.push("/performance")}
          >
            <Text style={styles.myWorksText}>ผลงานของฉัน</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Username :</Text>
          <TextInput
            style={[
              styles.input,
              editMode ? styles.editingInput : styles.readonlyInput,
            ]}
            value={username}
            onChangeText={setUsername}
            editable={editMode}
          />

          <Text style={styles.label}>Email :</Text>
          <TextInput
            style={[styles.input, styles.readonlyInput]}
            value={email}
            editable={false}
          />

          <Text style={styles.label}>Skill :</Text>
          <TextInput
            style={[
              styles.input,
              editMode ? styles.editingInput : styles.readonlyInput,
            ]}
            value={skills}
            onChangeText={setSkills}
            editable={editMode}
            placeholder="ระบุทักษะ"
          />

          <Text style={styles.label}>Trust Points :</Text>
          <TextInput
            style={[styles.input, styles.readonlyInput]}
            value={trustPoints}
            editable={false}
          />

          <Text style={styles.label}>Age :</Text>
          <TextInput
            style={[
              styles.input,
              editMode ? styles.editingInput : styles.readonlyInput,
            ]}
            value={age}
            onChangeText={setAge}
            editable={editMode}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Phone :</Text>
          <TextInput
            style={[
              styles.input,
              editMode ? styles.editingInput : styles.readonlyInput,
            ]}
            value={phone}
            onChangeText={setPhone}
            editable={editMode}
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={[
              styles.actionBtn,
              editMode ? { backgroundColor: "#4CAF50" } : {},
            ]}
            onPress={handleMainButton}
          >
            <Text style={styles.actionBtnText}>
              {editMode ? "💾 ยืนยันการบันทึก" : "✏️ แก้ไขโปรไฟล์"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: 100 },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    elevation: 8,
    zIndex: 1,
  },
  logoutBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "#E53935",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
    elevation: 5,
  },
  logoutText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  avatarContainer: {
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 60,
    padding: 3,
  },
  avatar: { width: 110, height: 110, borderRadius: 55 },
  changePhotoBtn: {
    backgroundColor: "#9575CD",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  changePhotoText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Kanit_500Medium",
  },
  headerName: {
    fontSize: 24,
    color: "#fff",
    fontFamily: "Kanit_700Bold",
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusText: { color: "#fff", fontSize: 13, fontFamily: "Kanit_500Medium" },
  jobCountText: {
    color: "#E0E0E0",
    fontSize: 13,
    fontFamily: "Kanit_400Regular",
    marginBottom: 16,
  },
  myWorksBtn: {
    backgroundColor: "#FFE082",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  myWorksText: { color: "#5D4037", fontSize: 14, fontFamily: "Kanit_700Bold" },
  formContainer: { padding: 24 },
  label: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: "Kanit_700Bold",
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Kanit_400Regular",
    marginBottom: 10,
  },
  readonlyInput: {
    backgroundColor: "#EFEFEF",
    color: "#555",
    borderWidth: 0,
  },
  editingInput: {
    backgroundColor: "#FFFFFF",
    color: "#000",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  actionBtn: {
    backgroundColor: "#8E72D0",
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#8E72D0",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Kanit_700Bold",
  },
});
