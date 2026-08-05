/**
 * Utilitários para cálculo de SLA (Service Level Agreement)
 * Calcula prazos, tempo restante e status de projetos
 */

export interface SLAStatus {
  status: 'ok' | 'warning' | 'expired' | 'no-sla';
  hoursRemaining?: number;
  hoursOverdue?: number;
  percentageRemaining?: number;
  color: 'green' | 'yellow' | 'red' | 'gray';
  message: string;
}

/**
 * Calcula quantas horas úteis existem entre duas datas
 * Exclui finais de semana se excludeWeekends = true
 */
export function calculateBusinessHours(
  startDate: Date,
  endDate: Date,
  excludeWeekends: boolean = true
): number {
  if (!excludeWeekends) {
    // Simples: retornar diferença total em horas
    const diffMs = endDate.getTime() - startDate.getTime();
    return diffMs / (1000 * 60 * 60);
  }

  // Calcular excluindo fins de semana
  let totalHours = 0;
  const current = new Date(startDate);

  while (current < endDate) {
    const dayOfWeek = current.getDay();

    // Se não for sábado (6) ou domingo (0), conta a hora
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      totalHours++;
    }

    current.setHours(current.getHours() + 1);
  }

  return totalHours;
}

/**
 * Adiciona horas (úteis ou totais) a uma data
 * Se excludeWeekends = true, pula sábados e domingos
 */
export function addHours(
  startDate: Date,
  hours: number,
  excludeWeekends: boolean = true
): Date {
  const result = new Date(startDate);

  if (!excludeWeekends) {
    // Simples: adicionar horas direto
    result.setHours(result.getHours() + hours);
    return result;
  }

  // Adicionar horas excluindo fins de semana
  let remainingHours = hours;

  while (remainingHours > 0) {
    result.setHours(result.getHours() + 1);

    const dayOfWeek = result.getDay();
    // Se não for sábado (6) ou domingo (0), decrementa
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remainingHours--;
    }
  }

  return result;
}

/**
 * Calcula a data de expiração do SLA baseado em quando o status mudou
 * @param statusChangedAt - Data/hora em que o status mudou
 * @param slaDays - Prazo em DIAS
 * @param excludeWeekends - Se deve excluir finais de semana
 */
export function calculateSLAExpiration(
  statusChangedAt: string | Date,
  slaDays: number,
  excludeWeekends: boolean = true
): Date {
  const startDate = typeof statusChangedAt === 'string'
    ? new Date(statusChangedAt)
    : statusChangedAt;

  // Converter dias em horas (1 dia = 24 horas)
  const slaHours = slaDays * 24;

  return addHours(startDate, slaHours, excludeWeekends);
}

/**
 * Calcula o status atual do SLA de um projeto
 * @param statusChangedAt - Data/hora em que o status mudou
 * @param slaExpiresAt - Data/hora em que o SLA expira
 * @param slaDays - Prazo configurado em DIAS
 * @param excludeWeekends - Se exclui finais de semana
 */
export function calculateSLAStatus(
  statusChangedAt: string | Date | null | undefined,
  slaExpiresAt: string | Date | null | undefined,
  slaDays: number | null | undefined,
  excludeWeekends: boolean = true
): SLAStatus {
  // Se não tem SLA configurado
  if (!slaDays || slaDays <= 0) {
    return {
      status: 'no-sla',
      color: 'gray',
      message: 'Sem prazo'
    };
  }

  // Se não tem data de mudança de status, não pode calcular
  if (!statusChangedAt || !slaExpiresAt) {
    return {
      status: 'no-sla',
      color: 'gray',
      message: 'Sem prazo'
    };
  }

  const now = new Date();
  const expiresAt = typeof slaExpiresAt === 'string'
    ? new Date(slaExpiresAt)
    : slaExpiresAt;

  // Calcular horas restantes
  const hoursRemaining = calculateBusinessHours(now, expiresAt, excludeWeekends);

  // Converter dias em horas para cálculo de percentual
  const slaHours = slaDays * 24;

  // Se já expirou
  if (hoursRemaining <= 0) {
    const hoursOverdue = Math.abs(hoursRemaining);
    return {
      status: 'expired',
      hoursOverdue: Math.floor(hoursOverdue),
      color: 'red',
      message: `Atrasado ${formatTimeRemaining(hoursOverdue)}`
    };
  }

  // Calcular percentual restante
  const percentageRemaining = (hoursRemaining / slaHours) * 100;

  // Se está na zona de alerta (< 25% do prazo)
  if (percentageRemaining < 25) {
    return {
      status: 'warning',
      hoursRemaining: Math.floor(hoursRemaining),
      percentageRemaining: Math.round(percentageRemaining),
      color: 'yellow',
      message: `${formatTimeRemaining(hoursRemaining)} restantes`
    };
  }

  // Prazo OK
  return {
    status: 'ok',
    hoursRemaining: Math.floor(hoursRemaining),
    percentageRemaining: Math.round(percentageRemaining),
    color: 'green',
    message: `${formatTimeRemaining(hoursRemaining)} restantes`
  };
}

/**
 * Formata tempo restante/atrasado de forma legível
 */
export function formatTimeRemaining(hours: number): string {
  if (hours < 1) {
    const minutes = Math.floor(hours * 60);
    return `${minutes}min`;
  }

  if (hours < 24) {
    return `${Math.floor(hours)}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);

  if (remainingHours === 0) {
    return `${days}d`;
  }

  return `${days}d ${remainingHours}h`;
}

/**
 * Formata o tempo de atraso do badge "ATRASADO" do Kanban: em horas quando
 * for menos de 24h, e em dias por extenso (ex: "2 dias", "1 dia e 5h") a
 * partir de 24h.
 */
export function formatOverdueTime(hours: number): string {
  if (hours < 24) {
    return `${Math.floor(hours)}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  const diasLabel = days === 1 ? '1 dia' : `${days} dias`;

  if (remainingHours === 0) {
    return diasLabel;
  }

  return `${diasLabel} e ${remainingHours}h`;
}
