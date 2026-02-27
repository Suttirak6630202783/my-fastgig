// app/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { COLORS } from "./theme";

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      // รอสักนิดให้ดูเหมือนโหลด (Optional)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const token = await AsyncStorage.getItem("token");
      if (token) {
        // ถ้ามี token ให้ไปหน้า Home เลย
        router.replace("/home");
      } else {
        // ถ้าไม่มี token ให้ไปหน้า Login
        router.replace("/login");
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      {/* ใส่ Logo หรือรูป Loading ตรงนี้ได้ */}
      <ActivityIndicator size="large" color={COLORS.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary, // ใช้สีธีมหลัก
    justifyContent: "center",
    alignItems: "center",
  },
});
