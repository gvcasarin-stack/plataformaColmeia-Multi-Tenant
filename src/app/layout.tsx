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
  manifest: "/manifest.json",
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
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
      </head>
      <body className={`${inter.className} bg-white dark:bg-gray-900`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
} 