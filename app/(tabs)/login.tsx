// app/login.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "./config";
import { COLORS } from "./theme";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return alert("กรอก Email/Password");
    setLoading(true);
    try {
      await AsyncStorage.multiRemove(["token", "user_id"]);

      const res = await axios.post(`${BASE_URL}/api/login`, {
        email,
        password,
      });

      await AsyncStorage.setItem("token", res.data.token);
      await AsyncStorage.setItem("user_id", String(res.data.user_id));

      console.log("✅ Login success:", res.data.user_id);
      router.replace("/home");
    } catch (e: any) {
      alert(e.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.logo}>
          FAST<Text style={{ color: COLORS.accent }}>GIG</Text>
        </Text>
        <Text style={styles.caption}>Welcome to FASTGIG</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Your Email"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Your Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/register")}
          style={{ marginTop: 14 }}
        >
          <Text style={styles.link}>
            Don’t have an account?{" "}
            <Text style={{ color: COLORS.accent }}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    padding: 20,
  },
  card: {},
  logo: {
    fontSize: 32,
    color: COLORS.white,
    textAlign: "center",
    fontFamily: "Kanit_800ExtraBold",
  },
  caption: { textAlign: "center", color: "#EAEAF4", marginBottom: 24 },
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
    color: "#fff",
    textAlign: "center",
    fontFamily: "Kanit_600SemiBold",
    fontSize: 16,
  },
  link: {
    color: COLORS.white,
    textAlign: "right",
    fontFamily: "Kanit_400Regular",
  },
});
