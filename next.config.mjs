/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Using default output value for serverless deployment
  output: 'standalone',
  images: {
    unoptimized: true,
    remotePatterns: [

      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: [],
    esmExternals: 'loose',
    // Disable CSS optimization during build as it's causing issues
    optimizeCss: false,
  },
  // Ensure pages are built
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  distDir: '.next',
  generateBuildId: () => {
    return `build-${Date.now()}`;
  },
  
  // Rewrites para rotas antigas para novas
  async rewrites() {
    return [
      // Redirecionar rotas sem prefixo para rotas com prefixo admin
      {
        source: '/painel',
        destination: '/admin/painel',
      },
      {
        source: '/projetos',
        destination: '/admin/projetos',
      },
      {
        source: '/projetos/:path*',
        destination: '/admin/projetos/:path*',
      },
      {
        source: '/equipe',
        destination: '/admin/equipe',
      },
      {
        source: '/clientes',
        destination: '/admin/clientes',
      },
      {
        source: '/cobrancas',
        destination: '/admin/financeiro',
      },
      {
        source: '/financeiro',
        destination: '/admin/financeiro',
      },
      {
        source: '/dimensionamento',
        destination: '/admin/dimensionamento',
      },
      {
        source: '/notificacoes',
        destination: '/admin/notificacoes',
      },
      {
        source: '/preferencias',
        destination: '/admin/preferencias',
      },
      {
        source: '/admin-login',
        destination: '/admin/login',
      }
    ];
  },

  // Redirecionamentos para páginas admin
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/login', 
        permanent: true,
      },
      // Redirecionamentos para páginas de ferramentas administrativas
      {
        source: '/teste-email',
        destination: '/admin/ferramentas/email',
        permanent: true,
      },
      {
        source: '/admin/ferramentas-teste',
        destination: '/admin/ferramentas',
        permanent: true,
      },
      {
        source: '/admin/ferramentas-teste/:path*',
        destination: '/admin/ferramentas/:path*',
        permanent: true,
      },
      // Redirecionamento para API de notificações
      {
        source: '/api/test-notification/project-created',
        destination: '/api/notifications/project-created',
        permanent: true,
      }
    ];
  }
};

export default nextConfig;
