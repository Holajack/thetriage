/**
 * Real 3D Brain Component (procedural)
 *
 * Features:
 * - Generates a 50k-vertex / 50k-face mesh procedurally (triangle surface)
 * - Interactive touch rotation with inertia-friendly drag handling
 * - Optional auto-rotation when idle
 * - Dark background for contrast
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
import {
  createProceduralBrainMesh,
  PROCEDURAL_BRAIN_FACE_COUNT,
  PROCEDURAL_BRAIN_VERTEX_COUNT,
} from '../utils/proceduralBrainMesh';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = Math.min(width - 40, 400);
const BACKGROUND_COLOR = 0x0f172a;
const BACKGROUND_HEX = '#0f172a';

interface Brain3DRegion {
  id: string;
  name: string;
  color: string;
  activity: number;
  subject?: string;
  studyTime: number;
  lastActive: string;
}

interface Real3DBrainProps {
  regions: Brain3DRegion[];
  onRegionPress?: (region: Brain3DRegion) => void;
  autoRotate?: boolean;
}

const Real3DBrain: React.FC<Real3DBrainProps> = ({
  regions,
  onRegionPress,
  autoRotate = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const brainGroupRef = useRef<THREE.Group | null>(null);
  const brainMeshRef = useRef<THREE.Mesh | null>(null);
  const frameIdRef = useRef<number | null>(null);

  const rotationRef = useRef({ x: 0, y: Math.PI * 0.2 });
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const isInteractingRef = useRef(false);

  const onContextCreate = async (gl: any) => {
    try {
      const renderer = new Renderer({ gl });
      renderer.setSize(CANVAS_SIZE, CANVAS_SIZE);
      renderer.setClearColor(BACKGROUND_COLOR, 1);
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(BACKGROUND_COLOR, 20, 180);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(50, CANVAS_SIZE / CANVAS_SIZE, 0.1, 1000);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      scene.add(new THREE.AmbientLight(0xffffff, 0.65));

      const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
      keyLight.position.set(60, 80, 90);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
      rimLight.position.set(-70, -40, -60);
      scene.add(rimLight);

      const avgActivity =
        regions.length > 0
          ? regions.reduce((sum, region) => sum + Math.max(0, region.activity), 0) /
            regions.length
          : 0;

      console.log(
        '🧠 Generating procedural brain mesh',
        `(vertices=${PROCEDURAL_BRAIN_VERTEX_COUNT}, faces=${PROCEDURAL_BRAIN_FACE_COUNT})`,
        'activity=', avgActivity.toFixed(3)
      );

      const brainMesh = createProceduralBrainMesh(avgActivity);
      brainMeshRef.current = brainMesh;

      const brainGroup = new THREE.Group();
      brainGroup.name = 'ProceduralBrainGroup';
      brainGroup.add(brainMesh);

      if (!brainMesh.geometry.boundingSphere) {
        brainMesh.geometry.computeBoundingSphere();
      }
      const boundingSphere = brainMesh.geometry.boundingSphere;
      const radius = boundingSphere ? boundingSphere.radius : 1;

      const cameraDistance = Math.max(radius * 2.4, 140);
      const fovHalfRadians = THREE.MathUtils.degToRad(camera.fov / 2);
      const viewHalfExtent = cameraDistance * Math.tan(fovHalfRadians);
      const fitScale = (viewHalfExtent * 0.85) / radius;

      camera.position.set(0, 0, cameraDistance);
      camera.near = Math.max(0.1, cameraDistance - radius * 3);
      camera.far = cameraDistance + radius * 6;
      camera.updateProjectionMatrix();

      brainGroup.scale.setScalar(fitScale);
      brainGroup.rotation.y = rotationRef.current.y;
      brainGroupRef.current = brainGroup;

      scene.add(brainGroup);

      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.render(scene, cameraRef.current);
        gl.endFrameEXP();
      }

      setLoading(false);
    } catch (err) {
      console.error('Procedural 3D brain init error:', err);
      setError('Failed to generate 3D brain');
      setLoading(false);
    }

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      if (rendererRef.current && sceneRef.current && cameraRef.current && brainGroupRef.current) {
        if (isInteractingRef.current) {
          brainGroupRef.current.rotation.x = rotationRef.current.x;
          brainGroupRef.current.rotation.y = rotationRef.current.y;
        } else if (autoRotate) {
          rotationRef.current.y += 0.004;
          brainGroupRef.current.rotation.y = rotationRef.current.y;
        }

        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      gl.endFrameEXP();
    };

    animate();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
        isInteractingRef.current = true;
        lastTouchRef.current = { x: gesture.x0, y: gesture.y0 };
      },
      onPanResponderMove: (_evt, gesture) => {
        const deltaX = gesture.moveX - lastTouchRef.current.x;
        const deltaY = gesture.moveY - lastTouchRef.current.y;

        rotationRef.current.y += deltaX * 0.01;
        rotationRef.current.x += deltaY * 0.01;
        rotationRef.current.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, rotationRef.current.x));

        lastTouchRef.current = { x: gesture.moveX, y: gesture.moveY };
      },
      onPanResponderRelease: () => {
        isInteractingRef.current = false;
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
        <Text style={styles.errorSubtext}>Please try again later.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1B5E20" />
          <Text style={styles.loadingText}>Generating 3D Brain...</Text>
          <Text style={styles.loadingSubtext}>50,000 vertices · 50,000 faces</Text>
        </View>
      )}
      <GLView style={styles.gl} onContextCreate={onContextCreate} {...panResponder.panHandlers} />
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
  },
  gl: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#e0f2f1',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#b2dfdb',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default Real3DBrain;
