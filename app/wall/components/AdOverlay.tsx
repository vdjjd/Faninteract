"use client";
import React, { useEffect, useRef } from "react";

export default function AdOverlay({
  url,
  type,
  onFinished,
}: {
  url: string;
  type: "image" | "video";
  onFinished?: () => void;
}) {
  const vidRef = useRef<HTMLVideoElement>(null);

  // Restart video when URL changes
  useEffect(() => {
    if (type === "video" && vidRef.current) {
      vidRef.current.currentTime = 0;
      vidRef.current.play().catch(() => {});
    }
  }, [url, type]);

  // Auto-finish images (default = 8s)
  useEffect(() => {
    if (type === "image") {
      const timeout = setTimeout(() => {
        onFinished?.();
      }, 8000); // matches default ad duration

      return () => clearTimeout(timeout);
    }
  }, [url, type, onFinished]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 999,
        background: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.4s ease, fadeOut 0.4s ease 7.6s", // fade out before end
      }}
    >
      {type === "image" ? (
        <img
          src={url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover", // ✅ No black bars
          }}
        />
      ) : (
        <video
          ref={vidRef}
          src={url}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover", // ✅ No letterboxing
          }}
          onEnded={() => onFinished?.()}
        />
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

