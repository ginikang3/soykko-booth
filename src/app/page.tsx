"use client";

import { useRef, useState } from "react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [step, setStep] = useState<"camera" | "result">("camera");
  const [resultImage, setResultImage] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);

  // 카메라 시작
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

  // 📸 실제 촬영 (크롭 포함)
  const capture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const width = 300;
    const height = 400;

    canvas.width = width;
    canvas.height = height;

    const videoRatio = video.videoWidth / video.videoHeight;
    const canvasRatio = width / height;

    let sx, sy, sw, sh;

    if (videoRatio > canvasRatio) {
      sh = video.videoHeight;
      sw = sh * canvasRatio;
      sx = (video.videoWidth - sw) / 2;
      sy = 0;
    } else {
      sw = video.videoWidth;
      sh = sw / canvasRatio;
      sx = 0;
      sy = (video.videoHeight - sh) / 2;
    }

    ctx?.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);

    return canvas.toDataURL("image/png");
  };

  // 🎬 자동 촬영 시작
  const startAutoShoot = async () => {
    setPhotos([]);
    setIsShooting(true);

    for (let i = 0; i < 4; i++) {
      // 카운트다운
      for (let t = 5; t > 0; t--) {
        setCountdown(t);
        await new Promise((res) => setTimeout(res, 1000));
      }

      setCountdown(null);

      const img = capture();
      if (img) {
        setPhotos((prev) => [...prev, img]);
      }

      // 촬영 텀
      await new Promise((res) => setTimeout(res, 500));
    }

    setIsShooting(false);
    makeStrip();
  };

  // 🧠 합성
  const makeStrip = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 1200;

    photos.forEach((img, i) => {
      const image = new Image();
      image.src = img;

      image.onload = () => {
        ctx.drawImage(image, 0, i * 300, 300, 300);

        if (i === 3) {
          const final = canvas.toDataURL("image/png");
          setResultImage(final);
          setStep("result");
        }
      };
    });
  };

  return (
    <div className="container">
      <h1>📸 Soykko Booth</h1>

      {step === "camera" && (
        <div className="cameraBox">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="video"
          />

          {/* 카운트다운 표시 */}
          {countdown && <div className="count">{countdown}</div>}

          {!streaming ? (
            <button className="btn" onClick={startCamera}>
              카메라 시작
            </button>
          ) : !isShooting ? (
            <button className="shoot" onClick={startAutoShoot}>
              시작!
            </button>
          ) : (
            <p>촬영 중...</p>
          )}
        </div>
      )}

      {step === "result" && resultImage && (
        <div>
          <img src={resultImage} className="result" />
          <a href={resultImage} download className="btn">
            다운로드
          </a>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        .container {
          background: #111;
          color: white;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .video {
          width: 300px;
          aspect-ratio: 3/4;
          object-fit: cover;
          border-radius: 16px;
        }

        .cameraBox {
          position: relative;
        }

        .count {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 80px;
          font-weight: bold;
        }

        .btn, .shoot {
          margin-top: 20px;
          padding: 12px 20px;
          border-radius: 999px;
          background: #ff3b3b;
          border: none;
          color: white;
        }

        .result {
          width: 300px;
        }
      `}</style>
    </div>
  );
}