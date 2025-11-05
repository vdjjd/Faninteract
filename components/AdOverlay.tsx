"use client";
import React from "react";

export default function AdOverlay({ url, type }: { url: string; type: string }) {
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
        animation: "fadeIn 0.4s ease",
      }}
    >
      {type === "image" ? (
        <img
          src={url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      ) : (
        <video
          src={url}
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
          onEnded={() => {
            // end event will be wired later
          }}
        />
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
