'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeDRuntimeNodeProps {
  id: string;
  style?: React.CSSProperties;
  className?: string;
  geometryType?: 'torusknot' | 'cube' | 'sphere' | 'particles';
  rotationSpeed?: number;
  color?: string;
  isEditorMode?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function ThreeDRuntimeNode({
  id,
  style,
  className,
  geometryType = 'torusknot',
  rotationSpeed = 0.01,
  color = '#DFBA6B',
  isEditorMode,
  onClick,
}: ThreeDRuntimeNodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL initialization failed in ThreeDRuntimeNode:', e);
      return;
    }

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // 3. Mesh Geometry
    let geometry: THREE.BufferGeometry;
    switch (geometryType) {
      case 'cube':
        geometry = new THREE.BoxGeometry(2, 2, 2);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(1.5, 32, 32);
        break;
      case 'particles': {
        const particleGeo = new THREE.BufferGeometry();
        const count = 500;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) {
          positions[i] = (Math.random() - 0.5) * 8;
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMat = new THREE.PointsMaterial({ color, size: 0.05, transparent: true, opacity: 0.8 });
        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);
        break;
      }
      case 'torusknot':
      default:
        geometry = new THREE.TorusKnotGeometry(1, 0.35, 100, 16);
        break;
    }

    let mesh: THREE.Mesh | null = null;
    if (geometryType !== 'particles') {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        metalness: 0.7,
      });
      mesh = new THREE.Mesh(geometry!, material);
      scene.add(mesh);
    }

    // 4. Resize Observer
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || 300;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 5. Animation Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (mesh) {
        mesh.rotation.x += rotationSpeed;
        mesh.rotation.y += rotationSpeed * 1.5;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      if (renderer?.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer?.dispose();
    };
  }, [geometryType, rotationSpeed, color]);

  return (
    <div
      ref={containerRef}
      id={id}
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: isEditorMode ? 'auto' : 'none',
      }}
      className={className}
      onClick={onClick}
    />
  );
}
