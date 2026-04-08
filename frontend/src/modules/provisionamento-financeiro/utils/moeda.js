export function formatarMoedaBRL(valor) {
  const numero = Number(valor || 0);
  if (!Number.isFinite(numero)) {
    return 'R$ 0,00';
  }

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export function normalizarEntradaMoeda(raw) {
  const somenteDigitos = String(raw || '').replace(/\D/g, '');
  if (!somenteDigitos) {
    return {
      textoFormatado: '',
      valorNumerico: ''
    };
  }

  const numero = Number(somenteDigitos) / 100;
  return {
    textoFormatado: formatarMoedaBRL(numero),
    valorNumerico: numero.toFixed(2)
  };
}

export function inicializarEntradaMoeda(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return {
      textoFormatado: '',
      valorNumerico: ''
    };
  }

  const numero = Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(numero)) {
    return {
      textoFormatado: '',
      valorNumerico: ''
    };
  }

  return {
    textoFormatado: formatarMoedaBRL(numero),
    valorNumerico: numero.toFixed(2)
  };
}
