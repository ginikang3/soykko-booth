"use client";

import { useRef, useState, useEffect } from "react";

const frames = [
  "/frames/frame1.png",
  "/frames/frame2.png",
  "/frames/frame3.png",
];

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

  // 📸 캡쳐
  const capture = () => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const width = 360;
    const height = 270;

    canvas.width = width;
    canvas.height = height;

    ctx?.save();
    ctx?.scale(-1, 1);
    ctx?.drawImage(video, 0, 0, width, height, -width, 0, width, height);
    ctx?.restore();

    return canvas.toDataURL("image/png");
  };

  // 🎬 촬영
  const startAutoShoot = async () => {
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

    // 기본 프레임으로 자동 미리보기 생성
    setTimeout(() => renderImage(frames[0]), 100);
  };

  // 🧠 이미지 합성
  const renderImage = (frameSrc: string, isDownload = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = isDownload ? 2 : 1;

    canvas.width = 400 * scale;
    canvas.height = 1200 * scale;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let loaded = 0;

    photos.forEach((img, i) => {
      const image = new Image();
      image.src = img;

      image.onload = () => {
        ctx.drawImage(
          image,
          20 * scale,
          (40 + i * 290) * scale,
          360 * scale,
          270 * scale
        );

        loaded++;

        if (loaded === 4) {
          const frame = new Image();
          frame.src = frameSrc;

          frame.onload = () => {
            ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

            const final = canvas.toDataURL("image/png");
            setResultImage(final);
          };
        }
      };
    });
  };

  // 🔗 공유 기능
  const copyLink = async () => {
    if (!resultImage) return;
    await navigator.clipboard.writeText(resultImage);
    alert("링크 복사 완료!");
  };

  const shareWhatsApp = () => {
    if (!resultImage) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(resultImage)}`);
  };

  const shareFacebook = () => {
    if (!resultImage) return;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        resultImage
      )}`
    );
  };

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">📸 Soykko Booth</h1>

        {step === "camera" && (
          <>
            <video ref={videoRef} autoPlay muted className="video" />

            {countdown && <div className="count">{countdown}</div>}
            {flash && <div className="flash" />}

            {!streaming ? (
              <button className="btn" onClick={startCamera}>
                카메라 시작
              </button>
            ) : (
              <button className="shoot" onClick={startAutoShoot}>
                시작
              </button>
            )}
          </>
        )}

        {step === "preview" && (
          <>
            <h2>프레임 선택</h2>

            <div className="frames">
              {frames.map((f) => (
                <img
                  key={f}
                  src={f}
                  className={`thumb ${
                    selectedFrame === f ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedFrame(f);
                    renderImage(f);
                  }}
                />
              ))}
            </div>

            {resultImage && (
              <img src={resultImage} className="preview" />
            )}

            <button
              className="btn"
              onClick={() => {
                renderImage(selectedFrame, true);
                setStep("result");
              }}
            >
              다음 →
            </button>
          </>
        )}

        {step === "result" && resultImage && (
          <>
            <img src={resultImage} className="preview" />

            <div className="shareBox">
              <button onClick={copyLink}>링크 복사</button>
              <button onClick={shareWhatsApp}>WhatsApp</button>
              <button onClick={shareFacebook}>Facebook</button>
            </div>

            <a href={resultImage} download="booth.png" className="download">
              📥 사진 저장
            </a>
          </>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        .container {
          background: linear-gradient(135deg, #ffdee9, #b5fffc);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .card {
          background: white;
          padding: 20px;
          border-radius: 20px;
          text-align: center;
          animation: up 0.6s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        @keyframes up {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .video {
          width: 300px;
          border-radius: 16px;
          transform: scaleX(-1);
        }

        .count {
          position: absolute;
          font-size: 80px;
          color: white;
        }

        .flash {
          position: fixed;
          inset: 0;
          background: white;
          opacity: 0.7;
        }

        .btn {
          margin-top: 15px;
          padding: 12px 20px;
          border-radius: 999px;
          background: #ff6b6b;
          border: none;
          color: white;
          font-weight: bold;
        }

        .shoot {
          margin-top: 15px;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: #ff6b6b;
          color: white;
          border: none;
        }

        .frames {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin: 10px 0;
        }

        .thumb {
          width: 70px;
          border-radius: 10px;
          cursor: pointer;
          border: 2px solid transparent;
        }

        .thumb.active {
          border: 2px solid #ff6b6b;
        }

        .preview {
          width: 250px;
          margin-top: 10px;
          border-radius: 12px;
        }

        .shareBox {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 10px;
        }

        .shareBox button {
          border: none;
          padding: 8px 12px;
          border-radius: 10px;
          background: #eee;
        }

        .download {
          display: block;
          margin-top: 15px;
          padding: 12px;
          background: #22c55e;
          color: white;
          border-radius: 999px;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}