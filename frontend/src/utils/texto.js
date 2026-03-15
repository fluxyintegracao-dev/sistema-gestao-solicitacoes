export function corrigirTextoCorrompido(valor) {
  const texto = String(valor ?? '');
  if (!texto) return texto;

  const suspeito = /Ã.|Â.|�|ðŸ|â|çÃ|ãÃ/i.test(texto);
  if (!suspeito) {
    return texto;
  }

  try {
    return decodeURIComponent(escape(texto));
  } catch {
    return texto
      .replace(/Ã§/g, 'ç')
      .replace(/Ã£/g, 'ã')
      .replace(/Ã¡/g, 'á')
      .replace(/Ã¢/g, 'â')
      .replace(/Ãª/g, 'ê')
      .replace(/Ã©/g, 'é')
      .replace(/Ã³/g, 'ó')
      .replace(/Ã´/g, 'ô')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã­/g, 'í')
      .replace(/Ã€/g, 'À')
      .replace(/Ã/g, 'à')
      .replace(/Â/g, '');
  }
}
