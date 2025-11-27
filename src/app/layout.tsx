import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

// Otimização da fonte com display swap para melhor desempenho
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

export const metadata: Metadata = {
  title: "Colmeia Projetos",
  description: "Plataforma de gerenciamento de projetos",
  icons: {
    icon: [
      { url: "/lightning-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: [
      { url: "/lightning-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: { url: "/favicon.ico", type: "image/x-icon" },
  },
  // Adicionando Open Graph para melhor compartilhamento
  openGraph: {
    title: "Colmeia Projetos",
    description: "Plataforma de gerenciamento de projetos",
    url: "https://colmeia.app",
    siteName: "Colmeia Projetos",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/lightning-icon.svg",
        width: 512,
        height: 512,
        alt: "Colmeia Projetos Logo",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Forçar o navegador a usar nosso ícone (quadrado com raio amarelo) */}
        <link rel="icon" href="/lightning-icon.svg" type="image/svg+xml" />
        {/* Evitar 404 de /favicon.ico em subdomínios: usar o mesmo ícone padrão */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/lightning-icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/lightning-icon.svg" />
        
        {/* Garantir que a Apple não aplique seu estilo */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Colmeia" />
        
        {/* Adicionar tag para navegadores modernos (resolve o aviso de obsolescência) */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Preconnect para domínios externos para iniciar conexão antecipada */}
        <link 
          rel="preconnect" 
          href="https://firebasestorage.googleapis.com" 
          crossOrigin="anonymous"
        />
        <link 
          rel="preconnect" 
          href="https://www.gstatic.com" 
          crossOrigin="anonymous"
        />
        {/* DNS Prefetch para recursos que serão necessários */}
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.gstatic.com" />

        {/* Otimização de carregamento do player VTURB */}
        <script dangerouslySetInnerHTML={{
          __html: `!function(i,n){i._plt=i._plt||(n&&n.timeOrigin?n.timeOrigin+n.now():Date.now())}(window,performance);`
        }} />
        <link rel="preload" href="https://scripts.converteai.net/068d8d22-b205-4211-8cde-5fd27a22efa0/players/68f627a74b986c64f63e492b/v4/player.js" as="script" />
        <link rel="preload" href="https://scripts.converteai.net/lib/js/smartplayer-wc/v4/smartplayer.js" as="script" />
        <link rel="preload" href="https://cdn.converteai.net/068d8d22-b205-4211-8cde-5fd27a22efa0/68f626db019e17c093bd4510/main.m3u8" as="fetch" />
        <link rel="dns-prefetch" href="https://cdn.converteai.net" />
        <link rel="dns-prefetch" href="https://scripts.converteai.net" />
        <link rel="dns-prefetch" href="https://images.converteai.net" />
        <link rel="dns-prefetch" href="https://api.vturb.com.br" />
      </head>
      <body className={`${inter.className} bg-white dark:bg-gray-900`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
} 