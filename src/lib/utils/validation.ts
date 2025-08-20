export interface ValidationError {
  field: string;
  message: string;
}

export function validateProject(data: {
  empresaIntegradora: string;
  nomeClienteFinal: string;
  distribuidora: string;
  potencia: string;
  dataEntrega: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.empresaIntegradora.trim()) {
    errors.push({
      field: 'empresaIntegradora',
      message: 'Empresa integradora é obrigatória',
    });
  }

  if (!data.nomeClienteFinal.trim()) {
    errors.push({
      field: 'nomeClienteFinal',
      message: 'Nome do cliente final é obrigatório',
    });
  }

  if (!data.distribuidora.trim()) {
    errors.push({
      field: 'distribuidora',
      message: 'Distribuidora é obrigatória',
    });
  }

  if (!data.potencia) {
    errors.push({
      field: 'potencia',
      message: 'Potência é obrigatória',
    });
  } else {
    const potencia = parseFloat(data.potencia);
    if (isNaN(potencia) || potencia <= 0) {
      errors.push({
        field: 'potencia',
        message: 'Potência deve ser um número positivo',
      });
    }
  }

  if (!data.dataEntrega) {
    errors.push({
      field: 'dataEntrega',
      message: 'Data de entrega é obrigatória',
    });
  } else {
    const entregaDate = new Date(data.dataEntrega);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (entregaDate < today) {
      errors.push({
        field: 'dataEntrega',
        message: 'Data de entrega não pode ser no passado',
      });
    }
  }

  return errors;
} 