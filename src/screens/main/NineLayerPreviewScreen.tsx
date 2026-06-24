import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import { useNavigation } from "@react-navigation/native";
import { NineLayerParallax } from "../../components/NineLayerParallax";
import {
  NINE_LAYER_BIOMES,
  NineLayerBiome,
} from "../../config/nineLayerAssets";

const NineLayerPreviewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(7);
  const [speed, setSpeed] = useState(1);
  const [frozen, setFrozen] = useState(false);

  const biome: NineLayerBiome = NINE_LAYER_BIOMES[index];
  const cycle = (dir: number) =>
    setIndex(
      (i) => (i + dir + NINE_LAYER_BIOMES.length) % NINE_LAYER_BIOMES.length,
    );

  return (
    <View style={styles.root}>
      <NineLayerParallax biome={biome} speed={speed} reduceMotion={frozen} />

      <View style={styles.overlay} pointerEvents="box-none">
        {/* Top bar — explicit safe area so it clears the Dynamic Island */}
        <View
          style={[styles.topBar, { paddingTop: insets.top + 8 }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.pill}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.pillText}>✕ Close</Text>
          </TouchableOpacity>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {biome.toUpperCase()} ({index + 1}/{NINE_LAYER_BIOMES.length})
            </Text>
          </View>
        </View>

        {/* Bottom controls */}
        <View style={[styles.controls, { marginBottom: insets.bottom + 16 }]}>
          <View style={styles.biomeRow}>
            <TouchableOpacity style={styles.navBtn} onPress={() => cycle(-1)}>
              <Text style={styles.navBtnText}>‹ Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setFrozen((f) => !f)}
            >
              <Text style={styles.navBtnText}>
                {frozen ? "▶ Play" : "⏸ Freeze"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => cycle(1)}>
              <Text style={styles.navBtnText}>Next ›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.speedLabel}>Speed: {speed.toFixed(2)}×</Text>
          <Slider
            style={{ width: "100%", height: 36 }}
            minimumValue={0.2}
            maximumValue={3}
            step={0.05}
            value={speed}
            onValueChange={setSpeed}
            minimumTrackTintColor="#7CC4FF"
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor="#FFFFFF"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1, justifyContent: "space-between" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  pill: {
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  controls: {
    margin: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  biomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  navBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  speedLabel: { color: "#fff", fontWeight: "600", marginBottom: 2 },
});

export default NineLayerPreviewScreen;
