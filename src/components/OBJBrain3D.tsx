/**
 * OBJ Brain 3D Component
 * Loads the actual OBJ brain model with proper positioning and colors
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
// NOTE: OBJLoader is dynamically imported inside onContextCreate to avoid
// the "Invalid URL:" error that occurs when Three.js loaders are imported
// at module load time in React Native. The dynamic import ensures the URL
// polyfill is fully active before the loader is loaded.
import { Brain3DRegion } from '../utils/brain3DData';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = Math.min(width - 40, 400);
const BACKGROUND_COLOR = 0x0f172a;
const BACKGROUND_HEX = '#0f172a';

interface OBJBrain3DProps {
  regions: Brain3DRegion[];
  onRegionPress?: (region: Brain3DRegion) => void;
  autoRotate?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

const OBJBrain3D: React.FC<OBJBrain3DProps> = ({
  regions,
  onRegionPress,
  autoRotate = true,
  onInteractionStart,
  onInteractionEnd
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const brainGroupRef = useRef<THREE.Group | null>(null);
  const frameIdRef = useRef<number | null>(null);

  // Touch interaction state
  const rotationRef = useRef({ x: 0, y: 0 });
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const isInteractingRef = useRef(false);

  const onContextCreate = async (gl: any) => {
    try {
      console.log('🧠 [OBJ] Initializing renderer...');

      // Initialize renderer
      const renderer = new Renderer({ gl });

      // Get actual device pixel ratio
      const pixelRatio = gl.drawingBufferWidth / CANVAS_SIZE;
      console.log('🧠 [OBJ] Pixel ratio:', pixelRatio);
      console.log('🧠 [OBJ] GL drawing buffer:', gl.drawingBufferWidth, 'x', gl.drawingBufferHeight);

      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(CANVAS_SIZE, CANVAS_SIZE);

      // Set GL viewport to match the full canvas
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

      renderer.setClearColor(BACKGROUND_COLOR, 1);

      console.log('🧠 [OBJ] Renderer viewport size:', CANVAS_SIZE, 'x', CANVAS_SIZE);
      console.log('🧠 [OBJ] Renderer created with pixel ratio:', pixelRatio);

      // Create scene
      const scene = new THREE.Scene();

      // Create camera with perfect centering
      const camera = new THREE.PerspectiveCamera(
        50,  // Field of view
        1,   // Aspect ratio (square viewport)
        0.1,
        1000
      );
      camera.position.set(0, 0, 140);  // Camera on Z axis
      camera.lookAt(0, 0, 0);  // Looking directly at origin
      camera.updateProjectionMatrix();

      console.log('🧠 [OBJ] Camera FOV:', camera.fov);
      console.log('🧠 [OBJ] Camera aspect:', camera.aspect);
      console.log('🧠 [OBJ] Camera position:', camera.position);
      console.log('🧠 [OBJ] Camera is looking at: (0, 0, 0)');

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 50, 50);
      scene.add(directionalLight);

      const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
      backLight.position.set(-50, -50, -50);
      scene.add(backLight);

      // Load OBJ file
      console.log('🧠 [OBJ] Loading brain model...');
      const objAsset = Asset.fromModule(require('../assets/models/Brain_Diagram_with_La_1027134643_texture_obj/Brain_Diagram_with_La_1027134643_texture.obj'));
      await objAsset.downloadAsync();
      console.log('🧠 [OBJ] Asset downloaded');

      const avgActivity = regions.length
        ? regions.reduce((sum, region) => sum + Math.max(0, region.activity), 0) / regions.length
        : 0.5;

      // Dynamic import to avoid URL error at module load time
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader');
      const loader = new OBJLoader();

      loader.load(
        objAsset.localUri || objAsset.uri,
        (obj) => {
          console.log('🧠 [OBJ] Model loaded successfully!');

          let vertexCount = 0;

          console.log('🧠 [OBJ] Mapping colors from', regions.length, 'regions');

          // Convert hex color to HSL
          const hexToHSL = (hex: string) => {
            const color = new THREE.Color(hex);
            const hsl = { h: 0, s: 0, l: 0 };
            color.getHSL(hsl);
            return hsl;
          };

          // Function to find closest region to a mesh position and return color data
          const getRegionColorData = (meshPos: THREE.Vector3) => {
            if (regions.length === 0) {
              // Default gray color if no regions
              return { h: 0, s: 0, l: 0.5, activity: 0.3 };
            }

            // Normalize mesh position to match region positions (-1 to 1)
            // The brain model has approximate bounds of ±30 units
            const normalized = {
              x: meshPos.x / 30,
              y: meshPos.y / 30,
              z: meshPos.z / 30
            };

            let closestRegion = regions[0];
            let minDistance = Infinity;

            // Find the region closest to this mesh position
            regions.forEach(region => {
              const dx = normalized.x - region.position.x;
              const dy = normalized.y - region.position.y;
              const dz = normalized.z - region.position.z;
              const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

              if (distance < minDistance) {
                minDistance = distance;
                closestRegion = region;
              }
            });

            // Convert region color (hex) to HSL
            const hsl = hexToHSL(closestRegion.color);

            // Adjust lightness based on activity level
            // Higher activity = brighter color
            const activityBrightness = 0.4 + (closestRegion.activity * 0.35);

            return {
              h: hsl.h,
              s: Math.min(hsl.s + 0.2, 1), // Boost saturation slightly
              l: activityBrightness,
              activity: closestRegion.activity
            };
          };

          // Replace materials with colored regions
          obj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry.attributes.position) {
                vertexCount += child.geometry.attributes.position.count;
              }

              // Compute normals
              child.geometry.computeVertexNormals();

              // Calculate mesh center position
              child.geometry.computeBoundingBox();
              const meshCenter = new THREE.Vector3();
              if (child.geometry.boundingBox) {
                child.geometry.boundingBox.getCenter(meshCenter);
              }

              // Get color based on mesh position
              const colorData = getRegionColorData(meshCenter);
              const brainColor = new THREE.Color().setHSL(
                colorData.h,
                colorData.s,
                colorData.l
              );

              const material = new THREE.MeshPhongMaterial({
                color: brainColor,
                emissive: new THREE.Color().setHSL(colorData.h, 0.3, 0.1), // Subtle glow matching region
                specular: 0x666666,
                shininess: 40,
                side: THREE.DoubleSide,
              });

              child.material = material;
              child.visible = true;
              child.frustumCulled = false;
            }
          });

          console.log('🧠 [OBJ] Model has', vertexCount, 'vertices');

          // Calculate bounding box for centering
          const box = new THREE.Box3().setFromObject(obj);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          console.log('🧠 [OBJ] Original size:', size);
          console.log('🧠 [OBJ] Original center:', center);

          // Scale to FILL the viewport - make it BIGGER
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetSize = 100;  // Even bigger to fill viewport
          const scale = targetSize / maxDim;
          obj.scale.setScalar(scale);

          // FORCE brain to EXACT center (0, 0, 0)
          // Method: Recalculate bounding box and center AFTER initial positioning

          // First pass: rough centering
          const scaledCenter = center.clone().multiplyScalar(scale);
          obj.position.set(-scaledCenter.x, -scaledCenter.y, -scaledCenter.z);

          console.log('🧠 [OBJ] First pass position:', obj.position);

          // Second pass: FORCE EXACT centering
          // Recalculate the bounding box with the new position
          obj.updateMatrixWorld(true);
          const repositionedBox = new THREE.Box3().setFromObject(obj);
          const repositionedCenter = repositionedBox.getCenter(new THREE.Vector3());

          console.log('🧠 [OBJ] Brain center after first positioning:', repositionedCenter);

          // Adjust position to FORCE center to exactly (0, 0, 0)
          obj.position.x -= repositionedCenter.x;
          obj.position.y -= repositionedCenter.y;
          obj.position.z -= repositionedCenter.z;

          console.log('🧠 [OBJ] ADJUSTED position to force (0,0,0):', obj.position);

          // Final verification
          obj.updateMatrixWorld(true);
          const finalBox = new THREE.Box3().setFromObject(obj);
          const finalCenter = finalBox.getCenter(new THREE.Vector3());
          console.log('🧠 [OBJ] ✅ FINAL brain center:', finalCenter);
          console.log('🧠 [OBJ] ✅ FINAL brain size:', maxDim * scale);

          obj.visible = true;
          obj.frustumCulled = false;

          brainGroupRef.current = obj;
          scene.add(obj);

          console.log('🧠 [OBJ] Brain added to scene at CENTER');
          setLoading(false);
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            console.log('🧠 [OBJ] Loading:', percent.toFixed(0) + '%');
          }
        },
        (err) => {
          console.error('🧠 [OBJ] Load error:', err);
          setError('Failed to load OBJ brain model');
          setLoading(false);
        }
      );

      // Animation loop (same as SimpleBrain3D)
      let frameCount = 0;
      const animate = () => {
        frameIdRef.current = requestAnimationFrame(animate);

        if (brainGroupRef.current) {
          if (isInteractingRef.current) {
            brainGroupRef.current.rotation.y = rotationRef.current.y;
            brainGroupRef.current.rotation.x = rotationRef.current.x;
          } else if (autoRotate) {
            rotationRef.current.y += 0.005;
            brainGroupRef.current.rotation.y = rotationRef.current.y;
            brainGroupRef.current.rotation.x = rotationRef.current.x;
          }
        }

        // Ensure viewport is set correctly before each render
        if (frameCount === 0) {
          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          console.log('🧠 [OBJ] First frame - viewport set to:', gl.drawingBufferWidth, 'x', gl.drawingBufferHeight);
        }
        frameCount++;

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      animate();
      console.log('🧠 [OBJ] Animation started');

    } catch (err) {
      console.error('🧠 [OBJ] Initialization error:', err);
      setError('Failed to initialize 3D renderer');
      setLoading(false);
    }
  };

  // Touch gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        isInteractingRef.current = true;
        lastTouchRef.current = { x: gestureState.x0, y: gestureState.y0 };
        onInteractionStart?.();
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const deltaX = gestureState.moveX - lastTouchRef.current.x;
        const deltaY = gestureState.moveY - lastTouchRef.current.y;

        rotationRef.current.y += deltaX * 0.01;
        rotationRef.current.x += deltaY * 0.01;
        rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x));

        lastTouchRef.current = { x: gestureState.moveX, y: gestureState.moveY };
      },
      onPanResponderRelease: () => {
        isInteractingRef.current = false;
        onInteractionEnd?.();
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1B5E20" />
          <Text style={styles.loadingText}>Loading OBJ Brain Model...</Text>
          <Text style={styles.loadingSubtext}>Anatomical 3D Model</Text>
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
    alignSelf: 'center',
    backgroundColor: BACKGROUND_HEX,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gl: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
    textAlign: 'center',
  },
});

export default OBJBrain3D;
