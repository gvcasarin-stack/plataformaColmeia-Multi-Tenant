import { devLog } from "@/lib/utils/productionLogger";

/**
 * Utilitários para gerenciar o reset global da aplicação durante o logout
 */

/**
 * Limpa todas as caixas de diálogo abertas e estados persistentes da aplicação
 * durante o processo de logout
 */
export function resetApplicationState() {
  devLog.log('[Reset] Iniciando limpeza do estado da aplicação');
  
  if (typeof window === 'undefined') return true;
  
  try {
    // 1. Preservar theme antes de limpar storage
    const theme = localStorage.getItem('theme');
    
    // 2. Limpar sessionStorage e localStorage
    sessionStorage.clear();
    localStorage.clear();
    
    // 3. Restaurar theme
    if (theme) {
      localStorage.setItem('theme', theme);
    }
    
    // 4. Remover classes relacionadas ao logout
    document.body.classList.remove('logging-out');
    
    // 5. Desativar evento beforeunload para evitar diálogos do navegador
    window.onbeforeunload = null;
    
    // 6. Notificar outros componentes que o estado foi resetado
    document.dispatchEvent(new CustomEvent('app-state-reset'));
    
    // 7. Executa reset de formulários no DOM para prevenir diálogos de "Leave without saving"
    try {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        try {
          form.reset();
        } catch (e) {
          // Ignorar erros em formulários individuais
        }
      });
    } catch (e) {
      // Ignorar erros de manipulação de DOM
    }
    
    devLog.log('[Reset] Estado da aplicação limpo com sucesso');
    return true;
  } catch (error) {
    devLog.error('[Reset] Erro ao limpar estado:', error);
    return false;
  }
}

/**
 * Prepara a aplicação para logout, garantindo que nenhum estado persistente cause problemas
 */
export function prepareForLogout() {
  // Definir flags para evitar confirmações durante navegação
  sessionStorage.setItem('isLoggingOut', 'true');
  document.body.classList.add('logging-out');
  
  // Evitar qualquer evento beforeunload - limpeza antecipada
  if (typeof window !== 'undefined') {
    // Remover todos os eventos beforeunload
    window.onbeforeunload = null;
    
    // Criar um handler vazio que sempre retorna undefined (isto cancelará todos os diálogos)
    const emptyHandler = function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.returnValue !== undefined) {
        e.returnValue = undefined;
      }
      return undefined;
    };
    
    // Substituir todos os handlers existentes com nosso handler vazio
    window.addEventListener('beforeunload', emptyHandler, { capture: true });
    
    // Resetar todos os formulários
    resetAllForms();
  }
  
  // Remover propriedades temporárias da window
  // @ts-ignore
  window.GLOBAL_UNSAVED_CHANGES = false;
  
  // Disparar evento para outros componentes se atualizarem
  document.dispatchEvent(new Event('app-logout-initiated'));
  
  devLog.log('[Logout] Aplicação preparada para logout');
  return true;
}

/**
 * Reseta todos os formulários da página para o estado original,
 * evitando assim que o navegador detecte mudanças não salvas
 * durante o processo de logout
 */
export function resetAllForms() {
  if (typeof document === 'undefined') return false;
  
  // 1. Encontrar todos os formulários na página
  const forms = document.querySelectorAll('form');
  devLog.log(`[Reset] Resetando ${forms.length} formulários encontrados`);
  
  // 2. Resetar cada um para o estado inicial
  forms.forEach(form => {
    try {
      // Resetar o formulário (volta aos valores defaults)
      form.reset();
      
      // Limpar classes e atributos que possam indicar modificação
      form.classList.remove('modified', 'dirty', 'touched');
      form.removeAttribute('data-modified');
      form.removeAttribute('data-dirty');
      form.removeAttribute('data-touched');
      
      // Marcar o formulário como "não modificado" para React/frameworks
      if (form.dataset) {
        form.dataset.pristine = 'true';
        form.dataset.modified = 'false';
      }
      
      // Resetar estados dos campos individualmente
      Array.from(form.elements).forEach((element) => {
        if (element instanceof HTMLElement) {
          // Removendo classes de estado de campos individuais
          element.classList.remove('modified', 'dirty', 'touched', 'invalid');
          
          // Limpar mensagens de erro
          const errorContainer = element.nextElementSibling;
          if (errorContainer && 
              errorContainer instanceof HTMLElement && 
              errorContainer.classList.contains('error-message')) {
            errorContainer.textContent = '';
            errorContainer.style.display = 'none';
          }
        }
      });
    } catch (e) {
      devLog.error('[Reset] Erro ao resetar formulário:', e);
    }
  });
  
  // 3. Limpar flags globais que possam indicar mudanças
  try {
    // Limpar variáveis globais conhecidas de frameworks populares
    if (typeof window !== 'undefined') {
      // @ts-ignore - Limpar variável global para compatibilidade
      if (typeof window.GLOBAL_UNSAVED_CHANGES !== 'undefined') {
        // @ts-ignore 
        window.GLOBAL_UNSAVED_CHANGES = false;
      }
      
      // @ts-ignore - Limpar variáveis de alguns frameworks de forms 
      if (typeof window.formDirty !== 'undefined') {
        // @ts-ignore
        window.formDirty = false;
      }
      
      // @ts-ignore - Limpar variáveis de detecção de mudanças
      if (typeof window.hasChanges !== 'undefined') {
        // @ts-ignore
        window.hasChanges = false;
      }
    }
  } catch (e) {
    devLog.error('[Reset] Erro ao limpar flags globais:', e);
  }
  
  return true;
}

/**
 * Função para realizar logout sem navegação, evitando assim o problema
 * do diálogo "Leave site?" em ambiente de produção.
 * 
 * @param {Function} signOutFunction - Função de logout da API de autenticação 
 * @param {string} redirectUrl - URL para redirecionar após logout
 * @param {boolean} isAdmin - Indica se é um logout de administrador
 * @returns {Promise<boolean>} - Retorna true se o logout for bem sucedido
 */
export async function logoutWithoutNavigation(
  signOutFunction: () => Promise<any>,
  redirectUrl: string = '/cliente/login',
  isAdmin: boolean = false
): Promise<boolean> {
  devLog.log('[Logout] Iniciando logout seguro');
  
  try {
    // 1. Definir flags para prevenir confirmações do navegador
    document.body.classList.add('logging-out');
    sessionStorage.setItem('isLoggingOut', 'true');
    
    if (isAdmin || redirectUrl.includes('/admin')) {
      sessionStorage.setItem('admin_logging_out', 'true');
    }
    
    // 2. Desativar eventos beforeunload
    window.onbeforeunload = null;
    
    // 3. Redefinir formulários
    try {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        try { form.reset(); } catch (e) {}
      });
    } catch (e) {}
    
    // 4. Executar o logout da API em segundo plano
    signOutFunction().catch(e => {
      devLog.error('[Logout] Erro ao fazer logout da API:', e);
    });
    
    // 5. Limpeza básica (preservando theme)
    const theme = localStorage.getItem('theme');
    sessionStorage.clear();
    localStorage.clear();
    if (theme) localStorage.setItem('theme', theme);
    
    // 6. Curto timeout antes do redirecionamento para permitir que o Firebase limpe tokens
    setTimeout(() => {
      // Redirecionar para a página de login
      try {
        // Para admin, usar replace para evitar histórico
        if (isAdmin || redirectUrl.includes('/admin')) {
          window.location.replace(redirectUrl);
        } else {
          window.location.href = redirectUrl;
        }
      } catch (e) {
        devLog.error('[Logout] Erro ao redirecionar:', e);
        window.location.href = redirectUrl; // Fallback
      }
    }, 50);
    
    return true;
  } catch (error) {
    devLog.error('[Logout] Erro no processo de logout:', error);
    
    // Tentativa de recuperação, redirecionando diretamente
    try {
      window.location.href = redirectUrl;
    } catch (e) {
      devLog.error('[Logout] Falha no redirecionamento de recuperação:', e);
    }
    
    return false;
  }
}
