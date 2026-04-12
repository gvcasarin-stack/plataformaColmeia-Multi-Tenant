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
  title: "Sistema de Gerenciamento para Projetos Fotovoltaicos e Homologação | SGF",
  description: "Sistema completo de gestão para projetistas fotovoltaicos e empresas de homologação. Gerencie projetos, documentos, notificações, financeiro e acompanhamento de clientes em tempo real.",
  keywords: [
    "sistema gerenciamento fotovoltaico",
    "software projetos fotovoltaicos",
    "gestão homologação fotovoltaica",
    "sistema projetistas fotovoltaicos",
    "plataforma homologação energia solar",
    "gestão projetos energia solar",
    "software homologação distribuidora",
    "controle projetos fotovoltaicos",
    "portal cliente projetos solares",
    "gerenciamento homologação ANEEL"
  ],
  authors: [{ name: "Colmeia Solar" }],
  creator: "Colmeia Solar",
  publisher: "Colmeia Solar",
  category: "Software de Gestão Fotovoltaica",
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
  // Open Graph otimizado para compartilhamento em redes sociais
  openGraph: {
    title: "SGF - Sistema de Gerenciamento para Projetos Fotovoltaicos e Homologação",
    description: "Gerencie solicitações de projeto, documentos, comentários, notificações e o financeiro do seu escritório de homologações. Status de todos os projetos em tempo real.",
    url: "https://www.gerenciamentofotovoltaico.com.br",
    siteName: "SGF - Sistema de Gerenciamento Fotovoltaico",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/lightning-icon.svg",
        width: 512,
        height: 512,
        alt: "SGF - Sistema de Gerenciamento Fotovoltaico",
      },
    ],
  },
  // Twitter Cards para melhor compartilhamento
  twitter: {
    card: "summary_large_image",
    title: "SGF - Sistema de Gerenciamento Fotovoltaico",
    description: "Sistema completo de gestão para projetistas fotovoltaicos e empresas de homologação.",
    images: ["/lightning-icon.svg"],
  },
  // Informações adicionais para SEO
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: "https://www.gerenciamentofotovoltaico.com.br",
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
        {/* SEO: Meta tags adicionais */}
        <meta name="author" content="Colmeia Solar" />
        <meta name="category" content="Software de Gestão Fotovoltaica" />
        <meta name="coverage" content="Brasil" />
        <meta name="distribution" content="global" />
        <meta name="rating" content="general" />
        <meta name="revisit-after" content="7 days" />
        <meta name="target" content="projetistas fotovoltaicos, empresas de homologação, integradores solares" />
        
        {/* SEO: Geo tags para Brasil */}
        <meta name="geo.region" content="BR" />
        <meta name="geo.placename" content="Brasil" />
        
        {/* Forçar o navegador a usar nosso ícone (quadrado com raio amarelo) */}
        <link rel="icon" href="/lightning-icon.svg" type="image/svg+xml" />
        {/* Evitar 404 de /favicon.ico em subdomínios: usar o mesmo ícone padrão */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/lightning-icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/lightning-icon.svg" />
        
        {/* Garantir que a Apple não aplique seu estilo */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SGF" />
        
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

        {/* Meta Pixel Code */}
        <script dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','1312240497468073');
fbq('track','PageView');`
        }} />
        <noscript dangerouslySetInnerHTML={{
          __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1312240497468073&ev=PageView&noscript=1" />`
        }} />
        {/* End Meta Pixel Code */}

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