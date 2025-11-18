'use client';

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer";

/* ----------------------------------------------------------- */
/* ✅ Background brightness helper                              */
/* ----------------------------------------------------------- */
function applyBrightness(bg: string, brightness: number) {
  return {
    background: bg,
    filter: `brightness(${brightness}%)`,
    transition: "background 0.8s ease, filter 0.5s ease",
  };
}

export default function ActivePrizeWheel3D({ wheel, entries }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  /* ----------------------------------------------------------- */
  /* ✅ BACKGROUND + BRIGHTNESS                                  */
  /* ----------------------------------------------------------- */
  const bgRef = useRef<string>(
    wheel?.background_type === "image"
      ? `url(${wheel.background_value}) center/cover no-repeat`
      : wheel?.background_value || "linear-gradient(135deg, #1b2735, #090a0f)"
  );

  const brightnessRef = useRef<number>(
    wheel?.background_brightness ?? 100
  );

  /* ----------------------------------------------------------- */
  /* ✅ TILE COLORS (static — selected BEFORE launch)            */
  /* ----------------------------------------------------------- */
  const tileGlowColor = wheel?.tile_glow_color || "#ffffff";
  const tileColorA = wheel?.tile_color_a || "#ffffff";
  const tileColorB = wheel?.tile_color_b || "#ffffff";

  const tileBrightA = wheel?.tile_brightness_a ?? 100;
  const tileBrightB = wheel?.tile_brightness_b ?? 100;

  /* ----------------------------------------------------------- */
  /* ✅ POLLING — ONLY BACKGROUND VALUES                         */
  /* ----------------------------------------------------------- */
  useEffect(() => {
    if (!wheel?.id || !mountRef.current) return;

    const updateStyles = () => {
      const container = mountRef.current?.parentElement?.parentElement;
      if (!container) return;

      Object.assign(
        container.style,
        applyBrightness(bgRef.current, brightnessRef.current)
      );
    };

    updateStyles();

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("prize_wheels")
        .select("*")
        .eq("id", wheel.id)
        .single();

      if (!data) return;

      bgRef.current =
        data.background_type === "image"
          ? `url(${data.background_value}) center/cover no-repeat`
          : data.background_value;

      if (typeof data.background_brightness === "number") {
        brightnessRef.current = data.background_brightness;
      }

      updateStyles();
    }, 4000);

    return () => clearInterval(interval);
  }, [wheel?.id]);

  /* ----------------------------------------------------------- */
  /* ✅ FULLSCREEN */
  /* ----------------------------------------------------------- */
  const toggleFullscreen = () => {
    const el = document.documentElement;
    !document.fullscreenElement
      ? el.requestFullscreen()
      : document.exitFullscreen();
  };

  /* ----------------------------------------------------------- */
  /* ✅ CONSTANTS */
  /* ----------------------------------------------------------- */
  const TILE_SIZE = 820;
  const TILE_COUNT = 16;
  const RADIUS = 2550;
  const AMBIENT_SPEED = 0.0015;

  const spinRef = useRef({
    spinning: false,
    startTime: 0,
    duration: 8000,
    startRot: 0,
    endRot: 0,
  });

  /* ----------------------------------------------------------- */
  /* ✅ 3D SCENE SETUP */
  /* ----------------------------------------------------------- */
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const scene = new THREE.Scene();

    let width = container.clientWidth;
    let height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(38, width / height, 1, 8000);
    camera.position.set(0, 0, 3800);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(width, height);
    cssRenderer.domElement.style.position = "absolute";
    cssRenderer.domElement.style.top = "0";
    cssRenderer.domElement.style.left = "0";
    container.appendChild(cssRenderer.domElement);

    /* Resize / Fullscreen */
    function handleResize() {
      if (!mountRef.current) return;
      width = mountRef.current.clientWidth;
      height = mountRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      cssRenderer.setSize(width, height);
    }

    window.addEventListener("resize", handleResize);
    document.addEventListener("fullscreenchange", handleResize);

    /* ----------------------------------------------------------- */
    /* ✅ Wheel group */
    /* ----------------------------------------------------------- */
    const wheelGroup = new THREE.Group();
    scene.add(wheelGroup);

    /* ----------------------------------------------------------- */
    /* ✅ GLOW RING — now uses tileGlowColor */
    /* ----------------------------------------------------------- */
    const glowGeom = new THREE.RingGeometry(RADIUS * 0.93, RADIUS * 1.05, 128);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(tileGlowColor),
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const glowRing = new THREE.Mesh(glowGeom, glowMat);
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = -1;
    scene.add(glowRing);

    /* ----------------------------------------------------------- */
    /* ✅ TILES */
    /* ----------------------------------------------------------- */
    const safeEntries = Array.isArray(entries) ? entries : [];
    const angleStep = (2 * Math.PI) / TILE_COUNT;

    for (let i = 0; i < TILE_COUNT; i++) {
      const entry = safeEntries[i] || null;

      const wrapper = document.createElement("div");
      wrapper.style.width = `${TILE_SIZE}px`;
      wrapper.style.height = `${TILE_SIZE}px`;

      /* ✅ Alternate card A/B colors */
      const isA = i % 2 === 0;
      const cardColor = isA ? tileColorA : tileColorB;
      const cardBrightness = isA ? tileBrightA : tileBrightB;

      wrapper.style.background = cardColor;
      wrapper.style.filter = `brightness(${cardBrightness}%)`;

      wrapper.style.borderRadius = "32px";
      wrapper.style.border = "4px solid rgba(255,255,255,0.2)";
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.justifyContent = "center";

      /* ✅ Glow halo */
      wrapper.style.boxShadow = `0 0 60px ${tileGlowColor}55`;

      /* ✅ CONTENT */
      if (entry?.photo_url) {
        const img = document.createElement("img");
        img.src = entry.photo_url;
        img.style.width = "88%";
        img.style.height = "88%";
        img.style.objectFit = "cover";
        img.style.borderRadius = "28px";
        wrapper.appendChild(img);
      } else {
        const initials =
          entry?.full_name
            ?.split(" ")
            .map((c) => c[0])
            .join("")
            .toUpperCase() || "--";

        const txt = document.createElement("div");
        txt.innerText = initials;
        txt.style.fontSize = "130px";
        txt.style.fontWeight = "900";
        txt.style.color = "#fff";
        wrapper.appendChild(txt);
      }

      /* Position */
      const cssObj = new CSS3DObject(wrapper);
      const angle = i * angleStep;

      cssObj.position.x = Math.sin(angle) * RADIUS;
      cssObj.position.z = Math.cos(angle) * RADIUS;
      cssObj.rotation.y = angle + Math.PI;

      wheelGroup.add(cssObj);
    }

    /* ----------------------------------------------------------- */
    /* ✅ Spin logic */
    /* ----------------------------------------------------------- */
    function startSpin() {
      const s = spinRef.current;
      s.spinning = true;
      s.startTime = performance.now();
      s.duration = (wheel?.spin_duration || 6) * 1000;
      s.startRot = wheelGroup.rotation.y;

      /* 6–10 rotations */
      s.endRot = s.startRot + Math.PI * (6 + Math.random() * 4);
    }

    /* expose control */
    (wheel as any)._spin = { start: startSpin };

    /* ----------------------------------------------------------- */
    /* ✅ Animation loop */
    /* ----------------------------------------------------------- */
    function animate(time) {
      const s = spinRef.current;

      if (s.spinning) {
        const progress = Math.min((time - s.startTime) / s.duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        wheelGroup.rotation.y = s.startRot + (s.endRot - s.startRot) * eased;

        if (progress >= 1) s.spinning = false;
      } else {
        wheelGroup.rotation.y += AMBIENT_SPEED;
      }

      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate(0);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("fullscreenchange", handleResize);

      renderer.dispose();
      container.innerHTML = "";
    };
  }, []);

  /* ----------------------------------------------------------- */
  /* ✅ UI Container */
  /* ----------------------------------------------------------- */
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: "10vh",
          left: "50%",
          transform: "translateX(-50%)",
          width: "90vw",
          height: "78vh",
          padding: 6,
          borderRadius: 24,
          backdropFilter: "blur(20px)",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 0 40px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      </div>

      <button
        onClick={toggleFullscreen}
        style={{
          position: "absolute",
          bottom: "2vh",
          right: "2vw",
          width: 48,
          height: 48,
          borderRadius: 10,
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "#fff",
          opacity: 0.25,
          cursor: "pointer",
          transition: "0.25s",
          fontSize: "1.4rem",
          zIndex: 99,
        }}
      >
        ⛶
      </button>
    </div>
  );
}
