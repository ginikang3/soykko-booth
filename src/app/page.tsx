"use client";

import { useRef, useState } from "react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [step, setStep] = useState<"camera" | "preview" | "result">("camera");
  const [resultImage, setResultImage] = useState<string | null>(null);

  // ✅ 카메라 시작
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
      },
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setStreaming(true);
    }
  };

  // ✅ 핵심: 크롭 캡쳐 (모바일 문제 해결)
  const takePhoto = () => {
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

    const imageData = canvas.toDataURL("image/png");

    setPhotos((prev) => {
      const updated = [...prev, imageData];
      if (updated.length === 4) setStep("preview");
      return updated;
    });
  };

  // ✅ 4컷 합성
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
      <h1 className="title">📸 Soykko Booth</h1>

      {/* CAMERA */}
      {step === "camera" && (
        <div className="cameraBox">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="video"
          />

          {!streaming ? (
            <button className="mainBtn" onClick={startCamera}>
              카메라 시작
            </button>
          ) : (
            <button className="shootBtn" onClick={takePhoto}>
              ● ({photos.length}/4)
            </button>
          )}
        </div>
      )}

      {/* PREVIEW */}
      {step === "preview" && (
        <div className="centerBox">
          <h2>✨ 사진 생성</h2>
          <button className="mainBtn" onClick={makeStrip}>
            합성하기
          </button>
        </div>
      )}

      {/* RESULT */}
      {step === "result" && resultImage && (
        <div className="centerBox">
          <img src={resultImage} className="resultImg" />

          <a href={resultImage} download="booth.png" className="downloadBtn">
            다운로드
          </a>

          <button
            className="resetBtn"
            onClick={() => {
              setPhotos([]);
              setResultImage(null);
              setStep("camera");
            }}
          >
            다시 찍기
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* 스타일 */}
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

        .title {
          margin-bottom: 20px;
        }

        .cameraBox {
          position: relative;
        }

        .video {
          width: 300px;
          aspect-ratio: 3/4;
          object-fit: cover;
          border-radius: 16px;
          border: 3px solid white;
        }

        .mainBtn {
          margin-top: 15px;
          padding: 12px 20px;
          border-radius: 999px;
          border: none;
          background: #ff3b3b;
          color: white;
          font-weight: bold;
        }

        .shootBtn {
          position: absolute;
          bottom: -70px;
          left: 50%;
          transform: translateX(-50%);
          width: 70px;
          height: 70px;
          border-radius: 50%;
          border: none;
          background: white;
          color: black;
          font-size: 14px;
          font-weight: bold;
        }

        .centerBox {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .resultImg {
          width: 300px;
          border-radius: 12px;
        }

        .downloadBtn {
          padding: 10px 20px;
          background: #22c55e;
          border-radius: 999px;
          color: white;
          text-decoration: none;
        }

        .resetBtn {
          background: #444;
          padding: 10px 20px;
          border-radius: 999px;
          color: white;
          border: none;
        }
      `}</style>
    </div>
  );
}