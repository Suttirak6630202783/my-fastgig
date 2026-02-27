// app/register.tsx
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "./config";
import { COLORS } from "./theme";

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [skills, setSkills] = useState(""); // NEW
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !fullName ||
      !email ||
      !password ||
      !confirmPassword ||
      !phone ||
      !age ||
      !skills
    ) {
      return alert("กรอกข้อมูลให้ครบถ้วน");
    }
    if (password !== confirmPassword) return alert("รหัสผ่านไม่ตรงกัน");

    // ทำความสะอาดสกิลเบื้องต้น
    const skillsClean = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) // ตัดค่าว่าง
      .join(","); // เก็บเป็นสตริงคอมมาเดียว (ง่าย/เร็ว)

    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/register`, {
        full_name: fullName,
        email,
        password,
        confirmPassword,
        phone,
        age,
        skills: skillsClean, // NEW
      });
      router.replace("/");
    } catch (e: any) {
      alert(e.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>
          FAST<Text style={{ color: COLORS.accent }}>GIG</Text>
        </Text>
        <Text style={styles.caption}>Welcome to FASTGIG</Text>

        {[
          {
            label: "Username",
            ph: "Create Your Username",
            v: fullName,
            set: setFullName,
          },
          {
            label: "Email",
            ph: "Create Your Email",
            v: email,
            set: setEmail,
            autoCap: "none" as const,
          },
          {
            label: "Password",
            ph: "Enter Your Password",
            v: password,
            set: setPassword,
            secure: true,
          },
          {
            label: "Confirm Password",
            ph: "Confirm Your Password",
            v: confirmPassword,
            set: setConfirmPassword,
            secure: true,
          },
          {
            label: "Phone",
            ph: "Enter Your Phone Number",
            v: phone,
            set: setPhone,
            kb: "phone-pad" as const,
          },
          {
            label: "Age",
            ph: "Enter Your Age",
            v: age,
            set: setAge,
            kb: "numeric" as const,
          },
          // NEW FIELD
          {
            label: "Skills (comma-separated)",
            ph: "Enter Your Skills",
            v: skills,
            set: setSkills,
            autoCap: "none" as const,
          },
        ].map((f) => (
          <View key={f.label}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              placeholder={f.ph}
              value={f.v}
              onChangeText={f.set}
              secureTextEntry={!!f.secure}
              keyboardType={f.kb}
              autoCapitalize={f.autoCap ?? "sentences"}
              autoCorrect={false}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/login")}
          style={{ marginTop: 14 }}
        >
          <Text style={styles.link}>
            Do You Have Account?{" "}
            <Text style={{ color: COLORS.accent }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primary },
  container: { flexGrow: 1, justifyContent: "center", padding: 20 },
  logo: {
    fontSize: 32,
    color: COLORS.white,
    textAlign: "center",
    fontFamily: "Kanit_800ExtraBold",
  },
  caption: { textAlign: "center", color: "#EAEAF4", marginBottom: 22 },
  label: {
    color: COLORS.white,
    marginBottom: 6,
    fontFamily: "Kanit_600SemiBold",
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontFamily: "Kanit_300Light",
  },
  primaryBtn: {
    backgroundColor: COLORS.primaryBtn,
    padding: 14,
    borderRadius: 10,
    marginTop: 6,
  },
  primaryBtnText: {
    color: COLORS.white,
    textAlign: "center",
    fontFamily: "Kanit_600SemiBold",
    fontSize: 16,
  },
  link: {
    color: COLORS.white,
    textAlign: "center",
    fontFamily: "Kanit_400Regular",
  },
});
