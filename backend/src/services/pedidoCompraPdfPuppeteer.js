const fs = require('fs');
const { renderPedidoCompraPdfHtml } = require('./pedidoCompraPdfHtmlTemplate');

const DEFAULT_BROWSER_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_EXECUTABLE_PATH,
  process.env.EDGE_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);

function loadPuppeteerCore() {
  try {
    // dependencia opcional para manter fallback funcional quando o browser nao estiver disponivel
    return require('puppeteer-core');
  } catch {
    return null;
  }
}

function findBrowserExecutablePath() {
  return DEFAULT_BROWSER_PATHS.find((candidate) => fs.existsSync(candidate)) || '';
}

function isPedidoCompraHtmlPdfAvailable() {
  return Boolean(loadPuppeteerCore() && findBrowserExecutablePath());
}

async function generatePedidoCompraPdfBufferFromHtml(pedido, options = {}) {
  const puppeteer = loadPuppeteerCore();
  if (!puppeteer) {
    throw new Error('Dependencia puppeteer-core nao instalada.');
  }

  const executablePath = options.executablePath || findBrowserExecutablePath();
  if (!executablePath) {
    throw new Error('Nenhum browser compativel encontrado para renderizar o PDF HTML.');
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 1240,
      height: 1754,
      deviceScaleFactor: 1
    });

    const html = renderPedidoCompraPdfHtml(pedido, {
      generatedAt: options.generatedAt
    });

    await page.setContent(html, {
      waitUntil: ['domcontentloaded', 'networkidle0']
    });
    await page.emulateMediaType('print');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = {
  findBrowserExecutablePath,
  generatePedidoCompraPdfBufferFromHtml,
  isPedidoCompraHtmlPdfAvailable
};
