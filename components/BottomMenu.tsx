// components/BottomMenu.tsx
import { COLORS } from "@/app/(tabs)/theme"; // ⚠️ เช็ค path ให้ตรงกับไฟล์ theme.ts ของคุณ
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function BottomMenu() {
  const router = useRouter();
  const pathname = usePathname(); // เช็คว่าอยู่หน้าไหน เพื่อเปลี่ยนสีปุ่ม

  const menus = [
    { id: "home", icon: "home", path: "/home", label: "หน้าหลัก" },
    { id: "profile", icon: "person", path: "/ProfileScreen", label: "โปรไฟล์" }, // เช็คชื่อไฟล์ ProfileScreen.tsx
    { id: "history", icon: "time", path: "/history", label: "ประวัติ" }, // สมมติว่ามี history.tsx
    {
      id: "notifications",
      icon: "notifications",
      path: "/notifications",
      label: "แจ้งเตือน",
    }, // สมมติว่ามี notifications.tsx
  ] as const;

  return (
    <View style={styles.container}>
      {menus.map((menu) => {
        const isActive = pathname === menu.path;

        return (
          <TouchableOpacity
            key={menu.id}
            style={[styles.menuItem, isActive && styles.activeItem]}
            onPress={() => router.push(menu.path as any)}
          >
            <Ionicons
              name={
                isActive ? (menu.icon as any) : (`${menu.icon}-outline` as any)
              }
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    height: 70,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // เงา
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,

    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  menuItem: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
  },
  activeItem: {
    backgroundColor: COLORS.primaryDark, // สีวงกลมพื้นหลังตอนเลือก (ม่วงเข้ม)
  },
});
