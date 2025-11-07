'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

/* -----------------------------------------------------------
   ✅ UTIL: GET INITIALS 
----------------------------------------------------------- */
function getInitials(name: string) {
  if (!name) return '';
  const parts = name.split(' ');
  const first = parts[0]?.[0]?.toUpperCase() || '';
  const last = parts[1]?.[0]?.toUpperCase() || '';
  return `${first}${last}`;
}

/* -----------------------------------------------------------
   ✅ ACTIVE 3D PRIZE WHEEL — PRICE IS RIGHT DRUM
----------------------------------------------------------- */
export default function ActivePrizeWheel3D({ wheel, entries }) {
  const mountRef = useRef(null);

  /* -----------------------------------------------------------
     ✅ SIZE & LAYOUT
  ----------------------------------------------------------- */
  const DRUM_WIDTH = 1400;
  const DRUM_HEIGHT = 620;
  const TILE_SIZE = 220;
  const TILE_COUNT = 16;
  const RADIUS = 680;
  const ANGLE_STEP = 360 / TILE_COUNT;

  /* -----------------------------------------------------------
     ✅ TILE COLORS (pulled from dashboard later)
  ----------------------------------------------------------- */
  const colorA = wheel?.tile_color_a || 'rgba(255,255,255,0.14)';
  const colorB = wheel?.tile_color_b || 'rgba(255,255,255,0.22)';

  const tiles = Array(TILE_COUNT)
    .fill(null)
    .map((_, i) => {
      const entry = entries?.[i] || null;
      return {
        bg: i % 2 === 0 ? colorA : colorB,
        initials: entry ? getInitials(entry.full_name) : '--',
        image: entry?.photo_url || null,
      };
    });

  /* -----------------------------------------------------------
     ✅ MAIN THREE.JS SETUP
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!mountRef.current) return;

    /* Scene + Camera */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      32,
      window.innerWidth / window.innerHeight,
      1,
      5000
    );
    camera.position.set(0, 0, 1600);

    /* WebGL Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    /* CSS3D Renderer */
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    mountRef.current.appendChild(cssRenderer.domElement);

    /* -----------------------------------------------------------
       ✅ DRUM GEOMETRY (big chrome oval)
    ----------------------------------------------------------- */
    const drumGeo = new THREE.CylinderGeometry(
      DRUM_HEIGHT / 2,
      DRUM_HEIGHT / 2,
      DRUM_WIDTH,
      64,
      1,
      true
    );

    const drumMat = new THREE.MeshPhysicalMaterial({
      metalness: 1.0,
      roughness: 0.25,
      reflectivity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      color: 0xffffff,
      side: THREE.DoubleSide,
    });

    const drumMesh = new THREE.Mesh(drumGeo, drumMat);
    drumMesh.rotation.z = Math.PI / 2;
    scene.add(drumMesh);

    /* -----------------------------------------------------------
       ✅ CREATE TILES
    ----------------------------------------------------------- */
    tiles.forEach((tile, index) => {
      const wrapper = document.createElement('div');
      wrapper.style.width = TILE_SIZE + 'px';
      wrapper.style.height = TILE_SIZE + 'px';
      wrapper.style.borderRadius = '18px';
      wrapper.style.backdropFilter = 'blur(8px)';
      wrapper.style.border = '1px solid rgba(255,255,255,0.22)';
      wrapper.style.boxShadow = '0 0 20px rgba(0,0,0,0.55)';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.background = tile.bg;

      if (tile.image) {
        const img = document.createElement('img');
        img.src = tile.image;
        img.style.width = '70px';
        img.style.height = '70px';
        img.style.borderRadius = '12px';
        img.style.objectFit = 'cover';
        img.style.marginBottom = '8px';
        wrapper.appendChild(img);
      }

      const txt = document.createElement('div');
      txt.style.fontSize = '3rem';
      txt.style.fontWeight = '900';
      txt.style.color = 'white';
      txt.style.textShadow = '0 0 12px rgba(0,0,0,0.7)';
      txt.innerText = tile.initials;
      wrapper.appendChild(txt);

      const cssObj = new CSS3DObject(wrapper);

      const angle = index * (ANGLE_STEP * (Math.PI / 180));

      cssObj.position.x = Math.sin(angle) * RADIUS;
      cssObj.position.y = 0;
      cssObj.position.z = Math.cos(angle) * RADIUS;

      cssObj.rotation.y = angle + Math.PI;
      scene.add(cssObj);
    });

    /* -----------------------------------------------------------
       ✅ SPINNING
    ----------------------------------------------------------- */
    function spinWheel() {
      const target =
        drumMesh.rotation.y + Math.PI * 8 + Math.random() * Math.PI * 2;
      const start = drumMesh.rotation.y;
      const duration = 2400;
      const startTime = performance.now();

      function animateSpin(t) {
        const p = Math.min((t - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        drumMesh.rotation.y = start + (target - start) * eased;
        requestAnimationFrame(animateSpin);
      }
      animateSpin(performance.now());
    }

    wheel?._spin?.subscribe?.(() => spinWheel());

    /* -----------------------------------------------------------
       ✅ ANIMATION LOOP
    ----------------------------------------------------------- */
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
    }
    animate();

    /* -----------------------------------------------------------
       ✅ CLEANUP
    ----------------------------------------------------------- */
    return () => {
      mountRef.current?.removeChild(renderer.domElement);
      mountRef.current?.removeChild(cssRenderer.domElement);
      renderer.dispose();
    };
  }, [entries, wheel]);

  /* -----------------------------------------------------------
     ✅ FULLSCREEN
  ----------------------------------------------------------- */
  const toggleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen();
    else document.exitFullscreen();
  };

  /* -----------------------------------------------------------
     ✅ BACKGROUND (wired from DB)
  ----------------------------------------------------------- */
  const bg =
    wheel?.background_type === 'image'
      ? `url(${wheel.background_value}) center/cover no-repeat`
      : wheel?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  /* -----------------------------------------------------------
     ✅ RENDER ROOT
  ----------------------------------------------------------- */
  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        transition: 'background 0.8s ease',
        background: bg,
      }}
    >
      {/* ✅ FULLSCREEN BUTTON */}
      <button
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          bottom: '2vh',
          right: '2vw',
          width: 48,
          height: 48,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          opacity: 0.25,
          cursor: 'pointer',
          transition: '0.25s',
          zIndex: 99,
          fontSize: '1.4rem',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.25')}
      >
        ⛶
      </button>
    </div>
  );
}
