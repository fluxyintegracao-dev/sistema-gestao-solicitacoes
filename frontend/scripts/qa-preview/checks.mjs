/**
 * CHECKS DA DoD QUE RODAM DENTRO DA PÁGINA (page.evaluate).
 * Cada função é AUTOCONTIDA (o Playwright serializa — nada de closures de
 * módulo). Todas devolvem { ITEM: { estado: 'PASSOU'|'FALHOU'|'N/A',
 * motivo?, seletor? } } parciais que o runner funde.
 *
 * Aqui vive o que dá para medir num DOM parado; rolagem, hover, arrasto,
 * clique em filtro e modal ficam no runner (verificar.mjs).
 */

/** Checks estáticos de desktop — um evaluate só, para não ir e vir. */
export function checksEstaticos({ tipo }) {
  const r = {};
  const q = (sel, raiz) => (raiz || document).querySelector(sel);
  const qa = (sel, raiz) => Array.from((raiz || document).querySelectorAll(sel));
  const visivel = (el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const cssPath = (el) => {
    if (!el) return '';
    const partes = [];
    let atual = el;
    while (atual && atual !== document.body && partes.length < 5) {
      let p = atual.tagName.toLowerCase();
      if (atual.id) { partes.unshift(`#${atual.id}`); break; }
      const cls = String(atual.className && atual.className.baseVal !== undefined
        ? atual.className.baseVal : atual.className || '')
        .split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      if (cls) p += `.${cls}`;
      partes.unshift(p);
      atual = atual.parentElement;
    }
    return partes.join(' > ');
  };
  const foraDeModal = (el) => !el.closest('[role="dialog"]');

  const faixa = q('.layout-main .app-page-header');

  /* ---- C2: título 22px, apoio em UMA linha na faixa, contagem junto ---- */
  if (!faixa) {
    r.C2 = { estado: 'FALHOU', motivo: 'faixa .app-page-header ausente' };
  } else {
    const problemas = [];
    const titulo = q('.page-title', faixa) || q('h1', faixa);
    if (!titulo || !visivel(titulo)) {
      problemas.push('título ausente/invisível na faixa');
    } else {
      const fs = parseFloat(getComputedStyle(titulo).fontSize);
      if (fs < 21 || fs > 23.5) problemas.push(`título em ${fs}px (esperado 22px)`);
    }
    const lead = q('.app-page-lead', faixa);
    const apoioAlt = lead || qa('div,p,span', faixa).find((el) => el !== titulo
      && visivel(el) && !el.closest('.app-actionbar')
      && el.textContent.trim().length > 3
      && parseFloat(getComputedStyle(el).fontSize) <= 19
      && el.children.length <= 3 && !el.querySelector('button, .btn'));
    if (!apoioAlt) {
      problemas.push('apoio (contagem/descrição) ausente na faixa');
    } else if (lead) {
      const lh = parseFloat(getComputedStyle(lead).lineHeight) || 24;
      if (lead.getBoundingClientRect().height > lh * 1.6) {
        problemas.push('apoio quebra em mais de uma linha');
      }
      if ((tipo === 'listagem' || tipo === 'mista') && !/\d/.test(lead.textContent)) {
        problemas.push('contagem ausente no apoio');
      }
    }
    r.C2 = problemas.length
      ? { estado: 'FALHOU', motivo: problemas.join('; '), seletor: cssPath(faixa) }
      : { estado: 'PASSOU' };
  }

  /* ---- C3: seta de voltar só em detalhe/registro ---- */
  {
    const seta = faixa && (q('.app-voltar', faixa) || q('[aria-label*="oltar"]', faixa));
    if (tipo === 'detalhe' || tipo === 'form') {
      r.C3 = seta && visivel(seta)
        ? { estado: 'PASSOU' }
        : { estado: 'FALHOU', motivo: 'tela de detalhe/registro sem a seta de voltar à esquerda' };
    } else {
      r.C3 = seta && visivel(seta)
        ? { estado: 'FALHOU', motivo: 'seta de voltar em tela de LISTAGEM (R11: redundante)' }
        : { estado: 'N/A', motivo: 'listagem — seta só em detalhe/registro' };
    }
  }

  /* ---- C4: nome do registro com destaque (detalhe) ---- */
  if (tipo === 'detalhe') {
    const titulo = faixa && (q('.page-title', faixa) || q('h1', faixa));
    const texto = titulo ? titulo.textContent.trim() : '';
    const fs = titulo ? parseFloat(getComputedStyle(titulo).fontSize) : 0;
    const soNumero = /^#?\d+$/.test(texto.replace(/^(titulo|obra)\s*/i, ''));
    r.C4 = titulo && texto.length >= 3 && !soNumero && fs >= 18
      ? { estado: 'PASSOU' }
      : { estado: 'FALHOU', motivo: `identificação do registro sem destaque (texto="${texto.slice(0, 40)}", ${fs}px)` };
  } else {
    r.C4 = { estado: 'N/A', motivo: 'não é tela de detalhe' };
  }

  /* ---- C5: um primário sólido; secundários em contorno ---- */
  if (faixa) {
    const barra = q('.app-actionbar', faixa);
    if (!barra || !visivel(barra) || !qa('.btn', barra).some(visivel)) {
      r.C5 = { estado: 'N/A', motivo: 'tela sem ações no cabeçalho' };
    } else {
      const primarios = qa('.btn-primary', barra).filter(visivel);
      const semContorno = qa('.btn', barra).filter(visivel).filter((b) => (
        !b.classList.contains('btn-primary')
        && !b.classList.contains('btn-outline')
        && !b.classList.contains('app-voltar')
        && !b.closest('.app-mais-wrap')
      ));
      const problemas = [];
      if (primarios.length > 1) problemas.push(`${primarios.length} botões primários (máx 1)`);
      if (semContorno.length) problemas.push(`secundário sem contorno: ${cssPath(semContorno[0])}`);
      r.C5 = problemas.length
        ? { estado: 'FALHOU', motivo: problemas.join('; ') }
        : { estado: 'PASSOU' };
    }
  } else {
    r.C5 = { estado: 'FALHOU', motivo: 'faixa ausente' };
  }

  /* ---- C6: navegação disfarçada de ação (rotulos "Voltar"/"Ir para" fora
     da seta; itens de menu ⋯ com navegação são pegos pelo validador
     estático) ---- */
  {
    const suspeitos = qa('.app-actionbar .btn, .app-mais-item')
      .filter(visivel)
      .filter((el) => !el.classList.contains('app-voltar'))
      .filter((el) => /^(voltar|ir para\b)/i.test(el.textContent.trim()));
    r.C6 = suspeitos.length
      ? { estado: 'FALHOU', motivo: `navegação como ação: "${suspeitos[0].textContent.trim()}"`, seletor: cssPath(suspeitos[0]) }
      : { estado: 'PASSOU' };
  }

  /* ---- Tabelas ---- */
  const tabelas = qa('.resizable-table').filter(visivel).filter(foraDeModal);
  const norm = (a) => (a === 'start' ? 'left' : a === 'end' ? 'right' : a);

  if (!tabelas.length) {
    ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].forEach((k) => {
      r[k] = { estado: 'N/A', motivo: 'tela sem tabela visível' };
    });
  } else {
    /* T1: th × td com o mesmo alinhamento por coluna */
    const t1 = [];
    tabelas.forEach((tab) => {
      const ths = qa('thead th', tab);
      const linha = q('tbody tr', tab);
      if (!linha) return;
      const tds = qa('td', linha);
      ths.forEach((th, i) => {
        const td = tds[i];
        if (!td) return;
        const at = norm(getComputedStyle(th.querySelector('.app-th-alinhavel') || th).textAlign);
        const ad = norm(getComputedStyle(td).textAlign);
        if (at !== ad) t1.push(`${cssPath(tab)} col ${i + 1}: th=${at} td=${ad}`);
      });
    });
    r.T1 = t1.length ? { estado: 'FALHOU', motivo: t1.slice(0, 3).join(' | ') } : { estado: 'PASSOU' };

    /* T2 (parte estática): botão de alinhamento com tooltip presente.
       A visibilidade do ícone no hover é medida pelo runner. */
    const botoes = qa('.app-th-botao').filter(foraDeModal);
    r.T2 = botoes.length && botoes.every((b) => (b.getAttribute('title') || '').toLowerCase().includes('alinhar'))
      ? { estado: 'PASSOU' }
      : { estado: 'FALHOU', motivo: botoes.length ? 'cabeçalho sem tooltip "Alinhar / redimensionar"' : 'tabela sem menu de alinhamento no cabeçalho' };

    /* T4: a sobra do contêiner vai para as colunas de conteúdo */
    const t4 = [];
    tabelas.forEach((tab) => {
      const scroll = tab.closest('.resizable-table-scroll');
      if (!scroll) return;
      const folga = scroll.clientWidth - tab.getBoundingClientRect().width;
      if (folga > 40) t4.push(`${cssPath(tab)}: ${Math.round(folga)}px de sobra não distribuída`);
    });
    r.T4 = t4.length ? { estado: 'FALHOU', motivo: t4.join(' | ') } : { estado: 'PASSOU' };

    /* T5: identificação em MAIÚSCULAS, sublinha em caixa normal */
    const idents = qa('.celula-identidade').filter(visivel).filter(foraDeModal);
    if (!idents.length) {
      r.T5 = { estado: 'N/A', motivo: 'tela sem coluna de identificação' };
    } else {
      const errados = idents.filter((el) => getComputedStyle(el).textTransform !== 'uppercase');
      const subsErrados = qa('.celula-identidade .app-celula-dupla-sub').filter(visivel)
        .filter((el) => getComputedStyle(el).textTransform === 'uppercase');
      r.T5 = errados.length || subsErrados.length
        ? { estado: 'FALHOU', motivo: errados.length ? `identificação sem maiúsculas: ${cssPath(errados[0])}` : `sublinha em maiúsculas: ${cssPath(subsErrados[0])}` }
        : { estado: 'PASSOU' };
    }

    /* T6: o maior texto real visível não corta feio (corte sem tooltip) */
    {
      const alvos = qa('.resizable-table td, .resizable-table td .app-celula-dupla-principal, .resizable-table td .app-celula-dupla-sub')
        .filter(visivel).filter(foraDeModal)
        .filter((el) => !/R\$/.test(el.textContent));
      let pior = null;
      const soTexto = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();
      alvos.forEach((el) => {
        if (el.scrollWidth > el.clientWidth + 2) {
          const tooltip = el.closest('[title]');
          // Compara sem NENHUM espaço: textContent concatena nós sem
          // separador e innerText insere espaços — não podem divergir aqui.
          const completo = tooltip && soTexto(tooltip.getAttribute('title')).includes(soTexto(el.textContent).slice(0, 20));
          if (!completo && (!pior || el.textContent.length > pior.textContent.length)) pior = el;
        }
      });
      r.T6 = pior
        ? { estado: 'FALHOU', motivo: `texto cortado sem tooltip: "${pior.textContent.trim().slice(0, 50)}…"`, seletor: cssPath(pior) }
        : { estado: 'PASSOU' };
    }

    /* T7: NENHUM valor monetário renderizado trunca ou vaza — pior caso
       real da base é o que estiver na tela. */
    {
      const moedas = qa('td, span, div, strong').filter(foraDeModal)
        .filter((el) => el.children.length === 0 && /R\$\s?[\d.]+/.test(el.textContent))
        .filter(visivel);
      const cortados = moedas.filter((el) => el.scrollWidth > el.clientWidth + 1);
      r.T7 = moedas.length === 0
        ? { estado: 'N/A', motivo: 'nenhum valor monetário na tela' }
        : cortados.length
          ? { estado: 'FALHOU', motivo: `valor truncado: "${cortados[0].textContent.trim()}" (largura ${Math.round(cortados[0].clientWidth)}px < conteúdo ${cortados[0].scrollWidth}px)`, seletor: cssPath(cortados[0]) }
          : { estado: 'PASSOU' };
    }
  }

  /* ---- F1: UMA busca, ocupando a largura ---- */
  {
    const buscas = qa('.la-busca, input[placeholder*="uscar"]').filter(visivel).filter(foraDeModal)
      .filter((el) => !el.closest('.la-busca') || el.classList.contains('la-busca'));
    if (!buscas.length) {
      r.F1 = { estado: 'N/A', motivo: 'tela sem busca' };
    } else if (buscas.length > 1) {
      r.F1 = { estado: 'FALHOU', motivo: `${buscas.length} caixas de busca no mesmo contexto (R16)`, seletor: cssPath(buscas[1]) };
    } else {
      const caixa = buscas[0];
      const pai = caixa.closest('.app-bloco-corpo, .app-bloco, .app-filtros') || caixa.parentElement;
      const ocupa = caixa.getBoundingClientRect().width >= pai.getBoundingClientRect().width * 0.9;
      r.F1 = ocupa
        ? { estado: 'PASSOU' }
        : { estado: 'FALHOU', motivo: `busca com ${Math.round(caixa.getBoundingClientRect().width)}px não ocupa a largura da faixa (${Math.round(pai.getBoundingClientRect().width)}px)`, seletor: cssPath(caixa) };
    }
  }

  /* ---- F2: nenhum select na faixa de filtros ---- */
  {
    const selects = qa('.app-filtros select, .la-filtros-linha select').filter(visivel);
    r.F2 = selects.length
      ? { estado: 'FALHOU', motivo: 'select de filtro na faixa (R12: filtro é marcação)', seletor: cssPath(selects[0]) }
      : { estado: 'PASSOU' };
  }

  /* ---- F4: vão filtros → tabela pela escala (16px) ---- */
  {
    const filtros = qa('.app-filtros').filter(visivel).filter(foraDeModal);
    if (!filtros.length) {
      r.F4 = { estado: 'N/A', motivo: 'tela sem linha de filtros' };
    } else {
      const problemas = [];
      filtros.forEach((f) => {
        let prox = f.nextElementSibling;
        while (prox && !visivel(prox)) prox = prox.nextElementSibling;
        if (!prox) return;
        const gap = prox.getBoundingClientRect().top - f.getBoundingClientRect().bottom;
        if (gap < 12 || gap > 24) problemas.push(`${Math.round(gap)}px entre filtros e ${cssPath(prox)} (esperado 16px)`);
      });
      r.F4 = problemas.length ? { estado: 'FALHOU', motivo: problemas.join(' | ') } : { estado: 'PASSOU' };
    }
  }

  /* ---- B1: canvas acinzentado + blocos brancos ---- */
  {
    const bloco = qa('.app-bloco, .card').filter(visivel)[0];
    if (!bloco) {
      r.B1 = { estado: 'FALHOU', motivo: 'nenhum bloco na tela' };
    } else {
      // O canvas é o primeiro fundo OPACO atrás do bloco (o layout-main pode
      // ser transparente sobre o shell).
      let atras = bloco.parentElement;
      let cCanvas = '';
      while (atras && atras !== document.documentElement) {
        const c = getComputedStyle(atras).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && !/rgba\([\d ,.]+, 0\)/.test(c)) { cCanvas = c; break; }
        atras = atras.parentElement;
      }
      if (!cCanvas) cCanvas = getComputedStyle(document.body).backgroundColor;
      const cBloco = getComputedStyle(bloco).backgroundColor;
      r.B1 = cCanvas && cCanvas !== cBloco
        ? { estado: 'PASSOU' }
        : { estado: 'FALHOU', motivo: `canvas (${cCanvas || 'transparente'}) não se distingue do bloco (${cBloco})` };
    }
  }

  /* ---- B2: um primário com barra de cor; secundários neutros ---- */
  {
    const blocos = qa('.app-bloco').filter(visivel).filter(foraDeModal);
    if (!blocos.length) {
      r.B2 = { estado: 'N/A', motivo: 'tela de registro com composição própria (sem blocos padrão)' };
    } else {
      const primarios = blocos.filter((b) => b.classList.contains('app-bloco--primario'));
      r.B2 = primarios.length === 1
        ? { estado: 'PASSOU' }
        : { estado: 'FALHOU', motivo: `${primarios.length} bloco(s) primário(s) visível(is) (esperado 1)` };
    }
  }

  /* ---- B3: informação uma vez só (apoio da faixa não repete no bloco) ---- */
  {
    const normTexto = (el) => el.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    const leadFaixa = faixa && q('.app-page-lead', faixa);
    const leadsBloco = qa('.app-bloco-lead').filter(visivel);
    const dup = leadFaixa && leadsBloco.find((b) => {
      const a = normTexto(leadFaixa); const c = normTexto(b);
      return a && c && (a === c || a.includes(c) || c.includes(a));
    });
    r.B3 = dup
      ? { estado: 'FALHOU', motivo: 'apoio da faixa repetido em bloco', seletor: cssPath(dup) }
      : { estado: 'PASSOU' };
  }

  /* ---- B4: campo vazio some com contador ---- */
  if (tipo === 'detalhe') {
    const toggle = qa('.app-campos-toggle').filter(visivel);
    const temCampos = qa('.app-stat, [class*="app-campos"]').length > 0;
    if (!temCampos) {
      r.B4 = { estado: 'N/A', motivo: 'tela sem grid de campos' };
    } else {
      const vazios = qa('.app-stat--vazio').filter(visivel);
      r.B4 = vazios.length && !toggle.length
        ? { estado: 'FALHOU', motivo: `${vazios.length} campo(s) vazio(s) exibido(s) sem alternador` }
        : { estado: 'PASSOU' };
    }
  } else {
    r.B4 = { estado: 'N/A', motivo: 'não é tela de detalhe' };
  }

  /* ---- B5: nenhum texto solto fora de superfície ---- */
  {
    const superficies = '.app-page-header, .app-bloco, .card, .app-summary-card, .app-stat, .empty-state, [role="dialog"], table, .app-tabela-cards, .obra-tab-btn, nav, header, aside, .app-filtros';
    const soltos = qa('.app-pagina > p, .app-pagina > span, .app-pagina > div > p')
      .filter(visivel)
      .filter((el) => el.textContent.trim().length > 0)
      .filter((el) => !el.closest(superficies));
    r.B5 = soltos.length
      ? { estado: 'FALHOU', motivo: `texto solto: "${soltos[0].textContent.trim().slice(0, 40)}…"`, seletor: cssPath(soltos[0]) }
      : { estado: 'PASSOU' };
  }

  /* ---- M1: alvo mínimo 32px ---- */
  {
    const clicaveis = qa('button, a.btn, [role="button"]').filter(visivel).filter(foraDeModal)
      .filter((el) => !el.closest('nav, .sidebar, .topbar-shell'));
    const pequenos = clicaveis.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width < 31.5 || rect.height < 31.5;
    });
    r.M1 = pequenos.length
      ? { estado: 'FALHOU', motivo: `${pequenos.length} alvo(s) < 32px; primeiro: ${cssPath(pequenos[0])} (${Math.round(pequenos[0].getBoundingClientRect().width)}×${Math.round(pequenos[0].getBoundingClientRect().height)}px)` }
      : { estado: 'PASSOU' };
  }

  /* ---- M3: contraste AA (amostra dos textos estruturais) ---- */
  {
    const parse = (c) => {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
    };
    const lum = ([r2, g, b]) => {
      const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r2) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const fundoDe = (el) => {
      let atual = el;
      while (atual && atual !== document.documentElement) {
        const c = parse(getComputedStyle(atual).backgroundColor);
        if (c && c[3] > 0.9) return c;
        atual = atual.parentElement;
      }
      return [255, 255, 255, 1];
    };
    const amostra = qa('.page-title, .app-page-lead, .app-bloco-titulo, .app-bloco-lead, th, td, .btn, .app-stat-label, .app-stat-valor, label')
      .filter(visivel).filter(foraDeModal).slice(0, 120);
    const reprovados = [];
    amostra.forEach((el) => {
      const cs = getComputedStyle(el);
      const cor = parse(cs.color);
      if (!cor) return;
      const fundo = fundoDe(el);
      const l1 = lum(cor); const l2 = lum(fundo);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const fs = parseFloat(cs.fontSize);
      const grande = fs >= 24 || (fs >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
      const minimo = grande ? 3 : 4.5;
      if (ratio < minimo && el.textContent.trim()) {
        reprovados.push(`${cssPath(el)} (${ratio.toFixed(2)}:1)`);
      }
    });
    r.M3 = reprovados.length
      ? { estado: 'FALHOU', motivo: `contraste abaixo de AA: ${reprovados.slice(0, 3).join(' | ')}` }
      : { estado: 'PASSOU' };
  }

  /* ---- M4: previsto azul × realizado vermelho, cor da série coerente ---- */
  {
    const parse = (c) => {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
      return m ? [+m[1], +m[2], +m[3]] : null;
    };
    const prevTexto = qa('.texto-previsto').filter(visivel).map((el) => parse(getComputedStyle(el).color)).filter(Boolean);
    const realTexto = qa('.texto-realizado').filter(visivel).map((el) => parse(getComputedStyle(el).color)).filter(Boolean);
    const prevFundo = qa('.serie-prevista').filter(visivel).map((el) => parse(getComputedStyle(el).backgroundColor)).filter(Boolean);
    const realFundo = qa('.serie-realizada').filter(visivel).map((el) => parse(getComputedStyle(el).backgroundColor)).filter(Boolean);
    const todos = prevTexto.length + realTexto.length + prevFundo.length + realFundo.length;
    if (!todos) {
      r.M4 = { estado: 'N/A', motivo: 'tela sem comparação previsto × realizado' };
    } else {
      const problemas = [];
      const azul = ([r2, , b]) => b > r2;
      const vermelho = ([r2, , b]) => r2 > b;
      const mesma = (lista) => lista.every((c) => c.join() === lista[0].join());
      if (![...prevTexto, ...prevFundo].every(azul)) problemas.push('série prevista não é azul');
      if (![...realTexto, ...realFundo].every(vermelho)) problemas.push('série realizada não é vermelha');
      if (prevTexto.length > 1 && !mesma(prevTexto)) problemas.push('cores diferentes na mesma série prevista');
      if (realTexto.length > 1 && !mesma(realTexto)) problemas.push('cores diferentes na mesma série realizada');
      r.M4 = problemas.length ? { estado: 'FALHOU', motivo: problemas.join('; ') } : { estado: 'PASSOU' };
    }
  }

  /* ---- R2: campos da mesma linha alinhados (formulários visíveis) ---- */
  {
    const grids = qa('.form-grid, form .grid').filter(visivel);
    if (!grids.length) {
      r.R2 = { estado: 'N/A', motivo: 'tela sem formulário visível (cadastro em modal é medido ao abrir)' };
    } else {
      const problemas = [];
      grids.forEach((g) => {
        const campos = qa('input, select, textarea', g).filter(visivel)
          .filter((el) => el.type !== 'checkbox' && el.type !== 'radio' && el.tagName !== 'TEXTAREA');
        const porLinha = new Map();
        campos.forEach((c) => {
          const top = Math.round(c.getBoundingClientRect().top / 8) * 8;
          if (!porLinha.has(top)) porLinha.set(top, []);
          porLinha.get(top).push(c);
        });
        porLinha.forEach((linha) => {
          if (linha.length < 2) return;
          const alturas = linha.map((c) => Math.round(c.getBoundingClientRect().height));
          if (Math.max(...alturas) - Math.min(...alturas) > 2) {
            problemas.push(`alturas ${alturas.join('/')}px na mesma linha (${cssPath(linha[0])})`);
          }
        });
      });
      r.R2 = problemas.length ? { estado: 'FALHOU', motivo: problemas.slice(0, 2).join(' | ') } : { estado: 'PASSOU' };
    }
  }

  return r;
}

/** Geometria da faixa após rolagem (chamado com a página ROLADA). */
export function checkFaixaRolada() {
  const topbar = document.querySelector('.fx-topbar, .topbar-shell');
  const faixa = document.querySelector('.layout-main .app-page-header');
  if (!topbar || !faixa) return { ok: false, motivo: 'topbar ou faixa ausente' };
  const rt = topbar.getBoundingClientRect();
  const rf = faixa.getBoundingClientRect();
  const vao = rf.top - rt.bottom;
  const csFaixa = getComputedStyle(faixa);
  const alphaMatch = csFaixa.backgroundColor.match(/rgba?\([\d.,\s]+?,\s*([\d.]+)\)$/);
  const opaca = !alphaMatch || parseFloat(alphaMatch[1]) >= 0.99;
  // Conteúdo visível no vão? Amostra elementFromPoint na linha média do vão.
  let conteudoNoVao = null;
  if (vao > 1) {
    const y = rt.bottom + vao / 2;
    for (const frac of [0.2, 0.5, 0.8]) {
      const x = rf.left + rf.width * frac;
      const el = document.elementFromPoint(x, y);
      if (el && !el.closest('.topbar-shell, .app-page-header, .sidebar, nav')) {
        conteudoNoVao = el.tagName + '.' + String(el.className).split(/\s+/)[0];
        break;
      }
    }
  }
  // Cabeçalho PADRÃO (PageHeader) tem a sentinela de compactação logo antes;
  // cabeçalho custom (ex.: gestão da obra, com métricas e abas) gruda e não
  // pode ter vão, mas não compacta — o check respeita a diferença.
  const sentinela = faixa.previousElementSibling;
  const padrao = !!(sentinela && sentinela.tagName === 'SPAN' && sentinela.getAttribute('aria-hidden') === 'true');
  return {
    ok: true,
    vao: Math.round(vao * 10) / 10,
    opaca,
    conteudoNoVao,
    padrao,
    compacto: faixa.classList.contains('app-page-header--compacto'),
    alturaFaixa: Math.round(rf.height),
    visivel: rf.bottom > 0 && rf.top < innerHeight
  };
}

/** Checks de mobile (viewport 390). */
export function checksMobile() {
  const r = {};
  const qa = (sel) => Array.from(document.querySelectorAll(sel));
  const visivel = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  /* X1: tabela vira cards */
  const tabelas = qa('.resizable-table').filter(visivel);
  const cards = qa('.app-tabela-cards').filter(visivel);
  const laCards = qa('.la-cards, .la-card').filter(visivel);
  if (!tabelas.length && !cards.length && !laCards.length) {
    r.X1 = { estado: 'N/A', motivo: 'tela sem tabela/lista tabular' };
  } else {
    r.X1 = tabelas.length
      ? { estado: 'FALHOU', motivo: 'tabela desktop ainda visível em 390px (não virou cards)' }
      : { estado: 'PASSOU' };
  }

  /* X3: nada estoura a largura */
  const doc = document.scrollingElement || document.documentElement;
  if (doc.scrollWidth > innerWidth + 1) {
    let culpado = '';
    qa('body *').some((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > innerWidth + 2 && rect.width > 40 && visivel(el)
        && !el.closest('.resizable-table-scroll')) {
        culpado = el.tagName + '.' + String(el.className).split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        return true;
      }
      return false;
    });
    r.X3 = { estado: 'FALHOU', motivo: `página com ${doc.scrollWidth}px em viewport de ${innerWidth}px${culpado ? ` (estoura: ${culpado})` : ''}` };
  } else {
    r.X3 = { estado: 'PASSOU' };
  }

  return r;
}
