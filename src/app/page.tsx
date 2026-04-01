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
  cool: { name: "쿨톤", value: "contrast(1.1) brightness(1.05) saturate(1.1)" },
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
  const soundRef = useRef<HTMLAudioElement | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [step, setStep] = useState<"camera" | "preview" | "result">("camera");
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(frames[0]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [flash, setFlash] = useState(false);
  const [filter, setFilter] = useState("soft");

  useEffect(() => {
    soundRef.current = new Audio("/shutter.mp3");
    soundRef.current.preload = "auto";
  }, []);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStreaming(true);
    }
  };

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

    if (videoRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }

    canvas.width = targetW;
    canvas.height = targetH;

    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);

    return canvas.toDataURL("image/png");
  };

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve) => {
      const img = document.createElement("img");
      img.onload = () => resolve(img);
      img.src = src;
    });

  const renderImage = useCallback(
    async (frameSrc: string, download = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scale = download ? 2 : 1;

      canvas.width = LAYOUT.canvasW * scale;
      canvas.height = LAYOUT.canvasH * scale;

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const imgs = await Promise.all(photos.map(loadImage));

      imgs.forEach((img, i) => {
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

      soundRef.current?.pause();
      if (soundRef.current) {
        soundRef.current.currentTime = 0;
        soundRef.current.play().catch(() => {});
      }

      const img = capture();
      if (img) temp.push(img);

      await new Promise((r) => setTimeout(r, 500));
    }

    setPhotos(temp);
    setIsShooting(false);
    setStep("preview");
  };

  const shareImage = async () => {
    if (!resultImage) return;

    const blob = await (await fetch(resultImage)).blob();
    const file = new File([blob], "booth.png", { type: "image/png" });

    if (navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: "BOOTH",
          text: "ㅋㅋ",
        });
      } catch {}
    } else {
      alert("공유 지원 안됨");
    }
  };

  return (
    <div className="container">
      <video ref={videoRef} autoPlay muted playsInline className="video" />

      {step === "camera" && (
        <div>
          {!streaming ? (
            <button onClick={startCamera}>카메라 시작</button>
          ) : (
            <button onClick={startAutoShoot}>촬영 시작</button>
          )}

          {countdown !== null && <h1>{countdown}</h1>}
          {flash && <div className="flash" />}
        </div>
      )}

      {step === "preview" && (
        <div>
          {resultImage && (
            <Image
              src={resultImage}
              alt=""
              width={300}
              height={500}
              unoptimized
            />
          )}

          <div>
            {Object.entries(FILTERS).map(([k, v]) => (
              <button
                key={k}
                onClick={async () => {
                  setFilter(k);
                  await renderImage(selectedFrame);
                }}
              >
                {v.name}
              </button>
            ))}
          </div>

          <div>
            {frames.map((f) => (
              <Image
                key={f}
                src={f}
                alt=""
                width={50}
                height={70}
                onClick={async () => {
                  setSelectedFrame(f);
                  await renderImage(f);
                }}
              />
            ))}
          </div>

          <button onClick={shareImage}>공유</button>

          <button
            onClick={async () => {
              await renderImage(selectedFrame, true);
              setStep("result");
            }}
          >
            저장
          </button>
        </div>
      )}

      {step === "result" && resultImage && (
        <div>
          <Image
            src={resultImage}
            alt=""
            width={300}
            height={500}
            unoptimized
          />

          <a href={resultImage} download>
            다운로드
          </a>

          <button onClick={() => window.location.reload()}>
            다시
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        .video {
          width: 100%;
          transform: scaleX(-1);
        }

        .flash {
          position: fixed;
          inset: 0;
          background: white;
        }
      `}</style>
    </div>
  );
}