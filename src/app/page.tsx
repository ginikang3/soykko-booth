"use client";

import { useRef, useState } from "react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [step, setStep] = useState<"camera" | "result">("camera");
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

  // 📸 캡쳐 (4:3 + mirror)
  const capture = () => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const width = 400;
    const height = 300;

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

    ctx?.save();
    ctx?.scale(-1, 1);
    ctx?.drawImage(video, sx, sy, sw, sh, -width, 0, width, height);
    ctx?.restore();

    return canvas.toDataURL("image/png");
  };

  // 🎬 자동 촬영
  const startAutoShoot = async () => {
    setIsShooting(true);

    const tempPhotos: string[] = [];

    for (let i = 0; i < 4; i++) {
      for (let t = 5; t > 0; t--) {
        setCountdown(t);
        await new Promise((res) => setTimeout(res, 1000));
      }

      setCountdown(null);

      setFlash(true);
      setTimeout(() => setFlash(false), 120);

      if (shutterSound) {
        shutterSound.currentTime = 0;
        shutterSound.play();
      }

      const img = capture();
      if (img) tempPhotos.push(img);

      await new Promise((res) => setTimeout(res, 600));
    }

    setIsShooting(false);
    makeStrip(tempPhotos);
  };

  // 🧠 합성 (가이드 포함)
  const makeStrip = (photoList: string[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 460;
    canvas.height = 1390;

    // 배경
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 460, 1390);

    photoList.forEach((img, i) => {
      const image = new Image();
      image.src = img;

      image.onload = () => {
        const x = 30;
        const y = 40 + i * 310;

        // 📸 사진
        ctx.drawImage(image, x, y, 400, 300);

        // 🧪 가이드 박스
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 400, 300);

        if (i === 3) {
          // 하단 영역
          ctx.fillStyle = "#f5f5f5";
          ctx.fillRect(0, 1270, 460, 120);

          ctx.fillStyle = "#333";
          ctx.font = "22px Arial";
          ctx.textAlign = "center";
          ctx.fillText("SOYKKO", 230, 1335);

          const final = canvas.toDataURL("image/png");
          setResultImage(final);
          setStep("result");
        }
      };
    });
  };

  return (
    <div className="container">
      <h1 className="title">📸 Soykko Booth</h1>

      {step === "camera" && (
        <div className="cameraBox">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="video"
          />

          {countdown && <div className="count">{countdown}</div>}
          {flash && <div className="flash" />}

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
        <div className="resultBox">
          <img src={resultImage} className="result" />

          <a href={resultImage} download="booth.png" className="download">
            다운로드
          </a>

          <button
            className="reset"
            onClick={() => {
              setResultImage(null);
              setStep("camera");
            }}
          >
            다시 찍기
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #111;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .video {
          width: 300px;
          aspect-ratio: 4/3;
          object-fit: cover;
          border-radius: 16px;
          transform: scaleX(-1);
        }

        .count {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 80px;
          font-weight: bold;
        }

        .flash {
          position: absolute;
          inset: 0;
          background: white;
          opacity: 0.8;
        }

        .btn {
          margin-top: 15px;
          padding: 12px 20px;
          border-radius: 999px;
          background: #ff3b3b;
          border: none;
          color: white;
        }

        .shoot {
          margin-top: 15px;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: white;
          color: black;
          font-weight: bold;
          border: none;
        }

        .result {
          width: 300px;
        }
      `}</style>
    </div>
  );
}