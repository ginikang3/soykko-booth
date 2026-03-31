"use client";

import React, { useRef, useState, useEffect } from "react";

export default function PhotoBooth() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // 1. 카메라 시작 함수
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOpen(true);
      }
    } catch (err) {
      console.error("카메라 에러:", err);
      alert("카메라 권한을 허용해주세요!");
    }
  };

  // 2. 사진 찍기 함수 (4장까지만)
  const takePhoto = () => {
    if (photos.length >= 4) return;

    const canvas = document.createElement("canvas");
    // 4:3 비율로 설정
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");

    if (videoRef.current && ctx) {
      // 비디오 화면을 캔버스에 그리기
      ctx.drawImage(videoRef.current, 0, 0, 800, 600);
      const dataUrl = canvas.toDataURL("image/png");
      setPhotos((prev) => [...prev, dataUrl]);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-4">
      <h1 className="text-xl font-bold my-4 uppercase tracking-widest">Soykko Booth</h1>

      {/* 카메라 뷰파인더 */}
      <div className="relative w-full max-w-md aspect-[4/3] bg-zinc-900 rounded-2xl overflow-hidden border-2 border-zinc-700">
        {!isCameraOpen ? (
          <button 
            onClick={startCamera}
            className="absolute inset-0 bg-blue-600 font-bold hover:bg-blue-700 transition-colors"
          >
            카메라 시작하기
          </button>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
        )}
      </div>

      {/* 촬영 버튼 */}
      <div className="mt-8">
        <button
          onClick={takePhoto}
          disabled={!isCameraOpen || photos.length >= 4}
          className="w-20 h-20 bg-white rounded-full border-8 border-zinc-600 active:scale-90 disabled:opacity-30 transition-all"
        />
      </div>

      {/* 찍힌 사진 4장 미리보기 (네컷 레이아웃) */}
      <div className="mt-10 bg-white p-3 w-48 shadow-2xl flex flex-col gap-1.5">
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="w-full aspect-[4/3] bg-zinc-100 overflow-hidden">
            {photos[idx] && (
              <img src={photos[idx]} className="w-full h-full object-cover" />
            )}
          </div>
        ))}
        <div className="text-[10px] text-zinc-400 text-center font-bold mt-1">
          SOYKKO-BOOTH
        </div>
      </div>

      {/* 리셋 버튼 */}
      {photos.length > 0 && (
        <button 
          onClick={() => setPhotos([])}
          className="mt-6 text-sm text-zinc-500 underline"
        >
          다시 찍기
        </button>
      )}
    </main>
  );
}