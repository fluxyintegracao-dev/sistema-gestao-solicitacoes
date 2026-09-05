import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('http://localhost:5183/qa-temp.html', { waitUntil: 'networkidle' }).catch((e) => console.log('goto err', e.message));
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(500);
const info = await page.evaluate(() => {
  const c = document.querySelector('[data-cenario="evolucao-fix"]');
  const faixa = c.querySelector('.app-page-header');
  const h1 = c.querySelector('.page-title');
  const lead = c.querySelector('.app-page-lead');
  const actionbar = c.querySelector('.app-actionbar');
  const rect = (el) => (({top,left,right,bottom,width,height}) => ({top,left,right,bottom,width,height}))(el.getBoundingClientRect());
  return {
    faixaHeight: faixa.getBoundingClientRect().height,
    h1: { ...rect(h1), text: h1.textContent },
    lead: { ...rect(lead), scrollWidth: lead.scrollWidth, clientWidth: lead.clientWidth, ellipsisAtiva: lead.scrollWidth > lead.clientWidth },
    actionbar: rect(actionbar),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
