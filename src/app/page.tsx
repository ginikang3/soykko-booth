/* eslint-disable react/no-unescaped-entities */

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";

const frames = [
  "/frames/frame1.png",
  "/frames/frame2.png",
  "/frames/frame3.png",
];

const FILTERS: Record<string, { name: string; value: string }> = {
  normal: { name: "기본", value: "none" },
  soft: { name: "뽀샤시", value: "brightness(1.15) contrast(0.95) saturate(1.2)" },
  vivid: { name: "생기", value: "contrast(1.2) saturate(1.4) brightness(1.05)" },
  cool: { name: "쿨톤", value: "contrast(1.1) brightness(1.05) hue-rotate(10deg) saturate(1.1)" },
};

const LAYOUT = {
  canvasW: 620,
  canvasH: 2100,
  x: 30,
  w: 560,
  h: 420,
  yList: [40, 480, 920, 1360],
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [step, setStep] = useState<"camera" | "preview" | "result">("camera");
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(frames[0]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [flash, setFlash] = useState(false);
  const [filter, setFilter] = useState("soft");

  const shutterSound =
    typeof window !== "undefined" ? new Audio("/shutter.mp3") : null;

  // 📷 카메라 시작
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch {
      alert("카메라를 켤 수 없습니다.");
    }
  };

  // 🔥 FIXED CAPTURE (모바일 비율 + mirror + crop)
  const capture = () => {
    if (!videoRef.current) return null;

    const video = videoRef.current;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const targetW = LAYOUT.w;
    const targetH = LAYOUT.h;

    const targetRatio = targetW / targetH;
    const videoRatio = vw / vh;

    let sx = 0,
      sy = 0,
      sw = vw,
      sh = vh;

    // cover crop (핵심)
    if (videoRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }

    canvas.width = targetW;
    canvas.height = targetH;

    // mirror 보정
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);

    return canvas.toDataURL("image/png");
  };

  // 🔥 FIXED IMAGE LOADER (SSR safe)
  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve) => {
      const img = document.createElement("img");
      img.onload = () => resolve(img);
      img.src = src;
    });

  // 🖼 최종 합성
  const renderImage = useCallback(
    async (frameSrc: string, isDownload = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scale = isDownload ? 2 : 1;

      canvas.width = LAYOUT.canvasW * scale;
      canvas.height = LAYOUT.canvasH * scale;

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const images = await Promise.all(photos.map(loadImage));

      images.forEach((img, i) => {
        ctx.filter = FILTERS[filter].value;

        ctx.drawImage(
          img,
          LAYOUT.x * scale,
          LAYOUT.yList[i] * scale,
          LAYOUT.w * scale,
          LAYOUT.h * scale
        );
      });

      ctx.filter = "none";

      const frame = await loadImage(frameSrc);
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

      setResultImage(canvas.toDataURL("image/png"));
    },
    [photos, filter]
  );

  useEffect(() => {
    if (photos.length === 4) {
      renderImage(selectedFrame);
    }
  }, [photos, selectedFrame, renderImage]);

  // 📸 자동 촬영
  const startAutoShoot = async () => {
    if (isShooting) return;

    setIsShooting(true);

    const temp: string[] = [];

    for (let i = 0; i < 4; i++) {
      for (let t = 5; t > 0; t--) {
        setCountdown(t);
        await new Promise((r) => setTimeout(r, 1000));
      }

      setCountdown(null);
      setFlash(true);
      setTimeout(() => setFlash(false), 100);

      shutterSound?.play();

      const img = capture();
      if (img) temp.push(img);

      await new Promise((r) => setTimeout(r, 500));
    }

    setPhotos(temp);
    setIsShooting(false);
    setStep("preview");
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="logo">
          SOYKKO <span>BOOTH</span>
        </h1>
      </header>

      {/* CAMERA */}
      {step === "camera" && (
        <div className="mainContent">
          <div className="cameraContainer">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="video"
            />

            {countdown !== null && (
              <div className="count">{countdown}</div>
            )}

            {flash && <div className="flash" />}
          </div>

          {!streaming ? (
            <button className="btn-main" onClick={startCamera}>
              카메라 시작
            </button>
          ) : (
            <button className="btn-main" onClick={startAutoShoot}>
              촬영 시작
            </button>
          )}
        </div>
      )}

      {/* PREVIEW */}
      {step === "preview" && (
        <div className="mainContent">
          {resultImage && (
            <Image
              src={resultImage}
              alt="result"
              width={300}
              height={500}
              unoptimized
            />
          )}

          <div className="controls">
            {Object.entries(FILTERS).map(([key, f]) => (
              <button
                key={key}
                onClick={async () => {
                  setFilter(key);
                  await renderImage(selectedFrame);
                }}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div className="frames">
            {frames.map((f) => (
              <Image
                key={f}
                src={f}
                alt="frame"
                width={60}
                height={80}
                onClick={async () => {
                  setSelectedFrame(f);
                  await renderImage(f);
                }}
              />
            ))}
          </div>

          <button
            onClick={async () => {
              await renderImage(selectedFrame, true);
              setStep("result");
            }}
          >
            다운로드
          </button>
        </div>
      )}

      {/* RESULT */}
      {step === "result" && resultImage && (
        <div className="mainContent">
          <Image
            src={resultImage}
            alt="final"
            width={300}
            height={500}
            unoptimized
          />

          <a href={resultImage} download>
            저장
          </a>

          <button onClick={() => window.location.reload()}>
            다시 촬영
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        .container {
          max-width: 480px;
          margin: 0 auto;
          background: #000;
          color: #fff;
          min-height: 100vh;
          padding: 20px;
        }

        .cameraContainer {
          width: 100%;
          aspect-ratio: 4/3;
          overflow: hidden;
          border-radius: 20px;
        }

        .video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .btn-main {
          margin-top: 20px;
          width: 100%;
          padding: 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 12px;
        }

        .count {
          position: absolute;
          font-size: 80px;
          width: 100%;
          text-align: center;
        }

        .flash {
          position: absolute;
          inset: 0;
          background: white;
        }
      `}</style>
    </div>
  );
}