import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// 1. Restauramos a fonte Geist original para não quebrar seu Tailwind!
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kaxis Club | Cashback Inteligente",
  description: "Um Cupom. Benefícios Infinitos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-br"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark')
              } else {
                document.documentElement.classList.remove('dark')
              }
            } catch (_) {}
          `,
        }} />
      </head>

      {/* 2. Mantivemos apenas as cores de fundo atualizadas */}
      <body className="min-h-full flex flex-col bg-[#F8FAFC] dark:bg-[#050505] text-slate-900 dark:text-slate-100 selection:bg-blue-300 dark:selection:bg-blue-900 transition-colors duration-500 overflow-x-hidden font-sans">

        {/* 3. Luzes de Fundo (Glow) Liquid Glass em Ciano/Azul */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] rounded-full bg-cyan-400/20 dark:bg-blue-600/10 blur-[120px] md:blur-[160px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] rounded-full bg-blue-500/15 dark:bg-indigo-900/15 blur-[100px] md:blur-[140px]" />
        </div>

        <div className="flex-grow flex flex-col items-center">
          {children}
        </div>
        <Toaster richColors position="top-right" />

      </body>
    </html>
  );
}