// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // ปิด Header ด้านบน (เราทำเองแล้วใน Home)
        tabBarStyle: {
          display: "none", // ❌ ซ่อนแถบเมนู Native ทิ้งไปเลย (เพราะเรามี BottomMenu แล้ว)
        },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="create" />
      {/* ใส่ชื่อไฟล์อื่นๆ ที่อยู่ใน (tabs) ให้ครบ */}
    </Tabs>
  );
}
