// components/job-Card.tsx
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BASE_URL } from "../app/(tabs)/config";
import { COLORS } from "../app/(tabs)/theme";

interface JobCardProps {
  item: any;
  mode: string;
  calcAvg: (min: any, max: any) => number | null;
}

export default function JobCard({ item, mode, calcAvg }: JobCardProps) {
  const router = useRouter();

  const avg =
    item?.avg_pay != null
      ? Number(item.avg_pay)
      : calcAvg(item.pay_min, item.pay_max);

  const profileUri = item.profile_image
    ? `${BASE_URL}${item.profile_image}`
    : "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  return (
    <View style={styles.cardContainer}>
      <View style={styles.contentRow}>
        <View style={styles.leftCol}>
          <Image source={{ uri: profileUri }} style={styles.avatarLarge} />
          <Text style={styles.ownerName} numberOfLines={1}>
            {item.full_name || "ไม่ระบุชื่อ"}
          </Text>
        </View>

        <View style={styles.rightCol}>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.jobDesc} numberOfLines={2}>
            {item.description}
          </Text>

          <Text style={styles.metaText}>
            อายุ : {item.age_min || "18"} - {item.age_max || "60"} ปี
          </Text>

          <Text style={styles.priceText}>
            {item.pay_min} - {item.pay_max} บาท
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.locationContainer}>
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location_text || "ไม่ระบุสถานที่"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            router.push({
              pathname: "/job-detail",
              params: { job: JSON.stringify(item) },
            })
          }
        >
          <Text style={styles.actionBtnText}>ดูรายละเอียด</Text>
        </TouchableOpacity>
      </View>

      {mode === "match" && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>งานแนะนำ</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contentRow: { flexDirection: "row", marginBottom: 12 },
  leftCol: { flex: 2, alignItems: "center", marginRight: 12 },
  avatarLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#F0F0F0",
    marginBottom: 6,
  },
  ownerName: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
    fontFamily: "Kanit_500Medium",
  },
  rightCol: { flex: 5, justifyContent: "center" },
  jobTitle: {
    fontSize: 18,
    color: COLORS.primary,
    marginBottom: 4,
    fontFamily: "Kanit_700Bold",
  },
  jobDesc: {
    fontSize: 13,
    color: COLORS.sub,
    marginBottom: 6,
    fontFamily: "Kanit_400Regular",
  },
  metaText: {
    fontSize: 13,
    color: "#333",
    marginBottom: 4,
    fontFamily: "Kanit_400Regular",
  },
  priceText: {
    fontSize: 20,
    color: COLORS.primaryDark,
    marginTop: 4,
    textAlign: "right",
    fontFamily: "Kanit_700Bold", // ✅ ราคาตัวใหญ่ใช้ Bold
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  locationContainer: { flex: 1, marginRight: 10 },
  locationText: {
    fontSize: 14,
    color: "#333",
    fontFamily: "Kanit_500Medium",
  },
  actionBtn: {
    backgroundColor: COLORS.primaryBtn,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: "Kanit_600SemiBold", // ✅ ปุ่มใช้ SemiBold
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: COLORS.badge,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    color: "#333",
    fontFamily: "Kanit_700Bold",
  },
});
