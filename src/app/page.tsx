"use client";

import { useRef, useState, useEffect, useCallback } from "react";

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [step, setStep] = useState<"camera" | "preview" | "result">("camera");

  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(frames[0]);
  const [filter, setFilter] = useState("soft");

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [flash, setFlash] = useState(false);

  // ✅ SSR safe audio init
  useEffect(() => {
    audioRef.current = new Audio("/shutter.mp3");
  }, []);

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

  // 📸 capture (safe + mirror + filter)
  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const targetW = LAYOUT.w;
    const targetH = LAYOUT.h;

    const targetRatio = targetW / targetH;
    const videoRatio = vw / vh;

    let sx = 0, sy = 0, sw = vw, sh = vh;

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

    ctx.filter = FILTERS[filter].value;

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);

    ctx.filter = "none";

    return canvas.toDataURL("image/png");
  };

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve) => {
      const img = new window.Image();
      img.src = src;
      img.onload = () => resolve(img);
    });

  // ⚠️ 안정화 핵심: state set 제거 후 callback only
  const renderImage = useCallback(
    async (frameSrc: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = LAYOUT.canvasW;
      canvas.height = LAYOUT.canvasH;

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const images = await Promise.all(photos.map(loadImage));

      images.forEach((img, i) => {
        ctx.filter = FILTERS[filter].value;

        ctx.drawImage(
          img,
          LAYOUT.x,
          LAYOUT.yList[i],
          LAYOUT.w,
          LAYOUT.h
        );
      });

      ctx.filter = "none";

      const frame = await loadImage(frameSrc);
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

      setResultImage(canvas.toDataURL("image/png"));
    },
    [photos, filter]
  );

  // ✅ safe effect (deps 최소화)
  useEffect(() => {
    if (step === "preview" && photos.length === 4) {
      renderImage(selectedFrame);
    }
  }, [step, photos]);

  const startAutoShoot = async () => {
    if (isShooting) return;

    setIsShooting(true);
    const temp: string[] = [];

    for (let i = 0; i < 4; i++) {
      for (let t = 3; t > 0; t--) {
        setCountdown(t);
        await new Promise((r) => setTimeout(r, 1000));
      }

      setCountdown(null);

      setFlash(true);
      setTimeout(() => setFlash(false), 100);

      audioRef.current?.play().catch(() => {});

      const img = capture();
      if (img) temp.push(img);

      await new Promise((r) => setTimeout(r, 300));
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
        <p className="subtitle">Life's Best 4 Cuts</p>
      </header>

      {/* CAMERA */}
      {step === "camera" && (
        <div>
          <div className="cameraBox">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="video"
            />
            {countdown !== null && (
              <div className="count-overlay">{countdown}</div>
            )}
            {flash && <div className="flash-white" />}
          </div>

          <button onClick={startCamera}>카메라 시작</button>
          <button onClick={startAutoShoot} disabled={isShooting}>
            촬영
          </button>
        </div>
      )}

      {/* PREVIEW */}
      {step === "preview" && (
        <div>
          {photos.map((p, i) => (
            <img key={i} src={p} width={80} />
          ))}

          {frames.map((f) => (
            <button key={f} onClick={() => setSelectedFrame(f)}>
              frame
            </button>
          ))}

          {Object.entries(FILTERS).map(([k]) => (
            <button
              key={k}
              onClick={() => {
                setFilter(k);
                renderImage(selectedFrame);
              }}
            >
              {k}
            </button>
          ))}

          <button
            onClick={() => {
              renderImage(selectedFrame);
              setStep("result");
            }}
          >
            결과 보기
          </button>
        </div>
      )}

      {/* RESULT */}
      {step === "result" && resultImage && (
        <div>
          <img src={resultImage} width={300} alt="result" />

          <a href={resultImage} download>
            다운로드
          </a>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}