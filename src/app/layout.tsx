import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Monetag Vignette 광고 스크립트 */}
        
      </head>
      <body>{children}</body>
    </html>
  );
}