"use client";

import { useRef, useState } from "react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [step, setStep] = useState<"camera" | "preview" | "result">("camera");
  const [resultImage, setResultImage] = useState<string | null>(null);

  // 1. 카메라 시작
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

  // 2. 사진 찍기 (4장)
  const takePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = 300;
    canvas.height = 400;

    context?.drawImage(videoRef.current, 0, 0, 300, 400);

    const imageData = canvas.toDataURL("image/png");

    setPhotos((prev) => {
      const updated = [...prev, imageData];
      if (updated.length === 4) {
        setStep("preview");
      }
      return updated;
    });
  };

  // 3. 4컷 합성
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
    <div style={{ textAlign: "center", padding: 20 }}>
      <h1>📸 Soykko Booth</h1>

      {/* CAMERA STEP */}
      {step === "camera" && (
        <div>
          <video ref={videoRef} style={{ width: 300, borderRadius: 10 }} />
          <br />

          {!streaming ? (
            <button onClick={startCamera}>카메라 시작</button>
          ) : (
            <button onClick={takePhoto}>
              촬영 ({photos.length}/4)
            </button>
          )}
        </div>
      )}

      {/* PREVIEW STEP */}
      {step === "preview" && (
        <div>
          <h2>프레임 생성 중...</h2>
          <button onClick={makeStrip}>합성하기</button>
        </div>
      )}

      {/* RESULT STEP */}
      {step === "result" && resultImage && (
        <div>
          <h2>완성!</h2>
          <img src={resultImage} style={{ width: 300 }} />

          <br />
          <a href={resultImage} download="booth.png">
            다운로드
          </a>

          <br /><br />

          <button
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

      {/* hidden canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}