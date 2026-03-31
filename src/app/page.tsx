"use client";

import React, { useRef, useState, useEffect } from "react";

export default function PhotoBooth() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // 1. 카메라 시작 함수 (모바일 호환성 강화)
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // 모바일 브라우저 대응: 비디오 로드 완료 후 재생 보장
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraOpen(true);
        };
      }
    } catch (err) {
      console.error("카메라 에러:", err);
      alert("카메라 권한을 허용해주세요! (설정 -> 브라우저 -> 카메라 허용)");
    }
  };

  // 2. 사진 찍기 함수 (4:3 비율 유지)
  const takePhoto = () => {
    if (photos.length >= 4) return;

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");

    if (videoRef.current && ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 800, 600);
      const dataUrl = canvas.toDataURL("image/png");
      setPhotos((prev) => [...prev, dataUrl]);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-4 select-none">
      <h1 className="text-xl font-bold my-4 uppercase tracking-widest italic">
        Soykko <span className="text-blue-500">Booth</span>
      </h1>

      {/* 카메라 뷰파인더: 기존 디자인 및 구조 보존 */}
      <div className="relative w-full max-w-md aspect-[4/3] bg-zinc-900 rounded-2xl overflow-hidden border-2 border-zinc-700">
        {!isCameraOpen ? (
          <button 
            onClick={startCamera}
            className="absolute inset-0 bg-blue-600 font-bold hover:bg-blue-700 transition-colors active:scale-95"
          >
            카메라 시작하기
          </button>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            muted       // 모바일 자동재생 필수
            playsInline // 전체화면 방지 필수
            className="w-full h-full object-cover" 
          />
        )}
      </div>

      {/* 촬영 버튼: UI/UX Lock 적용 (기존 디자인 유지) */}
      <div className="mt-8">
        <button
          onClick={takePhoto}
          disabled={!isCameraOpen || photos.length >= 4}
          className="w-20 h-20 bg-white rounded-full border-8 border-zinc-600 active:scale-90 disabled:opacity-30 transition-all shadow-2xl"
        />
      </div>

      {/* 네컷 결과물 미리보기: 화이트 프레임 디자인 고정 */}
      <div className="mt-10 bg-white p-3 w-48 shadow-2xl flex flex-col gap-1.5 transform rotate-1">
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="w-full aspect-[4/3] bg-zinc-100 overflow-hidden border border-zinc-200">
            {photos[idx] && (
              <img src={photos[idx]} className="w-full h-full object-cover" alt={`cut-${idx}`} />
            )}
          </div>
        ))}
        <div className="text-[10px] text-zinc-400 text-center font-black mt-1 tracking-tighter">
          SOYKKO-BOOTH.COM
        </div>
      </div>

      {/* 하단 컨트롤 */}
      {photos.length > 0 && (
        <button 
          onClick={() => setPhotos([])}
          className="mt-6 text-sm text-zinc-500 underline active:text-white"
        >
          다시 찍기 (Reset)
        </button>
      )}
    </main>
  );
}