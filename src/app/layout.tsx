import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Snapi - Tu estilo único",
  description: "Captura tus 4 momentos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* Push Notifications 광고 스크립트 */}
        <div dangerouslySetInnerHTML={{
          __html: `<script src="https://5gvci.com/act/files/tag.min.js?z=10848796" data-cfasync="false" async></script>`
        }} />
        
        {children}
      </body>
    </html>
  );
}