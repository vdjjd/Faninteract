"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect } from "react";
import { cn } from "../lib/utils";

interface ModalProps extends React.PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  size?: "default" | "xl";
}

export default function Modal({
  isOpen,
  onClose,
  children,
  size = "default",
}: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const isXL = size === "xl";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onClose}
        >
          {/* 🧩 MODAL BODY — removed scale animation to stop flicker */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "relative border border-blue-900/40 shadow-md rounded-2xl",
              isXL
                ? "w-[95vw] h-[90vh] bg-[#0b0b0d] p-6"
                : "w-full max-w-md p-8 bg-[linear-gradient(135deg,#0a2540,#1b2b44,#000000)]"
            )}
          >
            <button
              onClick={onClose}
              className={cn(
                "absolute top-3 right-3 text-gray-400 hover:text-white text-2xl leading-none"
              )}
            >
              ×
            </button>

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
