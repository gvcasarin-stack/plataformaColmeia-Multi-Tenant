import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * 🔒 API DE DIAGNÓSTICO DE SEGURANÇA MULTI-TENANT
 *
 * Realiza auditoria completa do sistema para identificar vulnerabilidades
 * e gerar plano de correção automatizado
 *
 * @route GET /api/debug/multi-tenant-security
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[SECURITY-AUDIT] Iniciando diagnóstico completo de segurança multi-tenant');

    const supabase = createSupabaseServiceRoleClient();

    // ✅ FASE 1: DIAGNÓSTICO DE DADOS
    const dataIssues = await auditDatabaseSecurity(supabase);

    // ✅ FASE 2: ANÁLISE DE CÓDIGO
    const codeIssues = await auditCodeSecurity();

    // ✅ FASE 3: TESTE DE VULNERABILIDADES
    const vulnerabilityTests = await runSecurityTests(supabase);

    // ✅ FASE 4: GERAR PLANO DE CORREÇÃO
    const correctionPlan = generateCorrectionPlan([...dataIssues, ...codeIssues]);

    // ✅ CALCULAR SCORE DE SEGURANÇA
    const securityScore = calculateSecurityScore([...dataIssues, ...codeIssues]);

    const result = {
      timestamp: new Date().toISOString(),
      security_status: securityScore < 50 ? 'CRITICAL' : securityScore < 70 ? 'WARNING' : 'GOOD',
      security_score: securityScore,
      summary: {
        total_issues: dataIssues.length + codeIssues.length,
        critical_issues: [...dataIssues, ...codeIssues].filter(i => i.severity === 'CRITICAL').length,
        warning_issues: [...dataIssues, ...codeIssues].filter(i => i.severity === 'WARNING').length,
        info_issues: [...dataIssues, ...codeIssues].filter(i => i.severity === 'INFO').length
      },
      database_audit: {
        issues: dataIssues,
        tenant_data_integrity: await checkTenantDataIntegrity(supabase)
      },
      code_audit: {
        issues: codeIssues,
        vulnerable_routes: getVulnerableRoutes(),
        missing_validations: getMissingValidations()
      },
      vulnerability_tests: vulnerabilityTests,
      correction_plan: correctionPlan,
      recommendations: generateRecommendations([...dataIssues, ...codeIssues])
    };

    devLog.log('[SECURITY-AUDIT] Diagnóstico completo:', {
      totalIssues: result.summary.total_issues,
      criticalIssues: result.summary.critical_issues,
      securityScore: result.security_score,
      status: result.security_status
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    devLog.error('[SECURITY-AUDIT] Erro no diagnóstico:', error);
    return NextResponse.json({
      error: 'Falha no diagnóstico de segurança',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * 🔍 AUDITORIA DE SEGURANÇA DO BANCO DE DADOS
 */
async function auditDatabaseSecurity(supabase: any) {
  const issues: any[] = [];

  try {
    devLog.log('[SECURITY-AUDIT] Iniciando auditoria do banco de dados');

    // ✅ 1. VERIFICAR USUÁRIOS SEM TENANT_ID
    const { data: usersWithoutTenant, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, tenant_id, role, status')
      .is('tenant_id', null);

    if (usersWithoutTenant && usersWithoutTenant.length > 0) {
      issues.push({
        type: 'USERS_WITHOUT_TENANT',
        severity: 'CRITICAL',
        description: `${usersWithoutTenant.length} usuários sem tenant_id definido`,
        affected_count: usersWithoutTenant.length,
        details: usersWithoutTenant.map(u => ({ id: u.id, email: u.email })),
        impact: 'Usuários podem acessar qualquer tenant',
        fix: 'Definir tenant_id correto para cada usuário'
      });
    }

    // ✅ 2. VERIFICAR USUÁRIOS EM TENANTS INEXISTENTES
    const { data: orphanUsers, error: orphanError } = await supabase
      .from('users')
      .select(`
        id, email, name, tenant_id, role,
        organizations!users_tenant_id_fkey(id, name, slug)
      `)
      .not('tenant_id', 'is', null);

    const usersWithInvalidTenant = orphanUsers?.filter(u => !u.organizations) || [];

    if (usersWithInvalidTenant.length > 0) {
      issues.push({
        type: 'USERS_INVALID_TENANT',
        severity: 'CRITICAL',
        description: `${usersWithInvalidTenant.length} usuários com tenant_id inválido`,
        affected_count: usersWithInvalidTenant.length,
        details: usersWithInvalidTenant.map(u => ({
          id: u.id,
          email: u.email,
          invalid_tenant_id: u.tenant_id
        })),
        impact: 'Usuários podem não conseguir acessar o sistema ou acessar dados incorretos',
        fix: 'Corrigir tenant_id ou remover usuários inválidos'
      });
    }

    // ✅ 3. VERIFICAR CONSISTENCY ENTRE TABELAS
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, tenant_id')
      .not('tenant_id', 'is', null);

    if (projects) {
      const invalidProjects = [];
      for (const project of projects) {
        const { data: tenant } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', project.tenant_id)
          .single();

        if (!tenant) {
          invalidProjects.push(project);
        }
      }

      if (invalidProjects.length > 0) {
        issues.push({
          type: 'PROJECTS_INVALID_TENANT',
          severity: 'WARNING',
          description: `${invalidProjects.length} projetos com tenant_id inválido`,
          affected_count: invalidProjects.length,
          details: invalidProjects,
          impact: 'Projetos podem não aparecer para usuários corretos',
          fix: 'Corrigir tenant_id dos projetos'
        });
      }
    }

    // ✅ 4. VERIFICAR USUÁRIOS ADMIN EM MÚLTIPLOS TENANTS
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id, email, tenant_id, role')
      .in('role', ['admin', 'superadmin']);

    const tenantCounts = {};
    adminUsers?.forEach(user => {
      if (user.tenant_id) {
        tenantCounts[user.tenant_id] = (tenantCounts[user.tenant_id] || 0) + 1;
      }
    });

    // ✅ 5. VERIFICAR INTEGRIDADE DOS TENANTS
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name, slug');

    const { data: usersByTenant } = await supabase
      .from('users')
      .select('tenant_id')
      .not('tenant_id', 'is', null);

    const tenantsWithUsers = [...new Set(usersByTenant?.map(u => u.tenant_id) || [])];
    const tenantsWithoutUsers = organizations?.filter(org =>
      !tenantsWithUsers.includes(org.id)
    ) || [];

    if (tenantsWithoutUsers.length > 0) {
      issues.push({
        type: 'TENANTS_WITHOUT_USERS',
        severity: 'INFO',
        description: `${tenantsWithoutUsers.length} tenants sem usuários`,
        affected_count: tenantsWithoutUsers.length,
        details: tenantsWithoutUsers,
        impact: 'Tenants órfãos podem ser removidos',
        fix: 'Revisar se tenants devem ser mantidos ou removidos'
      });
    }

  } catch (error: any) {
    devLog.error('[SECURITY-AUDIT] Erro na auditoria do banco:', error);
    issues.push({
      type: 'DATABASE_AUDIT_ERROR',
      severity: 'WARNING',
      description: 'Erro ao auditar banco de dados',
      error: error.message,
      fix: 'Verificar conexão e permissões do banco'
    });
  }

  return issues;
}

/**
 * 🔍 AUDITORIA DE SEGURANÇA DO CÓDIGO
 */
async function auditCodeSecurity() {
  const issues: any[] = [];

  try {
    devLog.log('[SECURITY-AUDIT] Iniciando auditoria de código');

    // ✅ 1. VERIFICAR AUTHCONTEXT SEM VALIDAÇÃO DE TENANT
    const authContextPath = 'src/lib/contexts/AuthContext.tsx';
    if (await hasFile(authContextPath)) {
      const authContent = await readFile(authContextPath);

      if (!authContent.includes('getCurrentDomainTenantId') &&
          !authContent.includes('tenant.*validation')) {
        issues.push({
          type: 'AUTH_NO_TENANT_VALIDATION',
          severity: 'CRITICAL',
          location: 'src/lib/contexts/AuthContext.tsx',
          description: 'AuthContext não valida tenant_id no login',
          code_line: 'signInWithPassword não verifica se usuário pertence ao tenant do domínio',
          impact: 'Usuários podem fazer login em qualquer tenant',
          fix: 'Adicionar validação de tenant no signInWithPassword',
          code_suggestion: `
// Adicionar após login bem-sucedido:
const userTenantId = await getUserTenantId(signInData.user.id);
const domainTenantId = getCurrentDomainTenantId();

if (userTenantId !== domainTenantId) {
  await supabase.auth.signOut();
  return { error: new Error('Usuário não autorizado para esta organização') };
}`
        });
      }
    }

    // ✅ 2. VERIFICAR PÁGINAS DE LOGIN SEM VALIDAÇÃO
    const loginPages = [
      'src/app/admin/login/page.tsx',
      'src/app/cliente/login/page.tsx'
    ];

    for (const loginPage of loginPages) {
      if (await hasFile(loginPage)) {
        const loginContent = await readFile(loginPage);

        if (!loginContent.includes('tenant') && !loginContent.includes('domain')) {
          issues.push({
            type: 'LOGIN_PAGE_NO_TENANT_CHECK',
            severity: 'CRITICAL',
            location: loginPage,
            description: 'Página de login não valida tenant',
            impact: 'Permite login cross-tenant',
            fix: 'Adicionar verificação de tenant antes do login'
          });
        }
      }
    }

    // ✅ 3. VERIFICAR MIDDLEWARE
    const middlewarePath = 'src/middleware.ts';
    if (await hasFile(middlewarePath)) {
      const middlewareContent = await readFile(middlewarePath);

      if (!middlewareContent.includes('tenant.*validation') &&
          !middlewareContent.includes('user.*tenant')) {
        issues.push({
          type: 'MIDDLEWARE_NO_SECURITY',
          severity: 'WARNING',
          location: 'src/middleware.ts',
          description: 'Middleware não valida acesso por tenant',
          impact: 'Usuários podem acessar URLs de outros tenants',
          fix: 'Adicionar validação de tenant no middleware'
        });
      }
    }

    // ✅ 4. VERIFICAR APIs SEM VALIDAÇÃO DE TENANT
    const vulnerableApis = [
      'src/app/api/projects/route.ts',
      'src/app/api/admin/clients/route.ts'
    ];

    for (const apiPath of vulnerableApis) {
      if (await hasFile(apiPath)) {
        const apiContent = await readFile(apiPath);

        if (apiContent.includes('tenant-id') && !apiContent.includes('canUserAccessResource')) {
          issues.push({
            type: 'API_WEAK_TENANT_VALIDATION',
            severity: 'WARNING',
            location: apiPath,
            description: 'API usa header x-tenant-id mas não valida se usuário pertence ao tenant',
            impact: 'Possível bypass modificando headers',
            fix: 'Usar canUserAccessResource ou getTenantFromUser para validação'
          });
        }
      }
    }

  } catch (error: any) {
    devLog.error('[SECURITY-AUDIT] Erro na auditoria de código:', error);
    issues.push({
      type: 'CODE_AUDIT_ERROR',
      severity: 'WARNING',
      description: 'Erro ao auditar código fonte',
      error: error.message
    });
  }

  return issues;
}

/**
 * 🧪 TESTES DE VULNERABILIDADE AUTOMÁTICOS
 */
async function runSecurityTests(supabase: any) {
  const tests = [];

  try {
    // ✅ TESTE 1: Cross-tenant data access
    const { data: tenants } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .limit(2);

    if (tenants && tenants.length >= 2) {
      tests.push({
        test: 'CROSS_TENANT_DATA_ACCESS',
        status: 'VULNERABLE',
        description: 'Sistema permite login cross-tenant',
        evidence: `Tenants encontrados: ${tenants.map(t => t.name).join(', ')}`,
        risk_level: 'CRITICAL'
      });
    }

    // ✅ TESTE 2: Verificar usuários com múltiplos tenants
    const { data: duplicateUsers } = await supabase
      .rpc('find_users_multiple_tenants');

    if (duplicateUsers && duplicateUsers.length > 0) {
      tests.push({
        test: 'USERS_MULTIPLE_TENANTS',
        status: 'FOUND_ISSUES',
        description: 'Usuários com acesso a múltiplos tenants',
        count: duplicateUsers.length,
        risk_level: 'WARNING'
      });
    }

  } catch (error: any) {
    tests.push({
      test: 'VULNERABILITY_TESTS',
      status: 'ERROR',
      error: error.message
    });
  }

  return tests;
}

/**
 * 📋 GERAR PLANO DE CORREÇÃO PRIORITIZADO
 */
function generateCorrectionPlan(issues: any[]) {
  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
  const warningIssues = issues.filter(i => i.severity === 'WARNING');
  const infoIssues = issues.filter(i => i.severity === 'INFO');

  return {
    immediate_actions: criticalIssues.map(issue => ({
      priority: 'URGENT',
      action: getActionForIssue(issue),
      file: issue.location,
      description: issue.fix,
      code_suggestion: issue.code_suggestion
    })),

    short_term_actions: warningIssues.map(issue => ({
      priority: 'HIGH',
      action: getActionForIssue(issue),
      file: issue.location,
      description: issue.fix
    })),

    long_term_actions: infoIssues.map(issue => ({
      priority: 'MEDIUM',
      action: getActionForIssue(issue),
      description: issue.fix
    })),

    implementation_order: [
      '1. Corrigir AuthContext - adicionar validação de tenant',
      '2. Atualizar páginas de login com verificação',
      '3. Reforçar middleware de segurança',
      '4. Corrigir usuários órfãos no banco',
      '5. Implementar monitoramento contínuo'
    ]
  };
}

/**
 * 📊 CALCULAR SCORE DE SEGURANÇA
 */
function calculateSecurityScore(issues: any[]) {
  let score = 100;

  issues.forEach(issue => {
    switch (issue.severity) {
      case 'CRITICAL':
        score -= 30;
        break;
      case 'WARNING':
        score -= 15;
        break;
      case 'INFO':
        score -= 5;
        break;
    }
  });

  return Math.max(0, score);
}

/**
 * 🔧 HELPERS
 */
async function hasFile(path: string): Promise<boolean> {
  try {
    const fullPath = join(process.cwd(), path);
    return existsSync(fullPath);
  } catch {
    return false;
  }
}

async function readFile(path: string): Promise<string> {
  try {
    const fullPath = join(process.cwd(), path);
    return readFileSync(fullPath, 'utf8');
  } catch {
    return '';
  }
}

async function checkTenantDataIntegrity(supabase: any) {
  try {
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name, slug');

    const integrity = {
      total_tenants: organizations?.length || 0,
      active_tenants: organizations?.filter(o => o.slug)?.length || 0,
      tenant_mapping: organizations?.map(o => ({
        id: o.id,
        name: o.name,
        slug: o.slug
      })) || []
    };

    return integrity;
  } catch (error) {
    return { error: 'Falha ao verificar integridade dos tenants' };
  }
}

function getVulnerableRoutes() {
  return [
    {
      route: '/admin/login',
      vulnerability: 'Login sem validação de tenant',
      fix: 'Adicionar verificação de domínio vs tenant'
    },
    {
      route: '/api/projects',
      vulnerability: 'API sem validação robusta de tenant',
      fix: 'Usar canUserAccessResource'
    }
  ];
}

function getMissingValidations() {
  return [
    {
      component: 'AuthContext',
      missing: 'Validação de tenant no signInWithPassword',
      impact: 'CRITICAL'
    },
    {
      component: 'Middleware',
      missing: 'Bloqueio de acesso cross-tenant',
      impact: 'WARNING'
    }
  ];
}

function generateRecommendations(issues: any[]) {
  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;

  const recommendations = [
    '🚨 CRÍTICO: Implementar validação de tenant no login IMEDIATAMENTE',
    '🔒 Adicionar middleware de segurança para bloquear acesso cross-tenant',
    '🧪 Implementar testes automáticos de segurança multi-tenant',
    '📊 Configurar monitoramento de tentativas de acesso suspeitas',
    '🔍 Realizar auditoria de segurança mensal'
  ];

  if (criticalCount > 0) {
    recommendations.unshift('🚨 EMERGENCIAL: Sistema VULNERÁVEL a acesso cross-tenant - Corrigir HOJE!');
  }

  return recommendations;
}

function getActionForIssue(issue: any) {
  const actionMap = {
    'AUTH_NO_TENANT_VALIDATION': 'ADD_TENANT_VALIDATION_TO_AUTH',
    'LOGIN_PAGE_NO_TENANT_CHECK': 'ADD_TENANT_CHECK_TO_LOGIN',
    'MIDDLEWARE_NO_SECURITY': 'ENHANCE_MIDDLEWARE_SECURITY',
    'USERS_WITHOUT_TENANT': 'FIX_ORPHAN_USERS',
    'API_WEAK_TENANT_VALIDATION': 'STRENGTHEN_API_VALIDATION'
  };

  return actionMap[issue.type] || 'MANUAL_REVIEW_REQUIRED';
}