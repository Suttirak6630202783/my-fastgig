// app/_layout.tsx
import {
  Kanit_400Regular,
  Kanit_500Medium,
  Kanit_600SemiBold,
  Kanit_700Bold,
  Kanit_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/kanit";
import { Stack } from "expo-router";
import { Text } from "react-native";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_600SemiBold,
    Kanit_700Bold,
    Kanit_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  // ✅ ใช้ type assertion เพื่อแก้ error TS2339
  const TextAny = Text as any;
  if (TextAny.defaultProps == null) TextAny.defaultProps = {};
  TextAny.defaultProps.style = { fontFamily: "Kanit_400Regular" };

  return <Stack screenOptions={{ headerShown: false }} />;
}
