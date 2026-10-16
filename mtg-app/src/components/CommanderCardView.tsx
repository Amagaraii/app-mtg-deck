import { useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { CommanderCard } from "@/src/types/commander";
import { openEdhrec } from "@/src/utils/edhrec";

export default function CommanderCardView({
  card,
  width = 240,
  actionLabel,
  active = false,
  onAction,
}: {
  card: CommanderCard;
  width?: number;
  actionLabel?: string;
  active?: boolean;
  onAction?: () => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const isDoubleFaced = card.card_faces?.length === 2;

  const flipCard = () => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => setIsFlipped(!isFlipped));
  };

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={() => openEdhrec(card)}>
        <View style={{ width, height: (width * 340) / 240 }}>
          <Animated.View
            style={[styles.cardFace, { transform: [{ rotateY: frontRotate }] }]}
          >
            <Image
              source={{
                uri:
                  card.image_uris?.normal ??
                  card.card_faces?.[0]?.image_uris?.normal,
              }}
              style={styles.image}
            />
          </Animated.View>

          {isDoubleFaced && (
            <Animated.View
              style={[styles.cardFace, { transform: [{ rotateY: backRotate }] }]}
            >
              <Image
                source={{ uri: card.card_faces?.[1]?.image_uris?.normal }}
                style={styles.image}
              />
            </Animated.View>
          )}
        </View>
      </Pressable>

      {isDoubleFaced && (
        <Pressable style={styles.flipButton} onPress={flipCard}>
          <Text style={styles.flipText}>↺</Text>
        </Pressable>
      )}

      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={[styles.actionButton, active && styles.actionActive]}
        >
          <Text style={[styles.actionText, active && styles.actionTextActive]}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  cardFace: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
  },
  image: { width: "100%", height: "100%", resizeMode: "contain", borderRadius: 16 },
  flipButton: {
    marginTop: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  flipText: { color: "#fff", fontSize: 18 },
  actionButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#111",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  actionActive: { backgroundColor: "#111" },
  actionText: { fontSize: 13, fontWeight: "700", color: "#111" },
  actionTextActive: { color: "#fff" },
});