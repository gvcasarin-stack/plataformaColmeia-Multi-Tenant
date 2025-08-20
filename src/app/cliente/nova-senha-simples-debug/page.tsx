export default function SimplesDebugPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Debug Page Simples - Nova Senha</h1>
      <p>Esta é uma página muito simples sem hooks React.</p>
      <p>Timestamp: {new Date().toISOString()}</p>
      <p>Se você está vendo isso, significa que a página carregou sem redirecionamento.</p>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0' }}>
        <h3>URL Info (via window.location)</h3>
        <script dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const urlInfo = document.getElementById('url-info');
              if (urlInfo) {
                urlInfo.innerHTML = '<pre>' + JSON.stringify({
                  href: window.location.href,
                  pathname: window.location.pathname,
                  search: window.location.search,
                  hash: window.location.hash,
                  params: new URLSearchParams(window.location.search).toString()
                }, null, 2) + '</pre>';
              }
            });
          `
        }} />
        <div id="url-info">Carregando info da URL...</div>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <a href="/cliente/login" style={{ marginRight: '10px' }}>Ir para Login</a>
        <a href="/cliente/nova-senha">Ir para Nova Senha Original</a>
      </div>
    </div>
  );
} 