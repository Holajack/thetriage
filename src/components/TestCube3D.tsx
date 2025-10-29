/**
 * Simple 3D Cube Test - Verify THREE.js is working
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = Math.min(width - 40, 400);

const TestCube3D: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const frameIdRef = useRef<number | null>(null);

  const onContextCreate = async (gl: any) => {
    try {
      console.log('🧪 TEST: Starting THREE.js initialization...');

      // Initialize renderer
      const renderer = new Renderer({ gl });
      renderer.setSize(CANVAS_SIZE, CANVAS_SIZE);
      renderer.setClearColor(0x0f172a, 1);
      console.log('🧪 TEST: Renderer created');

      // Create scene
      const scene = new THREE.Scene();
      console.log('🧪 TEST: Scene created');

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        45,
        CANVAS_SIZE / CANVAS_SIZE,
        0.1,
        1000
      );
      camera.position.set(0, 0, 100);
      camera.lookAt(0, 0, 0);
      console.log('🧪 TEST: Camera created');

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 50, 50);
      scene.add(directionalLight);
      console.log('🧪 TEST: Lights added');

      // Create a simple colored cube
      const geometry = new THREE.BoxGeometry(30, 30, 30);
      const material = new THREE.MeshPhongMaterial({
        color: 0xff6b9d,  // Pink
        specular: 0x444444,
        shininess: 30
      });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      cubeRef.current = cube;

      console.log('🧪 TEST: Pink cube added to scene!');
      console.log('🧪 TEST: Cube position:', cube.position);
      console.log('🧪 TEST: Camera position:', camera.position);

      setLoading(false);

      // Animation loop
      const animate = () => {
        frameIdRef.current = requestAnimationFrame(animate);

        if (cubeRef.current) {
          cubeRef.current.rotation.x += 0.01;
          cubeRef.current.rotation.y += 0.01;
        }

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      animate();
      console.log('🧪 TEST: Animation loop started');

    } catch (err) {
      console.error('🧪 TEST ERROR:', err);
      setError('Failed to initialize 3D renderer');
      setLoading(false);
    }
  };

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
          <ActivityIndicator size="large" color="#ff6b9d" />
          <Text style={styles.loadingText}>Testing THREE.js...</Text>
        </View>
      )}
      <GLView
        style={styles.gl}
        onContextCreate={onContextCreate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    alignSelf: 'center',
    backgroundColor: '#0f172a',
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
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b9d',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default TestCube3D;
