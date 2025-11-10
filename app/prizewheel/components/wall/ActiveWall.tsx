'use client';

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer";

function applyBrightness(bg: string, brightness: number) {
  return {
    background: bg,
    filter: `brightness(${brightness}%)`,
    transition: "background 0.8s ease, filter 0.5s ease",
  };
}

export default function ActivePrizeWheel3D({ wheel, entries }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const currentWheelGroup = useRef<any>(null);

  const tileRefs = useRef<any[]>([]);
  const wrapperRefs = useRef<HTMLElement[]>([]);

  const winnerRef = useRef({
    winnerIndex: null,
    freezeStart: 0,
    isFrozen: false
  });

  const bgRef = useRef<string>(
    wheel?.background_type === "image"
      ? `url(${wheel.background_value}) center/cover no-repeat`
      : wheel?.background_value || "linear-gradient(135deg, #1b2735, #090a0f)"
  );

  const brightnessRef = useRef<number>(wheel?.background_brightness || 100);

  const glowColor = wheel?.tile_glow_color || "#ffffff";
  const tileA = wheel?.tile_color_a || "#ffffff";
  const tileB = wheel?.tile_color_b || "#ffffff";
  const brightA = wheel?.tile_brightness_a ?? 100;
  const brightB = wheel?.tile_brightness_b ?? 100;

  /* ---------------------------------------------------------
     ✅ NORMALIZE ENTRIES
     --------------------------------------------------------- */
  function normalizeEntries(list) {
    if (!Array.isArray(list)) return [];

    return list.map(e => {
      const photo = e.photo_url || null;

      let first = null;
      let last = null;

      if (e.first_name || e.last_name) {
        first = e.first_name || null;
        last = e.last_name || null;
      }

      if (e.guest_profiles) {
        first = e.guest_profiles.first_name || first;
        last = e.guest_profiles.last_name || last;
      }

      return {
        photo_url: photo,
        first_name: first,
        last_name: last
      };
    });
  }

  /* ---------------------------------------------------------
     ✅ ASSIGN ENTRIES TO TILES (NO REBUILD)
     --------------------------------------------------------- */
  function assignEntriesToTiles(normalized) {
    if (!normalized || normalized.length === 0) return;

    for (let i = 0; i < wrapperRefs.current.length; i++) {
      const entry = normalized[i % normalized.length];
      const wrap = wrapperRefs.current[i];

      const imgHolder = wrap.querySelector(".imgHolder");
      const nameHolder = wrap.querySelector(".nameHolder");

      if (!imgHolder || !nameHolder) continue;

      if (entry.photo_url) {
        imgHolder.style.background = `url(${entry.photo_url}) center/cover no-repeat`;
        imgHolder.innerText = "";
      }

      if (entry.first_name) {
        const ln = entry.last_name?.charAt(0)?.toUpperCase() || "";
        nameHolder.innerText = `${entry.first_name} ${ln}.`;
      }
    }
  }

  /* ---------------------- BACKGROUND WATCHER ---------------------- */
  useEffect(() => {
    if (!wheel?.id || !mountRef.current) return;

    const apply = () => {
      const container = mountRef.current?.parentElement?.parentElement;
      if (!container) return;
      Object.assign(container.style, applyBrightness(bgRef.current, brightnessRef.current));
    };

    apply();

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

      if (typeof data.background_brightness === "number")
        brightnessRef.current = data.background_brightness;

      apply();
    }, 4000);

    return () => clearInterval(interval);
  }, [wheel?.id]);

  /* ---------------------- FULLSCREEN ---------------------- */
  const toggleFullscreen = () => {
    const el = document.documentElement;
    !document.fullscreenElement ? el.requestFullscreen() : document.exitFullscreen();
  };

  /* ---------------------- CONSTANTS ---------------------- */
  const TILE_SIZE = 820;
  const TILE_COUNT = 16;
  const RADIUS = 2550;
  const TILE_STEP = (2 * Math.PI) / TILE_COUNT;

  /* ---------------------- SPIN STATE ---------------------- */
  const spinRef = useRef({
    spinning: false,
    startTime: 0,
    duration: 8000,
    startRot: 0,
    endRot: 0,
  });

  const driftRef = useRef({
    drifting: false,
    start: 0,
    duration: 850,
    from: 0,
    to: 0,
  });

  const ambientRef = useRef({ speed: 0.00065 });

  /* ===========================================================
     ✅ Freeze + Winner Highlight
     =========================================================== */
  function freezeOnWinner(tileIndex) {
    const w = winnerRef.current;
    w.winnerIndex = tileIndex;
    w.freezeStart = performance.now();
    w.isFrozen = true;

    wrapperRefs.current.forEach(w => {
      w.style.border = "none";
      w.style.animation = "none";
      w.style.boxShadow = "";
    });

    const wrapper = wrapperRefs.current[tileIndex];
    if (wrapper) {
      wrapper.style.border = "12px solid gold";
      wrapper.style.boxShadow = "0 0 70px gold";
      wrapper.style.animation = "winnerPulse 1.2s ease-in-out infinite";
    }
  }

  /* ---------------------- SUPABASE SPIN LISTENER ---------------------- */
  useEffect(() => {
    if (!wheel?.id) return;

    const channel = supabase
      .channel(`prizewheel-${wheel.id}`)
      .on("broadcast", { event: "spin_trigger" }, () => {
        (window as any)._prizewheel?._spin?.start();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [wheel?.id]);

  /* ===========================================================
     ✅ THREE.JS INIT  (RUNS ONCE)
     =========================================================== */
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    let width = container.clientWidth;
    let height = container.clientHeight;

    const scene = new THREE.Scene();
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

    function handleResize() {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      cssRenderer.setSize(w, h);
    }

    window.addEventListener("resize", handleResize);
    document.addEventListener("fullscreenchange", handleResize);

    const wheelGroup = new THREE.Group();
    currentWheelGroup.current = wheelGroup;

    tileRefs.current = [];
    wrapperRefs.current = [];
    wheelGroup.rotation.y = 0;

    scene.add(wheelGroup);

    /* --- SPIN FUNCTION --- */
    (window as any)._prizewheel = {
      _spin: {
        start: () => {
          spinRef.current.spinning = false;
          driftRef.current.drifting = false;

          const w = winnerRef.current;
          w.isFrozen = false;

          wrapperRefs.current.forEach(w => {
            w.style.border = "none";
            w.style.animation = "none";
            w.style.boxShadow = "";
          });

          w.winnerIndex = null;

          const ctrl = spinRef.current;
          ctrl.spinning = true;
          ctrl.startTime = performance.now();
          ctrl.duration = 8000 + Math.random() * 7000;
          ctrl.startRot = wheelGroup.rotation.y;

          const fullSpins = 6 + Math.random() * 4;
          let rawEnd = ctrl.startRot + Math.PI * 2 * fullSpins;

          rawEnd = Math.round(rawEnd / TILE_STEP) * TILE_STEP;
          ctrl.endRot = rawEnd;
        }
      }
    };

    /* ---------------------- TILE CREATION ---------------------- */
    for (let i = 0; i < TILE_COUNT; i++) {
      const wrapper = document.createElement("div");
      wrapper.style.width = `${TILE_SIZE}px`;
      wrapper.style.height = `${TILE_SIZE}px`;
      wrapper.style.borderRadius = "32px";
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.alignItems = "center";
      wrapper.style.justifyContent = "center";
      wrapper.style.position = "relative";
      wrapper.style.overflow = "hidden";

      const isA = i % 2 === 0;
      wrapper.style.background = isA ? tileA : tileB;
      wrapper.style.filter = `brightness(${isA ? brightA : brightB}%)`;

      const PLACEHOLDER_WIDTH = 0.70;
      const PLACEHOLDER_HEIGHT = 0.60;
      const PLACEHOLDER_TOP_OFFSET = -40;

      const NAME_FONT_SIZE = 54;
     const NAME_TOP_OFFSET = 20;

      const imgHolder = document.createElement("div");
      imgHolder.className = "imgHolder";
      imgHolder.style.position = "absolute";
      imgHolder.style.width = `${PLACEHOLDER_WIDTH * 100}%`;
      imgHolder.style.height = `${PLACEHOLDER_HEIGHT * 100}%`;
      imgHolder.style.top = `calc(50% - ${(PLACEHOLDER_HEIGHT * TILE_SIZE) / 2}px + ${PLACEHOLDER_TOP_OFFSET}px)`;
      imgHolder.style.left = "50%";
      imgHolder.style.transform = "translateX(-50%)";
      imgHolder.style.borderRadius = "22px";
      imgHolder.style.background = "rgba(0,0,0,0.25)";
      imgHolder.style.border = "4px solid rgba(255,255,255,0.5)";
      imgHolder.style.display = "flex";
      imgHolder.style.alignItems = "center";
      imgHolder.style.justifyContent = "center";
      imgHolder.style.color = "#fff";
      imgHolder.style.textShadow = "0 0 14px rgba(0,0,0,0.9)";
      imgHolder.style.fontSize = "48px";
      imgHolder.innerText = "IMG";
      wrapper.appendChild(imgHolder);

      const nameHolder = document.createElement("div");
      nameHolder.className = "nameHolder";
      nameHolder.style.position = "absolute";
      nameHolder.style.top = `calc(50% + ${(PLACEHOLDER_HEIGHT * TILE_SIZE) / 2}px + ${NAME_TOP_OFFSET}px)`;
      nameHolder.style.left = "50%";
      nameHolder.style.transform = "translateX(-50%)";
      nameHolder.style.fontSize = `${NAME_FONT_SIZE}px`;
      nameHolder.style.fontWeight = "900";
      nameHolder.style.color = "#fff";
      nameHolder.style.textShadow = "0 0 18px rgba(0,0,0,0.8)";
      nameHolder.innerText = "Name L.";
      wrapper.appendChild(nameHolder);

      const tile = new CSS3DObject(wrapper);
      const angle = i * TILE_STEP;
      tile.position.x = Math.sin(angle) * RADIUS;
      tile.position.z = Math.cos(angle) * RADIUS;
      tile.rotation.y = angle;

      tileRefs.current.push(tile);
      wrapperRefs.current.push(wrapper);
      wheelGroup.add(tile);
    }

    /* ✅ FIRST ENTRY ASSIGN */
    assignEntriesToTiles(normalizeEntries(entries));

    /* ---------------------- ANIMATION LOOP ---------------------- */
    function animate(time) {
      const spin = spinRef.current;
      const drift = driftRef.current;
      const winner = winnerRef.current;

      if (winner.isFrozen) {
        if (time - winner.freezeStart > 15000) {
          winner.isFrozen = false;
        }
      }

      if (!spin.spinning && !drift.drifting && !winner.isFrozen) {
        wheelGroup.rotation.y += ambientRef.current.speed;
      }

      if (spin.spinning) {
        const t = Math.min((time - spin.startTime) / spin.duration, 1);
        const eased = t * t * (3 - 2 * t);
        wheelGroup.rotation.y =
          spin.startRot + (spin.endRot - spin.startRot) * eased;

        if (t >= 1) {
          spin.spinning = false;

          drift.drifting = true;
          drift.start = performance.now();
          drift.from = wheelGroup.rotation.y;

          const nearest = Math.round(drift.from / TILE_STEP);
          drift.to = nearest * TILE_STEP;

          freezeOnWinner(nearest);
        }
      }

      if (drift.drifting) {
        const t = Math.min((time - drift.start) / drift.duration, 1);
        const easeOut = 1 - Math.pow(1 - t, 3);
        wheelGroup.rotation.y =
          drift.from + (drift.to - drift.from) * easeOut;

        if (t >= 1) drift.drifting = false;
      }

      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);

      requestAnimationFrame(animate);
    }

    animate(0);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("fullscreenchange", handleResize);
      container.removeChild(renderer.domElement);
      container.removeChild(cssRenderer.domElement);
      renderer.dispose();
    };
  }, []); // ✅ only once

  /* ===========================================================
     ✅ UPDATE ENTRIES (NO SNAP)
     =========================================================== */
  useEffect(() => {
    if (!wrapperRefs.current.length) return;
    const normalized = normalizeEntries(entries);
    assignEntriesToTiles(normalized);
  }, [entries]);

  /* ===========================================================
     ✅ RENDER DOM
     =========================================================== */
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>

      <style>
        {`
          @keyframes winnerPulse {
            0% { box-shadow: 0 0 40px gold; }
            50% { box-shadow: 0 0 110px gold; }
            100% { box-shadow: 0 0 40px gold; }
          }
        `}
      </style>

      <h1
        style={{
          position: "absolute",
          top: "-1vh",
          left: "50%",
          transform: "translateX(-50%)",
          color: "#ffffff",
          fontSize: "clamp(3rem,4vw,6rem)",
          fontWeight: 900,
          textShadow: "0 0 18px rgba(0,0,0,0.9)",
          zIndex: 20,
          margin: 0,
          pointerEvents: "none",
        }}
      >
        {wheel.title || "Prize Wheel"}
      </h1>

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
