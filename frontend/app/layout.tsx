import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "0xGuard - Mission Control",
  description: "0xGuard Protocol - AI-Driven Cyberwarfare Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-black text-white min-h-screen`}
      >
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'toast-container',
            style: {
              background: '#09090b',
              color: '#ffffff',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '12px 16px',
              fontFamily: 'var(--font-inter)',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#ffffff',
              },
              style: {
                border: '1px solid #22c55e',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
              style: {
                border: '1px solid #ef4444',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
