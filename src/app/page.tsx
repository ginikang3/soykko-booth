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

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const soundRef = useRef<HTMLAudioElement | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [step, setStep] = useState<"camera" | "preview" | "result">("camera");

  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(frames[0]);
  const [filter, setFilter] = useState("soft");

  const [resultImage, setResultImage] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [isShooting, setIsShooting] = useState(false);

  // 🎥 camera start
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStreaming(true);
    }

    const audio = new Audio("/shutter.mp3");
    audio.preload = "auto";
    soundRef.current = audio;
  };

  // 🔊 sound
  const playSound = () => {
    soundRef.current?.play().catch(() => {});
  };

  // 📸 IMPORTANT: 비율 그대로 캡처 (정사각형 제거)
  const capture = () => {
    const video = videoRef.current;
    if (!video) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = vw;
    canvas.height = vh;

    // mirror
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);

    ctx.filter = FILTERS[filter].value;

    ctx.drawImage(video, 0, 0, vw, vh);

    return canvas.toDataURL("image/png");
  };

  // 🖼 image loader (safe)
  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve) => {
      const img = new window.Image();
      img.src = src;
      img.onload = () => resolve(img);
    });

  // 📦 cover draw (frame용)
  const drawCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const ir = img.width / img.height;
    const cr = w / h;

    let sx = 0,
      sy = 0,
      sw = img.width,
      sh = img.height;

    if (ir > cr) {
      sw = img.height * cr;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / cr;
      sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  // 🎨 render preview + result
  const renderImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgs = await Promise.all(photos.map(loadImage));

    // 👉 전체 canvas를 "첫 이미지 비율" 기준으로 맞춤
    const base = imgs[0];
    const ratio = base.width / base.height;

    canvas.width = 800;
    canvas.height = 800 / ratio;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const slotH = canvas.height / 4;

    imgs.forEach((img, i) => {
      ctx.filter = FILTERS[filter].value;
      drawCover(ctx, img, 0, i * slotH, canvas.width, slotH);
    });

    ctx.filter = "none";

    const frame = await loadImage(selectedFrame);
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

    setResultImage(canvas.toDataURL("image/png"));
  }, [photos, filter, selectedFrame]);

  // 🔁 preview auto render
  useEffect(() => {
    if (step === "preview" && photos.length > 0) {
      renderImage();
    }
  }, [step, photos, filter, selectedFrame]);

  // 📸 shoot loop
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
      setTimeout(() => setFlash(false), 80);

      playSound();

      const img = capture();
      if (img) temp.push(img);

      await new Promise((r) => setTimeout(r, 200));
    }

    setPhotos(temp);
    setIsShooting(false);
    setStep("preview");
  };

  // 📤 share
  const shareImage = async () => {
    if (!resultImage) return;

    const blob = await (await fetch(resultImage)).blob();
    const file = new File([blob], "booth.png", { type: "image/png" });

    if (navigator.share) {
      await navigator.share({
        files: [file],
        title: "Photo Booth",
      });
    }
  };

  // ⬇ download
  const downloadImage = () => {
    if (!resultImage) return;

    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "booth.png";
    a.click();
  };

  return (
    <div style={{ textAlign: "center" }}>
      {/* CAMERA */}
      {step === "camera" && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              transform: "scaleX(-1)",
            }}
          />

          {!streaming ? (
            <button onClick={startCamera}>카메라 시작</button>
          ) : (
            <button onClick={startAutoShoot}>촬영 시작</button>
          )}

          {countdown !== null && <h1>{countdown}</h1>}

          {flash && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "white",
                zIndex: 9999,
              }}
            />
          )}
        </>
      )}

      {/* PREVIEW */}
      {step === "preview" && (
        <div>
          <div>
            {photos.map((p, i) => (
              <img key={i} src={p} style={{ width: 80 }} />
            ))}
          </div>

          <div>
            {frames.map((f) => (
              <button key={f} onClick={() => setSelectedFrame(f)}>
                frame
              </button>
            ))}
          </div>

          <div>
            {Object.entries(FILTERS).map(([k, v]) => (
              <button key={k} onClick={() => setFilter(k)}>
                {v.name}
              </button>
            ))}
          </div>

          <button onClick={() => setStep("result")}>결과 보기</button>
        </div>
      )}

      {/* RESULT */}
      {step === "result" && (
        <div>
          {resultImage && (
            <Image
              src={resultImage}
              alt="result"
              width={300}
              height={300}
              unoptimized
            />
          )}

          <button onClick={downloadImage}>다운로드</button>
          <button onClick={shareImage}>공유</button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}