'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface ThreeDWorkspaceWebGLProps {
  objectType: 'torus' | 'cube' | 'sphere' | 'particles';
  environment: 'studio' | 'nebula' | 'sunset' | 'cyber';
  roughness: number;
  metalness: number;
  rotationSpeed: number;
  isRotating: boolean;
}

export function ThreeDWorkspaceWebGL({
  objectType,
  environment,
  roughness,
  metalness,
  rotationSpeed,
  isRotating,
}: ThreeDWorkspaceWebGLProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Object3D | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.5;
    cameraRef.current = camera;

    // 3. WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      console.error('Failed to create WebGLRenderer', e);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x3b82f6, 2.5);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xec4899, 1.8);
    dirLight2.position.set(-5, -5, 2);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 1.5, 10);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    // 5. Geometry generation
    const buildMesh = () => {
      if (meshRef.current) {
        scene.remove(meshRef.current);
        if ((meshRef.current as any).geometry) (meshRef.current as any).geometry.dispose();
      }

      if (objectType === 'particles') {
        const particleCount = 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
          const u = Math.random();
          const v = Math.random();
          const theta = u * 2.0 * Math.PI;
          const phi = Math.acos(2.0 * v - 1.0);
          const r = Math.cbrt(Math.random()) * 1.5;
          const sinPhi = Math.sin(phi);

          positions[i] = r * sinPhi * Math.cos(theta);
          positions[i + 1] = r * sinPhi * Math.sin(theta);
          positions[i + 2] = r * Math.cos(phi);

          colors[i] = 0.3 + 0.7 * Math.random();
          colors[i + 1] = 0.5 + 0.5 * Math.random();
          colors[i + 2] = 1.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
          size: 0.035,
          vertexColors: true,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);
        meshRef.current = points;
      } else {
        let geometry: THREE.BufferGeometry;
        if (objectType === 'cube') {
          geometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        } else if (objectType === 'sphere') {
          geometry = new THREE.SphereGeometry(1.2, 64, 64);
        } else {
          // Torus Knot
          geometry = new THREE.TorusKnotGeometry(0.9, 0.28, 128, 32);
        }

        const material = new THREE.MeshStandardMaterial({
          color: environment === 'sunset' ? 0xf59e0b : environment === 'cyber' ? 0x06b6d4 : 0x6366f1,
          roughness,
          metalness,
          wireframe: false,
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        meshRef.current = mesh;
      }
    };

    buildMesh();

    // 6. Handle resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 7. Interactive Orbit Drag Controls
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !meshRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      meshRef.current.rotation.y += deltaX * 0.008;
      meshRef.current.rotation.x += deltaY * 0.008;

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 8. Render loop
    const animate = () => {
      if (meshRef.current && isRotating && !isDraggingRef.current) {
        meshRef.current.rotation.y += rotationSpeed;
        meshRef.current.rotation.x += rotationSpeed * 0.5;
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      renderer.dispose();
      if (container.contains(dom)) container.removeChild(dom);
    };
  }, [objectType, environment, roughness, metalness, rotationSpeed, isRotating]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      style={{ minHeight: '380px' }}
    />
  );
}
