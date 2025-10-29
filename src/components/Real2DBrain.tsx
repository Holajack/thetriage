/**
 * Real 2D Brain Component (procedural)
 *
 * Renders a fixed-angle view of the procedural 3D brain mesh.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  createProceduralBrainMesh,
  PROCEDURAL_BRAIN_FACE_COUNT,
  PROCEDURAL_BRAIN_VERTEX_COUNT,
} from '../utils/proceduralBrainMesh';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = Math.min(width - 40, 350);

interface BrainRegion {
  id: string;
  name: string;
  color: string;
  activity: number;
  x: number;
  y: number;
}

interface Real2DBrainProps {
  regions: BrainRegion[];
  onRegionPress?: (region: BrainRegion) => void;
}

const Real2DBrain: React.FC<Real2DBrainProps> = ({ regions, onRegionPress }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rendererRef = useRef<Renderer | null>(null);

  const onContextCreate = async (gl: any) => {
    try {
      const renderer = new Renderer({ gl });
      renderer.setSize(CANVAS_SIZE, CANVAS_SIZE);
      renderer.setClearColor(0xf8f9fa, 1);
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf8f9fa);

      const camera = new THREE.PerspectiveCamera(36, CANVAS_SIZE / CANVAS_SIZE, 0.1, 1000);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.75));

      const keyLight = new THREE.DirectionalLight(0xffffff, 0.65);
      keyLight.position.set(120, 130, 140);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.28);
      fillLight.position.set(-120, -20, 60);
      scene.add(fillLight);

      const avgActivity =
        regions.length > 0
          ? regions.reduce((sum, region) => sum + Math.max(0, region.activity), 0) /
            regions.length
          : 0;

      console.log(
        '🧠 Generating 2D procedural brain view',
        `(vertices=${PROCEDURAL_BRAIN_VERTEX_COUNT}, faces=${PROCEDURAL_BRAIN_FACE_COUNT})`
      );

      const brainMesh = createProceduralBrainMesh(avgActivity);
      brainMesh.rotation.y = Math.PI * 0.18;
      brainMesh.rotation.x = -0.08;

      if (!brainMesh.geometry.boundingSphere) {
        brainMesh.geometry.computeBoundingSphere();
      }
      const boundingSphere = brainMesh.geometry.boundingSphere;
      const radius = boundingSphere ? boundingSphere.radius : 1;

      const cameraDistance = Math.max(radius * 2.2, 150);
      const viewHalfExtent = cameraDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const fitScale = (viewHalfExtent * 0.9) / radius;

      camera.position.set(95 * (cameraDistance / 160), 28 * (cameraDistance / 160), cameraDistance);
      camera.near = Math.max(0.1, cameraDistance - radius * 2);
      camera.far = cameraDistance + radius * 5;
      camera.updateProjectionMatrix();

      brainMesh.scale.setScalar(fitScale);

      scene.add(brainMesh);

      renderer.render(scene, camera);
      gl.endFrameEXP();

      setLoading(false);
    } catch (err) {
      console.error('Procedural 2D brain init error:', err);
      setError('Failed to generate brain preview');
      setLoading(false);
    }
  };

  const handleRegionPress = (region: BrainRegion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRegionPress?.(region);
  };

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={48} color="#d32f2f" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>Rendering Brain...</Text>
            <Text style={styles.loadingSubtext}>50,000 vertices · 50,000 faces</Text>
          </View>
        )}
        <GLView style={styles.gl} onContextCreate={onContextCreate} />
      </View>

      {!loading && regions.length > 0 && (
        <View style={styles.indicatorsOverlay}>
          {regions.slice(0, 6).map((region, index) => {
            const opacity = 0.35 + region.activity * 0.6;
            const size = 30 + region.activity * 22;
            return (
              <TouchableOpacity
                key={region.id}
                style={[
                  styles.activityIndicator,
                  {
                    left: CANVAS_SIZE * 0.14 + index * 42,
                    top: CANVAS_SIZE * 0.18 + Math.sin(index * 1.2) * 28,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: region.color,
                    opacity,
                  },
                ]}
                onPress={() => handleRegionPress(region)}
                activeOpacity={0.75}
              >
                <View style={styles.activityPulse} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.labelsContainer}>
        <Text style={styles.title}>Brain Activity Map</Text>
        <Text style={styles.subtitle}>Procedural anatomy preview</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  container: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
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
    backgroundColor: 'rgba(248, 249, 250, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
  },
  loadingSubtext: {
    marginTop: 6,
    fontSize: 12,
    color: '#5f6a6a',
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
  },
  indicatorsOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  activityIndicator: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  activityPulse: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    backgroundColor: 'transparent',
  },
  labelsContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default Real2DBrain;
