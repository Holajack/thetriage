/**
 * Simple Geometric Brain - Built with THREE.js primitives
 * Guaranteed to work on all devices
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

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

interface SimpleBrain3DProps {
  regions: Brain3DRegion[];
  onRegionPress?: (region: Brain3DRegion) => void;
  autoRotate?: boolean;
}

const SimpleBrain3D: React.FC<SimpleBrain3DProps> = ({
  regions,
  onRegionPress,
  autoRotate = true
}) => {
  const [loading, setLoading] = useState(true);
  const brainGroupRef = useRef<THREE.Group | null>(null);
  const frameIdRef = useRef<number | null>(null);

  // Touch interaction state
  const rotationRef = useRef({ x: 0, y: 0 });
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const isInteractingRef = useRef(false);

  const onContextCreate = async (gl: any) => {
    try {
      console.log('🧠 Creating simple geometric brain...');

      // Initialize renderer
      const renderer = new Renderer({ gl });
      renderer.setSize(CANVAS_SIZE, CANVAS_SIZE);
      renderer.setClearColor(BACKGROUND_COLOR, 1);

      // Create scene
      const scene = new THREE.Scene();

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        50,
        CANVAS_SIZE / CANVAS_SIZE,
        0.1,
        1000
      );
      camera.position.set(0, 0, 120);
      camera.lookAt(0, 0, 0);

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 50, 50);
      scene.add(directionalLight);

      const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
      backLight.position.set(-50, -50, -50);
      scene.add(backLight);

      // Calculate average activity for coloring
      const avgActivity = regions.length
        ? regions.reduce((sum, region) => sum + Math.max(0, region.activity), 0) / regions.length
        : 0;

      // Create brain color based on activity
      const brainColor = new THREE.Color().setHSL(
        0.025,  // Peachy hue
        0.5 + (avgActivity * 0.3),
        0.7
      );

      // Create brain group
      const brainGroup = new THREE.Group();

      // Main brain body (elongated sphere)
      const brainGeometry = new THREE.SphereGeometry(25, 32, 32);
      brainGeometry.scale(1.2, 1, 1.3);  // Elongate to brain shape
      const brainMaterial = new THREE.MeshPhongMaterial({
        color: brainColor,
        specular: 0x444444,
        shininess: 30,
      });
      const brainMesh = new THREE.Mesh(brainGeometry, brainMaterial);
      brainGroup.add(brainMesh);

      // Left hemisphere bump
      const leftHemisphere = new THREE.SphereGeometry(15, 16, 16);
      leftHemisphere.scale(1.2, 0.8, 1);
      const leftMaterial = new THREE.MeshPhongMaterial({
        color: brainColor,
        specular: 0x444444,
        shininess: 30,
      });
      const leftMesh = new THREE.Mesh(leftHemisphere, leftMaterial);
      leftMesh.position.set(-18, 5, 0);
      brainGroup.add(leftMesh);

      // Right hemisphere bump
      const rightHemisphere = new THREE.SphereGeometry(15, 16, 16);
      rightHemisphere.scale(1.2, 0.8, 1);
      const rightMaterial = new THREE.MeshPhongMaterial({
        color: brainColor,
        specular: 0x444444,
        shininess: 30,
      });
      const rightMesh = new THREE.Mesh(rightHemisphere, rightMaterial);
      rightMesh.position.set(18, 5, 0);
      brainGroup.add(rightMesh);

      // Frontal lobe bumps
      const frontalLeft = new THREE.SphereGeometry(10, 16, 16);
      const frontalLeftMesh = new THREE.Mesh(frontalLeft, brainMaterial.clone());
      frontalLeftMesh.position.set(-10, 8, 20);
      brainGroup.add(frontalLeftMesh);

      const frontalRight = new THREE.SphereGeometry(10, 16, 16);
      const frontalRightMesh = new THREE.Mesh(frontalRight, brainMaterial.clone());
      frontalRightMesh.position.set(10, 8, 20);
      brainGroup.add(frontalRightMesh);

      // Cerebellum (back bottom part)
      const cerebellum = new THREE.SphereGeometry(12, 16, 16);
      cerebellum.scale(1.3, 0.7, 0.9);
      const cerebellumMesh = new THREE.Mesh(cerebellum, brainMaterial.clone());
      cerebellumMesh.position.set(0, -15, -15);
      brainGroup.add(cerebellumMesh);

      // Brain stem
      const stemGeometry = new THREE.CylinderGeometry(5, 7, 15, 16);
      const stemMesh = new THREE.Mesh(stemGeometry, brainMaterial.clone());
      stemMesh.position.set(0, -25, -5);
      brainGroup.add(stemMesh);

      // Add subtle wrinkles/folds with smaller spheres
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 22;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(i) * 5;

        const wrinkle = new THREE.SphereGeometry(4, 8, 8);
        const wrinkleMesh = new THREE.Mesh(wrinkle, brainMaterial.clone());
        wrinkleMesh.position.set(x, y, z);
        brainGroup.add(wrinkleMesh);
      }

      brainGroupRef.current = brainGroup;
      scene.add(brainGroup);

      console.log('🧠 Simple geometric brain created with', brainGroup.children.length, 'parts');

      setLoading(false);

      // Animation loop
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

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      animate();
      console.log('🧠 Animation started');

    } catch (err) {
      console.error('🧠 Error creating brain:', err);
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

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1B5E20" />
          <Text style={styles.loadingText}>Creating 3D Brain...</Text>
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
  },
  gl: {
    flex: 1,
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
});

export default SimpleBrain3D;
