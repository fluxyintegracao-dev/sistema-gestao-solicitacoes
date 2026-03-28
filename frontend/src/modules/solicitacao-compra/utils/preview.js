function getLowerPreviewValue(value) {
  return String(value || '').toLowerCase();
}

export function isPdfPreview(name, url) {
  const value = `${getLowerPreviewValue(name)} ${getLowerPreviewValue(url)}`;
  return value.includes('.pdf');
}

export function isImagePreview(name, url) {
  const value = `${getLowerPreviewValue(name)} ${getLowerPreviewValue(url)}`;
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)/.test(value);
}

export async function criarPreviewCompra({ title, name, url }) {
  if (!url) {
    throw new Error('Arquivo nao encontrado.');
  }

  if (isPdfPreview(name, url)) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Erro ao carregar PDF');
    }

    const blob = await response.blob();
    return {
      title,
      name,
      url: window.URL.createObjectURL(blob)
    };
  }

  return { title, name, url };
}
