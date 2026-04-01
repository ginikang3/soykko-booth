"use client";

import { useRef, useState } from "react";

const frames = [
  "/frames/frame1.png",
  "/frames/frame2.png",
  "/frames/frame3.png",
];

// 📐 고정 레이아웃
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

  const shutterSound =
    typeof window !== "undefined" ? new Audio("/shutter.mp3") : null;

  // 📸 카메라 시작
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setStreaming(true);
    }
  };

  // 📸 캡쳐 (거울모드 확정)
  const capture = () => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const width = LAYOUT.w;
    const height = LAYOUT.h;

    canvas.width = width;
    canvas.height = height;

    if (!ctx) return null;

    // 🔥 거울모드 핵심
    ctx.translate(width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, 0, 0, width, height);

    return canvas.toDataURL("image/png");
  };

  // 🧠 이미지 로더 (중요: 로딩 안정화)
  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
    });

  // 🎬 자동 촬영 (연타 방지 + 5초 카운트)
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

    await renderImage(frames[0]);
  };

  // 🧠 합성 (프레임 + 사진)
  const renderImage = async (frameSrc: string, isDownload = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = isDownload ? 2 : 1;

    canvas.width = LAYOUT.canvasW * scale;
    canvas.height = LAYOUT.canvasH * scale;

    // 배경
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 사진 로딩
    const images = await Promise.all(photos.map(loadImage));

    images.forEach((img, i) => {
      ctx.drawImage(
        img,
        LAYOUT.x * scale,
        LAYOUT.yList[i] * scale,
        LAYOUT.w * scale,
        LAYOUT.h * scale
      );
    });

    // 프레임 마지막 (덮기)
    const frame = await loadImage(frameSrc);
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

    const final = canvas.toDataURL("image/png");
    setResultImage(final);
  };

  return (
    <div className="container">

      {/* 📸 CAMERA */}
      {step === "camera" && (
        <div className="cameraBox">
          <video ref={videoRef} autoPlay muted className="video" />

          {countdown !== null && (
            <div className="count">{countdown}</div>
          )}

          {flash && <div className="flash" />}

          {!streaming ? (
            <button onClick={startCamera}>카메라 시작</button>
          ) : (
            <button disabled={isShooting} onClick={startAutoShoot}>
              {isShooting ? "촬영 중..." : "시작"}
            </button>
          )}
        </div>
      )}

      {/* 🖼 PREVIEW */}
      {step === "preview" && (
        <div>
          <h2>프레임 선택</h2>

          <div className="frames">
            {frames.map((f) => (
              <img
                key={f}
                src={f}
                onClick={async () => {
                  setSelectedFrame(f);
                  await renderImage(f);
                }}
              />
            ))}
          </div>

          {resultImage && (
            <img src={resultImage} className="preview" />
          )}

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

      {/* 💾 RESULT */}
      {step === "result" && resultImage && (
        <div>
          <img src={resultImage} className="preview" />

          <a href={resultImage} download="booth.png">
            저장
          </a>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* 🎨 스타일 */}
      <style jsx>{`
        .container {
          text-align: center;
          background: #111;
          color: white;
          min-height: 100vh;
          padding: 20px;
        }

        .video {
          width: 300px;
          transform: scaleX(-1);
        }

        .count {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 80px;
          font-weight: bold;
        }

        .flash {
          position: fixed;
          inset: 0;
          background: white;
          opacity: 0.8;
        }

        .frames {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        }

        .frames img {
          width: 80px;
          cursor: pointer;
        }

        .preview {
          width: 300px;
          margin-top: 20px;
        }

        button {
          margin-top: 10px;
          padding: 10px 20px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}