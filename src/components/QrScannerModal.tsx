"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import jsQR from "jsqr";
import { Camera, Loader2, QrCode, X } from "lucide-react";
import { normalizeCode } from "@/lib/roomService";
import { useSettings } from "@/lib/settings";
import { soundEngine } from "@/lib/sound";

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetectedCode: (code: string) => void;
}

/**
 * Extracts a 6-character Omi room code from a scanned QR payload:
 * - Full invite URL: https://omi.rashmina.dev/room/ABC123
 * - Relative path: /room/ABC123
 * - Raw 6-char code: ABC123
 */
function extractRoomCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/room\/([A-Za-z0-9]{6})(?:[/?#]|$)/i);
  if (urlMatch?.[1]) {
    return normalizeCode(urlMatch[1]);
  }

  const normalized = normalizeCode(trimmed);
  if (normalized.length === 6 && /^[A-Z0-9]{6}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

export function QrScannerModal({
  open,
  onClose,
  onDetectedCode,
}: QrScannerModalProps) {
  const { dict } = useSettings();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">(
    "starting"
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let rafId = 0;
    let lastScanTime = 0;
    detectedRef.current = false;

    const stopCamera = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
    };

    const tick = (ts: number) => {
      if (cancelled || detectedRef.current) return;

      // Decode at ~10fps to keep mobile devices cool and responsive
      if (ts - lastScanTime >= 100) {
        lastScanTime = ts;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (
          video &&
          canvas &&
          video.readyState === video.HAVE_ENOUGH_DATA &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {
          const w = Math.min(video.videoWidth, 640);
          const h = Math.round((video.videoHeight / video.videoWidth) * w);
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const qr = jsQR(imageData.data, w, h, {
              inversionAttempts: "dontInvert",
            });
            if (qr?.data) {
              const code = extractRoomCode(qr.data);
              if (code) {
                detectedRef.current = true;
                soundEngine.playTurnChime();
                stopCamera();
                onDetectedCode(code);
                return;
              } else {
                setScanError(dict.qrInvalidCode);
              }
            }
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    async function startCamera() {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setStatus("error");
        setScanError(dict.qrCameraError);
        return;
      }

      try {
        setStatus("starting");
        setScanError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 720 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stopCamera();
          return;
        }

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setStatus("scanning");
          rafId = requestAnimationFrame(tick);
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setScanError(dict.qrCameraError);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, onDetectedCode, dict.qrCameraError, dict.qrInvalidCode]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-amber-400/35 bg-[#0a1411]/98 p-5 text-white shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-400/15 border border-amber-400/35 text-amber-300">
                  <QrCode className="w-4 h-4" />
                </span>
                <h2 className="text-base font-extrabold text-amber-200">
                  {dict.qrScannerTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition"
                aria-label={dict.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Camera Viewfinder */}
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/15 bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  status === "scanning" ? "opacity-100" : "opacity-0"
                }`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {status === "starting" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-amber-200">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span className="text-xs font-semibold">
                    Starting camera...
                  </span>
                </div>
              ) : null}

              {status === "error" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-5 text-center text-rose-200">
                  <Camera className="w-8 h-8 text-rose-400" />
                  <p className="text-xs leading-relaxed">{scanError}</p>
                </div>
              ) : null}

              {/* Reticle Corner Guides */}
              {status === "scanning" ? (
                <div className="pointer-events-none absolute inset-8">
                  <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
                  <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
                  <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
                  <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />
                  <motion.div
                    animate={{ y: ["0%", "100%", "0%"] }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-x-1 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                  />
                </div>
              ) : null}
            </div>

            {scanError && status === "scanning" ? (
              <p className="text-center text-xs font-semibold text-rose-300">
                {scanError}
              </p>
            ) : (
              <p className="text-center text-xs text-white/65">
                {dict.qrScannerHint}
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-white/15 bg-white/[0.07] hover:bg-white/15 py-2.5 text-sm font-bold text-white transition"
            >
              {dict.close}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
