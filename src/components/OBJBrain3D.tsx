/**
 * 3D brain viewer with per-vertex region highlighting.
 *
 * The brain model is a single mesh, so regions cannot be highlighted by swapping
 * per-mesh materials. Instead every vertex is tinted by its proximity to each
 * active region (Gaussian falloff), producing soft glowing hotspots that blend
 * where regions overlap. Selection glow is driven by a shader uniform so the
 * pulse costs nothing on the JS thread.
 *
 * Model space note: the OBJ is already normalized to roughly ±1 and centered on
 * the origin, so vertex coordinates and Brain3DRegion.position share one space.
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  PanResponder,
} from "react-native";
import { GLView, ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";
import { Asset } from "expo-asset";
// NOTE: OBJLoader is dynamically imported inside loadBrainGeometry to avoid the
// "Invalid URL:" error that occurs when Three.js loaders are imported at module
// load time in React Native. The dynamic import ensures the URL polyfill is
// fully active before the loader is loaded.
import { Brain3DRegion } from "../utils/brain3DData";

const { width } = Dimensions.get("window");
const CANVAS_SIZE = Math.min(width - 40, 400);

const BACKGROUND_COLOR = 0x0f172a;
const BACKGROUND_HEX = "#0f172a";

// Colours are blended in perceptual (sRGB) space and only converted to linear
// on the way into the vertex buffer, because the shader gamma-encodes its
// output. Mixing in linear instead lets the resting grey wash the saturated
// region hues out, which makes the highlights look weak.
function hexToSrgb(hex: string): [number, number, number] {
  const color = new THREE.Color();
  // LinearSRGBColorSpace == three's working space, so this skips the automatic
  // sRGB->linear conversion and hands back the raw authored channel values.
  color.setHex(parseInt(hex.replace("#", ""), 16), THREE.LinearSRGBColorSpace);
  return [color.r, color.g, color.b];
}

function srgbToLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

// Neutral colour of an unstimulated brain — lit regions read against this.
const RESTING_SRGB = hexToSrgb("#6b7280");

// Gaussian spread of a region's influence, in model units (model spans ±1).
const HOTSPOT_SIGMA = 0.28;
const TWO_SIGMA_SQ = 2 * HOTSPOT_SIGMA * HOTSPOT_SIGMA;
// Below this weight a vertex is considered outside the region entirely.
const MIN_WEIGHT = 0.01;

const TAP_MAX_DISTANCE = 10; // px of travel still counted as a tap
const TAP_MAX_DURATION = 300; // ms

interface OBJBrain3DProps {
  regions: Brain3DRegion[];
  /** Region ids to highlight (e.g. every region in the selected group). */
  selectedRegionIds?: string[];
  onRegionPress?: (region: Brain3DRegion) => void;
  autoRotate?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

// ---------------------------------------------------------------------------
// Model loading (cached across mounts — the OBJ is 5.5MB and parsing is slow)
// ---------------------------------------------------------------------------

interface BrainGeometryData {
  positions: Float32Array;
  normals: Float32Array;
}

let cachedGeometry: BrainGeometryData | null = null;
let pendingLoad: Promise<BrainGeometryData> | null = null;

async function loadBrainGeometry(): Promise<BrainGeometryData> {
  if (cachedGeometry) return cachedGeometry;
  if (pendingLoad) return pendingLoad;

  pendingLoad = (async () => {
    const asset = Asset.fromModule(
      require("../assets/models/Brain_Diagram_with_La_1027134643_texture_obj/Brain_Diagram_with_La_1027134643_texture.obj"),
    );
    await asset.downloadAsync();

    const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader");
    const loader = new OBJLoader();

    const group = await new Promise<THREE.Group>((resolve, reject) => {
      loader.load(asset.localUri || asset.uri, resolve, undefined, (err) =>
        reject(err),
      );
    });

    let geometry: THREE.BufferGeometry | null = null;
    group.traverse((child) => {
      if (!geometry && child instanceof THREE.Mesh) {
        geometry = child.geometry;
      }
    });
    if (geometry === null) throw new Error("Brain model contains no mesh");

    const meshGeometry: THREE.BufferGeometry = geometry;
    if (!meshGeometry.attributes.normal) meshGeometry.computeVertexNormals();

    const data: BrainGeometryData = {
      positions: Float32Array.from(meshGeometry.attributes.position.array),
      normals: Float32Array.from(meshGeometry.attributes.normal.array),
    };
    meshGeometry.dispose();

    cachedGeometry = data;
    pendingLoad = null;
    return data;
  })();

  try {
    return await pendingLoad;
  } catch (err) {
    pendingLoad = null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Vertex colouring
// ---------------------------------------------------------------------------

/**
 * Tint each vertex by its proximity to every active region. Colours depend only
 * on study activity, so this is recomputed only when the study data changes —
 * never on a mere tap.
 */
function computeVertexColors(
  positions: Float32Array,
  regions: Brain3DRegion[],
  out: Float32Array,
): void {
  const vertexCount = positions.length / 3;

  // Pre-resolve colours so we don't allocate per vertex.
  const active = regions
    .filter((r) => r.activity > 0)
    .map((r) => {
      const [cr, cg, cb] = hexToSrgb(r.color);
      return {
        x: r.position.x,
        y: r.position.y,
        z: r.position.z,
        activity: r.activity,
        cr,
        cg,
        cb,
      };
    });

  const [restR, restG, restB] = RESTING_SRGB;
  const restLinear = [
    srgbToLinear(restR),
    srgbToLinear(restG),
    srgbToLinear(restB),
  ];

  for (let i = 0; i < vertexCount; i++) {
    const vx = positions[i * 3];
    const vy = positions[i * 3 + 1];
    const vz = positions[i * 3 + 2];

    // Weighted blend of every region that reaches this vertex.
    let totalWeight = 0;
    let r = 0;
    let g = 0;
    let b = 0;

    for (const region of active) {
      const dx = vx - region.x;
      const dy = vy - region.y;
      const dz = vz - region.z;
      const falloff = Math.exp(-(dx * dx + dy * dy + dz * dz) / TWO_SIGMA_SQ);
      if (falloff < MIN_WEIGHT) continue;

      const weight = falloff * region.activity;
      totalWeight += weight;
      r += region.cr * weight;
      g += region.cg * weight;
      b += region.cb * weight;
    }

    if (totalWeight > 0) {
      // Hue = weighted average of contributing regions; intensity = how lit.
      const intensity = Math.min(1, totalWeight);
      out[i * 3] = srgbToLinear(restR + (r / totalWeight - restR) * intensity);
      out[i * 3 + 1] = srgbToLinear(
        restG + (g / totalWeight - restG) * intensity,
      );
      out[i * 3 + 2] = srgbToLinear(
        restB + (b / totalWeight - restB) * intensity,
      );
    } else {
      out[i * 3] = restLinear[0];
      out[i * 3 + 1] = restLinear[1];
      out[i * 3 + 2] = restLinear[2];
    }
  }
}

/**
 * Record how strongly each vertex belongs to the selected regions. Independent
 * of activity: selecting a region you have never studied still shows where it is.
 */
function computeSelectionWeights(
  positions: Float32Array,
  regions: Brain3DRegion[],
  selectedIds: string[],
  out: Float32Array,
): void {
  const vertexCount = positions.length / 3;
  const selectedSet = new Set(selectedIds);
  const selected = regions.filter((r) => selectedSet.has(r.id));

  if (selected.length === 0) {
    out.fill(0);
    return;
  }

  for (let i = 0; i < vertexCount; i++) {
    const vx = positions[i * 3];
    const vy = positions[i * 3 + 1];
    const vz = positions[i * 3 + 2];

    let weight = 0;
    for (const region of selected) {
      const dx = vx - region.position.x;
      const dy = vy - region.position.y;
      const dz = vz - region.position.z;
      const falloff = Math.exp(-(dx * dx + dy * dy + dz * dz) / TWO_SIGMA_SQ);
      if (falloff > weight) weight = falloff;
    }
    out[i] = weight;
  }
}

// ---------------------------------------------------------------------------
// Shader: vertex colours + simple diffuse lighting + pulsing selection glow
// ---------------------------------------------------------------------------

const VERTEX_SHADER = `
  attribute float aSelection;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying float vSelection;

  void main() {
    vColor = color;
    vSelection = aSelection;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform float uPulse;
  uniform vec3 uLightDir;

  varying vec3 vColor;
  varying vec3 vNormal;
  varying float vSelection;

  void main() {
    vec3 normal = normalize(vNormal);
    float diffuse = max(dot(normal, normalize(uLightDir)), 0.0);
    // Wrapped lighting keeps unlit faces readable rather than black.
    vec3 base = vColor * (0.45 + 0.55 * diffuse);

    // Rim light gives the surface some depth against the dark background.
    float rim = pow(1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);
    base += vColor * rim * 0.25;

    // Selection glow pulses over the selected region.
    vec3 glow = vColor * vSelection * uPulse * 0.9;

    // three's ColorManagement linearises every THREE.Color we feed in, but a
    // custom ShaderMaterial receives no automatic output transform — so encode
    // back to sRGB here or the whole brain renders noticeably dark.
    vec3 encoded = pow(base + glow, vec3(1.0 / 2.2));

    gl_FragColor = vec4(encoded, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const OBJBrain3D: React.FC<OBJBrain3DProps> = ({
  regions,
  selectedRegionIds = [],
  onRegionPress,
  autoRotate = true,
  onInteractionStart,
  onInteractionEnd,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const meshRef = useRef<THREE.Mesh | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const positionsRef = useRef<Float32Array | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const disposersRef = useRef<(() => void)[]>([]);
  // Model loading is async; the screen can be left before it finishes.
  const isMountedRef = useRef(true);

  // Latest props, read by the render loop and gesture handlers without
  // re-creating the GL context.
  const regionsRef = useRef(regions);
  const selectedRef = useRef(selectedRegionIds);
  const autoRotateRef = useRef(autoRotate);
  const onRegionPressRef = useRef(onRegionPress);
  regionsRef.current = regions;
  selectedRef.current = selectedRegionIds;
  autoRotateRef.current = autoRotate;
  onRegionPressRef.current = onRegionPress;

  const rotationRef = useRef({ x: 0, y: 0.6 });
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const touchStartTimeRef = useRef(0);
  const isInteractingRef = useRef(false);
  const hasSelectionRef = useRef(selectedRegionIds.length > 0);

  /** Repaint region colours (study data changed). */
  const applyRegionColors = useCallback(() => {
    const mesh = meshRef.current;
    const positions = positionsRef.current;
    if (!mesh || !positions) return;

    const attr = mesh.geometry.getAttribute("color");
    if (!attr) return;

    computeVertexColors(
      positions,
      regionsRef.current,
      attr.array as Float32Array,
    );
    attr.needsUpdate = true;
  }, []);

  /** Repaint only the selection glow (a tap changed what is highlighted). */
  const applySelection = useCallback(() => {
    const mesh = meshRef.current;
    const positions = positionsRef.current;
    if (!mesh || !positions) return;

    const attr = mesh.geometry.getAttribute("aSelection");
    if (!attr) return;

    computeSelectionWeights(
      positions,
      regionsRef.current,
      selectedRef.current,
      attr.array as Float32Array,
    );
    attr.needsUpdate = true;
    hasSelectionRef.current = selectedRef.current.length > 0;
  }, []);

  // Colours depend only on study activity; the selection glow only on the tap.
  // Keeping the two effects separate means tapping a region does not redo the
  // full colour pass over 29k vertices. Signatures let a new-but-equivalent
  // array prop be a no-op.
  const regionSignature = useMemo(
    () =>
      regions
        .map((r) => `${r.id}:${r.activity.toFixed(3)}:${r.color}`)
        .join("|"),
    [regions],
  );
  const selectionSignature = useMemo(
    () => [...selectedRegionIds].sort().join("|"),
    [selectedRegionIds],
  );

  useEffect(() => {
    applyRegionColors();
  }, [regionSignature, applyRegionColors]);

  useEffect(() => {
    applySelection();
  }, [selectionSignature, applySelection]);

  /** Map a tap to the region nearest the point where the ray hits the brain. */
  const handleTap = useCallback((localX: number, localY: number) => {
    const mesh = meshRef.current;
    const camera = cameraRef.current;
    const onPress = onRegionPressRef.current;
    if (!mesh || !camera || !onPress) return;

    const ndc = new THREE.Vector2(
      (localX / CANVAS_SIZE) * 2 - 1,
      -(localY / CANVAS_SIZE) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(mesh, false);
    if (hits.length === 0) return;

    // Convert the world-space hit back into model space, where region
    // coordinates live.
    const local = mesh.worldToLocal(hits[0].point.clone());

    let nearest: Brain3DRegion | null = null;
    let nearestDist = Infinity;
    for (const region of regionsRef.current) {
      const dx = local.x - region.position.x;
      const dy = local.y - region.position.y;
      const dz = local.z - region.position.z;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = region;
      }
    }

    if (nearest) onPress(nearest);
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    try {
      const renderer = new Renderer({ gl });
      renderer.setPixelRatio(gl.drawingBufferWidth / CANVAS_SIZE);
      renderer.setSize(CANVAS_SIZE, CANVAS_SIZE);
      renderer.setClearColor(BACKGROUND_COLOR, 1);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

      const scene = new THREE.Scene();

      // The model spans ±1, so this distance frames it with a small margin.
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      camera.position.set(0, 0, 2.6);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      cameraRef.current = camera;

      const { positions, normals } = await loadBrainGeometry();
      if (!isMountedRef.current) return;
      positionsRef.current = positions;

      const vertexCount = positions.length / 3;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      // Allocated once; the two recolour passes write into these in place.
      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3),
      );
      geometry.setAttribute(
        "aSelection",
        new THREE.BufferAttribute(new Float32Array(vertexCount), 1),
      );

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uPulse: { value: 0 },
          uLightDir: { value: new THREE.Vector3(0.5, 0.6, 1).normalize() },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        vertexColors: true,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.rotation.y = rotationRef.current.y;
      meshRef.current = mesh;

      // The recolour effects already fired (before the mesh existed) and bailed
      // out, so paint the initial state here.
      applyRegionColors();
      applySelection();
      scene.add(mesh);

      disposersRef.current.push(() => {
        geometry.dispose();
        material.dispose();
        scene.remove(mesh);
        renderer.dispose();
      });

      setLoading(false);

      let elapsed = 0;
      const animate = () => {
        frameIdRef.current = requestAnimationFrame(animate);
        elapsed += 1 / 60;

        if (!isInteractingRef.current && autoRotateRef.current) {
          rotationRef.current.y += 0.005;
        }
        mesh.rotation.y = rotationRef.current.y;
        mesh.rotation.x = rotationRef.current.x;

        // Pulse only while something is selected, so the idle brain sits still.
        material.uniforms.uPulse.value = hasSelectionRef.current
          ? 0.35 + 0.25 * Math.sin(elapsed * 3.2)
          : 0;

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      animate();
    } catch (err) {
      if (!isMountedRef.current) return;
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Couldn't load the 3D brain model (${detail})`);
      setLoading(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_evt, gestureState) => {
        isInteractingRef.current = true;
        lastTouchRef.current = { x: gestureState.x0, y: gestureState.y0 };
        // RN's gestureState carries no start timestamp, so track it ourselves.
        touchStartTimeRef.current = Date.now();
        onInteractionStart?.();
      },
      onPanResponderMove: (_evt, gestureState) => {
        const deltaX = gestureState.moveX - lastTouchRef.current.x;
        const deltaY = gestureState.moveY - lastTouchRef.current.y;

        rotationRef.current.y += deltaX * 0.01;
        rotationRef.current.x = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, rotationRef.current.x + deltaY * 0.01),
        );

        lastTouchRef.current = { x: gestureState.moveX, y: gestureState.moveY };
      },
      onPanResponderRelease: (evt, gestureState) => {
        isInteractingRef.current = false;
        onInteractionEnd?.();

        // A short, near-stationary gesture is a tap on a region, not a drag.
        const travel = Math.hypot(gestureState.dx, gestureState.dy);
        const duration = Date.now() - touchStartTimeRef.current;
        const isTap = travel < TAP_MAX_DISTANCE && duration < TAP_MAX_DURATION;

        if (isTap) {
          handleTap(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        }
      },
      // A gesture can be terminated (incoming call, another responder takes
      // over) without ever releasing. Without this the parent ScrollView would
      // stay disabled and the page would be stuck unscrollable.
      onPanResponderTerminate: () => {
        isInteractingRef.current = false;
        onInteractionEnd?.();
      },
    }),
  ).current;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      disposersRef.current.forEach((dispose) => dispose());
      disposersRef.current = [];
      meshRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8B9DC3" />
          <Text style={styles.loadingText}>Loading your brain…</Text>
        </View>
      )}
      <GLView
        style={styles.gl}
        onContextCreate={onContextCreate}
        {...panResponder.panHandlers}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    alignSelf: "center",
    backgroundColor: BACKGROUND_HEX,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  gl: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "600",
    color: "#8B9DC3",
  },
  errorText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f87171",
    textAlign: "center",
  },
});

export default OBJBrain3D;
