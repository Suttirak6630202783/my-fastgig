import { Platform } from "react-native";

export const BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";

export const AI_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5001" : "http://localhost:5001";
