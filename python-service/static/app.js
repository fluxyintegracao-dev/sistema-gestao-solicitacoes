const specMap = {};
if (Array.isArray(specs)) {
  for (const spec of specs) {
    if (!specMap[spec.insumo_id]) {
      specMap[spec.insumo_id] = [];
    }
    specMap[spec.insumo_id].push(spec.nome);
  }
}

const unidadeMap = {};
if (Array.isArray(insumoUnidades)) {
  for (const item of insumoUnidades) {
    if (!unidadeMap[item.insumo_id]) {
      unidadeMap[item.insumo_id] = [];
    }
    unidadeMap[item.insumo_id].push(item.nome);
  }
}

function formatApropriacaoLabel(nome, codigo) {
  const nomeLimpo = String(nome || "").trim();
  const codigoLimpo = String(codigo || "").trim();
  if (nomeLimpo && codigoLimpo) {
    return `${nomeLimpo} - ${codigoLimpo}`;
  }
  return nomeLimpo || codigoLimpo;
}

const apropriacaoMap = {};
if (Array.isArray(apropriacoes)) {
  for (const item of apropriacoes) {
    if (!apropriacaoMap[item.obra_id]) {
      apropriacaoMap[item.obra_id] = [];
    }
    const codigo = String(item.numero || "").trim();
    const nome = String(item.nome || "").trim();
    if (!codigo) continue;
    if (apropriacaoMap[item.obra_id].some((entry) => entry.codigo === codigo)) {
      continue;
    }
    apropriacaoMap[item.obra_id].push({
      codigo,
      nome,
      label: formatApropriacaoLabel(nome, codigo),
    });
  }

  for (const obraId of Object.keys(apropriacaoMap)) {
    apropriacaoMap[obraId].sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" })
    );
  }
}

const insumoList = document.getElementById("insumo-list");
const searchInput = document.getElementById("insumo-search");
const tableBody = document.querySelector("#itens-table tbody");
const obraSelect = document.getElementById("obra");
const necessarioBase = document.getElementById("necessario_em");
const bulkSelect = document.getElementById("bulk-apropriacao");
const bulkApplyBtn = document.getElementById("bulk-apply");
const bulkUnidade = document.getElementById("bulk-unidade");
const bulkQuantidade = document.getElementById("bulk-quantidade");
const toggleAllBtn = document.getElementById("toggle-all");
const categoriaFilter = document.getElementById("categoria-filter");
const clearItemsBtn = document.getElementById("clear-items");
const selectedCountEl = document.getElementById("selected-count");
const checkedCountEl = document.getElementById("checked-count");
const reqForm = document.getElementById("req-form");
const feedbackEl = document.getElementById("request-feedback");
const leadHint = document.getElementById("lead-time-hint");
const requestLayout = document.querySelector(".request-layout");
const toggleSidebarBtn = document.getElementById("toggle-sidebar");
const customInsumoInput = document.getElementById("custom-insumo-nome");
const customInsumoBtn = document.getElementById("custom-insumo-add");

let rowIndex = 0;
let categoriaAtiva = "";

function showFeedback(message, type = "error") {
  if (!feedbackEl) return;
  feedbackEl.textContent = message || "";
  feedbackEl.classList.remove("error", "info", "show");
  if (!message) return;
  feedbackEl.classList.add(type === "info" ? "info" : "error", "show");
}

const SIDEBAR_PREF_KEY = "csc_sidebar_collapsed";

function readSidebarPreference() {
  try {
    return localStorage.getItem(SIDEBAR_PREF_KEY) === "1";
  } catch (_) {
    return false;
  }
}

function setSidebarCollapsed(collapsed, persist = true) {
  if (!requestLayout || !toggleSidebarBtn) return;
  requestLayout.classList.toggle("is-collapsed", collapsed);
  toggleSidebarBtn.textContent = collapsed ? "Mostrar insumos" : "Ocultar insumos";
  toggleSidebarBtn.setAttribute("aria-pressed", collapsed ? "true" : "false");
  toggleSidebarBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  if (persist) {
    try {
      localStorage.setItem(SIDEBAR_PREF_KEY, collapsed ? "1" : "0");
    } catch (_) {
      // ignore storage errors
    }
  }
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatPtDateFromIso(isoValue) {
  const raw = String(isoValue || "");
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return raw;
  return `${d}/${m}/${y}`;
}

function getLeadDaysForCount(itemCount) {
  const rules = Array.isArray(leadRules) ? leadRules : [];
  for (const rule of rules) {
    const maxItems = Number(rule.max_items);
    const days = Number(rule.dias);
    if (!Number.isFinite(maxItems) || !Number.isFinite(days)) continue;
    if (itemCount <= maxItems) return days;
  }
  const fallback = Number(leadFallbackDays);
  return Number.isFinite(fallback) ? fallback : 5;
}

function formatLeadWindowLabel(days) {
  const safeDays = Number(days);
  if (!Number.isFinite(safeDays) || safeDays <= 0) return "";
  const weeks = safeDays / 7;
  if (Number.isInteger(weeks)) {
    const unit = weeks === 1 ? "semana" : "semanas";
    return `${weeks} ${unit}`;
  }

  const halfWeeks = Math.round(weeks * 2) / 2;
  if (Math.abs(weeks - halfWeeks) < 0.08 && Math.abs(halfWeeks % 1) > 0) {
    const intPart = Math.floor(halfWeeks);
    if (intPart <= 0) return "meia semana";
    if (intPart === 1) return "1 semana e meia";
    return `${intPart} semanas e meia`;
  }

  return `${String(weeks.toFixed(1)).replace(".", ",")} semanas`;
}

function enforceMinDate(field, minIso) {
  if (!field) return;
  field.min = minIso;
  if (!field.value || (minIso && field.value < minIso)) {
    field.value = minIso;
  }
}

function refreshLeadTimeRules() {
  if (!necessarioBase) return;
  const rows = getDataRows();
  const itemCount = rows.length;
  const leadDays = getLeadDaysForCount(itemCount);
  const leadLabel = formatLeadWindowLabel(leadDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + leadDays);
  const minIso = toIsoDate(minDate);

  enforceMinDate(necessarioBase, minIso);
  rows.forEach((row) => {
    const field = row.querySelector(".row-necessario");
    enforceMinDate(field, minIso);
  });

  if (leadHint) {
    if (itemCount <= 0) {
      leadHint.textContent =
        "Adicione insumos para calcular automaticamente o prazo de atendimento.";
      return;
    }
    leadHint.textContent =
      `Com ${itemCount} insumo(s), o prazo estimado é de ${leadDays} dia(s)` +
      (leadLabel ? ` (${leadLabel})` : "") +
      `. Data mínima permitida: ${formatPtDateFromIso(minIso)}.`;
  }
}

function buildMinDateErrorMessage(itemCount, minIso) {
  const leadDays = getLeadDaysForCount(itemCount);
  const leadLabel = formatLeadWindowLabel(leadDays);
  return (
    `Para ${itemCount} insumo(s), a data mínima permitida de necessidade é ` +
    `${formatPtDateFromIso(minIso)}` +
    (leadLabel ? ` (${leadDays} dia(s), ${leadLabel})` : ` (${leadDays} dia(s))`) +
    "."
  );
}

function getDataRows() {
  if (!tableBody) return [];
  return Array.from(tableBody.querySelectorAll("tr")).filter(
    (row) => !row.classList.contains("table-empty-row")
  );
}

function updateRequestCounters() {
  const rows = getDataRows();
  const checked = rows.filter((row) => {
    const check = row.querySelector(".row-check");
    return check && check.checked;
  }).length;

  if (selectedCountEl) selectedCountEl.textContent = String(rows.length);
  if (checkedCountEl) checkedCountEl.textContent = String(checked);

  if (toggleAllBtn) {
    const allChecked = rows.length > 0 && checked === rows.length;
    toggleAllBtn.textContent = allChecked
      ? "Deselecionar todos"
      : "Selecionar todos";
  }
}

function syncEmptyRow() {
  if (!tableBody) return;
  const rows = getDataRows();
  const empty = tableBody.querySelector(".table-empty-row");
  if (rows.length === 0) {
    if (!empty) {
      const tr = document.createElement("tr");
      tr.className = "table-empty-row";
      const td = document.createElement("td");
      td.colSpan = 9;
      td.className = "table-empty";
      td.textContent =
        "Nenhum item selecionado. Clique nos insumos ao lado para montar a solicitação.";
      tr.appendChild(td);
      tableBody.appendChild(tr);
    }
  } else if (empty) {
    empty.remove();
  }
  updateRequestCounters();
  refreshLeadTimeRules();
}

function buildSpecInput(insumoId) {
  const wrapper = document.createElement("div");
  const input = document.createElement("input");
  input.type = "text";
  input.name = `itens[${rowIndex}][especificacao]`;
  input.placeholder = "Especificação (opcional)";
  const listId = `spec-list-${rowIndex}`;
  input.setAttribute("list", listId);

  const dataList = document.createElement("datalist");
  dataList.id = listId;
  const list = specMap[insumoId] || [];
  for (const item of list) {
    const option = document.createElement("option");
    option.value = item;
    dataList.appendChild(option);
  }

  wrapper.appendChild(input);
  wrapper.appendChild(dataList);
  return wrapper;
}

function buildUnidadeField(insumoId, fieldName) {
  const unidades = unidadeMap[insumoId] || [];
  const wrapper = document.createElement("div");
  const input = document.createElement("input");
  input.type = "text";
  input.name = fieldName;
  input.placeholder = "Ex: m2";
  input.required = true;
  input.className = "row-unidade";

  if (unidades.length > 0) {
    const listId = `unidade-list-${rowIndex}`;
    const dataList = document.createElement("datalist");
    dataList.id = listId;
    for (const unidade of unidades) {
      const option = document.createElement("option");
      option.value = unidade;
      dataList.appendChild(option);
    }
    input.setAttribute("list", listId);
    input.value = unidades[0] || "";
    wrapper.appendChild(input);
    wrapper.appendChild(dataList);
    return wrapper;
  }

  wrapper.appendChild(input);
  return wrapper;
}

function buildApropriacaoSelect(obraId, name) {
  const select = document.createElement("select");
  select.name = name;
  select.className = "apropriacao-select";
  select.required = true;

  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "Selecione";
  select.appendChild(opt);

  const list = apropriacaoMap[obraId] || [];
  for (const item of list) {
    const option = document.createElement("option");
    option.value = item.codigo;
    option.textContent = item.label;
    select.appendChild(option);
  }
  return select;
}

function buildBulkSelect(obraId) {
  if (!bulkSelect) return;
  bulkSelect.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "Selecione";
  bulkSelect.appendChild(opt);
  const list = apropriacaoMap[obraId] || [];
  for (const item of list) {
    const option = document.createElement("option");
    option.value = item.codigo;
    option.textContent = item.label;
    bulkSelect.appendChild(option);
  }
}

function refreshApropriacaoSelects() {
  if (!obraSelect) return;
  const obraId = obraSelect.value;
  const selects = document.querySelectorAll(".apropriacao-select");
  selects.forEach((select) => {
    const current = select.value;
    const name = select.name;
    const novo = buildApropriacaoSelect(obraId, name);
    if (current && Array.from(novo.options).some((o) => o.value === current)) {
      novo.value = current;
    }
    select.replaceWith(novo);
  });
  buildBulkSelect(obraId);
}

function buildProdutoField(itemIndex) {
  const wrapper = document.createElement("div");
  wrapper.className = "row-product";

  const link = document.createElement("input");
  link.type = "text";
  link.name = `itens[${itemIndex}][link_produto]`;
  link.placeholder = "Link do produto (opcional)";
  link.className = "row-link";

  const file = document.createElement("input");
  file.type = "file";
  file.name = `itens[${itemIndex}][foto]`;
  file.accept = ".png,.jpg,.jpeg,.webp,.jfif";
  file.className = "row-photo-input";

  const clipboardField = document.createElement("input");
  clipboardField.type = "hidden";
  clipboardField.name = `itens[${itemIndex}][foto_clipboard]`;
  clipboardField.className = "row-photo-clipboard";

  const toolbar = document.createElement("div");
  toolbar.className = "row-photo-toolbar";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "row-photo-trigger";
  trigger.setAttribute("aria-expanded", "false");

  const cameraIcon = document.createElement("span");
  cameraIcon.className = "camera-icon";
  cameraIcon.setAttribute("aria-hidden", "true");

  const triggerText = document.createElement("span");
  triggerText.textContent = "Foto";
  trigger.appendChild(cameraIcon);
  trigger.appendChild(triggerText);

  const status = document.createElement("span");
  status.className = "row-photo-status";
  status.textContent = "Sem foto";

  const panel = document.createElement("div");
  panel.className = "row-photo-panel";

  const dropZone = document.createElement("div");
  dropZone.className = "row-photo-drop";
  dropZone.tabIndex = 0;
  dropZone.textContent = "Arraste, clique ou cole (Ctrl+V)";

  const metaRow = document.createElement("div");
  metaRow.className = "row-photo-meta";

  const fileName = document.createElement("span");
  fileName.className = "row-photo-name";
  fileName.textContent = "Nenhum arquivo";

  const removePhotoBtn = document.createElement("button");
  removePhotoBtn.type = "button";
  removePhotoBtn.className = "ghost-button row-photo-remove";
  removePhotoBtn.textContent = "Remover";

  const preview = document.createElement("img");
  preview.className = "row-photo-preview";
  preview.alt = "Previa da foto";

  let previewUrl = "";

  const setStatus = (text, ready = false) => {
    status.textContent = text;
    status.classList.toggle("ready", ready);
  };

  const clearPhoto = () => {
    file.value = "";
    clipboardField.value = "";
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = "";
    }
    preview.removeAttribute("src");
    preview.classList.remove("show");
    fileName.textContent = "Nenhum arquivo";
    setStatus("Sem foto");
  };

  const showDataUrlPreview = (dataUrl, label) => {
    file.value = "";
    clipboardField.value = dataUrl;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = "";
    }
    preview.src = dataUrl;
    preview.classList.add("show");
    fileName.textContent = label || "Imagem colada";
    setStatus("Foto pronta", true);
  };

  const showFilePreview = (imageFile) => {
    clipboardField.value = "";
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    previewUrl = URL.createObjectURL(imageFile);
    preview.src = previewUrl;
    preview.classList.add("show");
    fileName.textContent = imageFile.name || "Imagem selecionada";
    setStatus("Foto pronta", true);
  };

  const handlePastedImage = (event) => {
    const items = event.clipboardData ? event.clipboardData.items : [];
    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      const imageFile = item.getAsFile();
      if (!imageFile) continue;
      const reader = new FileReader();
      reader.onload = () => {
        showDataUrlPreview(String(reader.result || ""), "Imagem colada");
      };
      reader.readAsDataURL(imageFile);
      event.preventDefault();
      break;
    }
  };

  const togglePanel = () => {
    const open = panel.classList.toggle("open");
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      dropZone.focus();
    }
  };

  trigger.addEventListener("click", togglePanel);

  dropZone.addEventListener("click", () => file.click());
  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      file.click();
    }
  });
  dropZone.addEventListener("paste", handlePastedImage);

  panel.addEventListener("paste", handlePastedImage);

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    const files = event.dataTransfer ? Array.from(event.dataTransfer.files || []) : [];
    const imageFile = files.find((current) => current.type.startsWith("image/"));
    if (!imageFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      showDataUrlPreview(String(reader.result || ""), imageFile.name || "Imagem arrastada");
    };
    reader.readAsDataURL(imageFile);
  });

  file.addEventListener("change", () => {
    const selected = file.files && file.files[0];
    if (!selected) {
      clearPhoto();
      return;
    }
    showFilePreview(selected);
  });

  removePhotoBtn.addEventListener("click", clearPhoto);

  toolbar.appendChild(trigger);
  toolbar.appendChild(status);
  metaRow.appendChild(fileName);
  metaRow.appendChild(removePhotoBtn);
  panel.appendChild(dropZone);
  panel.appendChild(metaRow);
  panel.appendChild(preview);

  wrapper.appendChild(link);
  wrapper.appendChild(toolbar);
  wrapper.appendChild(panel);
  wrapper.appendChild(file);
  wrapper.appendChild(clipboardField);
  return wrapper;
}

function addRow(insumoId, insumoNome, options = {}) {
  if (!tableBody) return;

  const nome = String(insumoNome || "").trim() || "Insumo sem nome";
  const isCustom = Boolean(options.isCustom);

  const tr = document.createElement("tr");

  const tdCheck = document.createElement("td");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "row-check";
  tdCheck.appendChild(checkbox);

  const tdInsumo = document.createElement("td");
  tdInsumo.textContent = nome;
  if (isCustom) {
    tdInsumo.classList.add("custom-insumo-cell");
  }
  const inputInsumo = document.createElement("input");
  inputInsumo.type = "hidden";
  inputInsumo.name = `itens[${rowIndex}][insumo]`;
  inputInsumo.value = isCustom ? "" : insumoId;
  tdInsumo.appendChild(inputInsumo);

  if (isCustom) {
    const inputCustom = document.createElement("input");
    inputCustom.type = "hidden";
    inputCustom.name = `itens[${rowIndex}][insumo_custom]`;
    inputCustom.value = nome;
    tdInsumo.appendChild(inputCustom);

    const badge = document.createElement("span");
    badge.className = "custom-tag";
    badge.textContent = "manual";
    tdInsumo.appendChild(badge);
  }

  const tdUnidade = document.createElement("td");
  tdUnidade.appendChild(buildUnidadeField(insumoId, `itens[${rowIndex}][unidade]`));

  const tdQtd = document.createElement("td");
  const qtd = document.createElement("input");
  qtd.type = "text";
  qtd.name = `itens[${rowIndex}][quantidade]`;
  qtd.placeholder = "0";
  qtd.required = true;
  qtd.className = "row-quantidade";
  qtd.value = "1";
  tdQtd.appendChild(qtd);

  const tdSpec = document.createElement("td");
  tdSpec.appendChild(buildSpecInput(insumoId));

  const tdApr = document.createElement("td");
  const obraId = obraSelect ? obraSelect.value : "";
  tdApr.appendChild(buildApropriacaoSelect(obraId, `itens[${rowIndex}][apropriacao]`));

  const tdNec = document.createElement("td");
  const necessario = document.createElement("input");
  necessario.type = "date";
  necessario.name = `itens[${rowIndex}][necessario_em]`;
  necessario.className = "row-necessario";
  if (necessarioBase && necessarioBase.value) {
    necessario.value = necessarioBase.value;
  }
  if (necessarioBase && necessarioBase.min) {
    necessario.min = necessarioBase.min;
    if (!necessario.value || necessario.value < necessario.min) {
      necessario.value = necessario.min;
    }
  }
  necessario.addEventListener("change", () => {
    if (necessario.min && necessario.value && necessario.value < necessario.min) {
      necessario.value = necessario.min;
      showFeedback(
        `Data do item ajustada para ${formatPtDateFromIso(necessario.min)}.`,
        "info"
      );
    }
  });
  tdNec.appendChild(necessario);

  const tdProduto = document.createElement("td");
  tdProduto.appendChild(buildProdutoField(rowIndex));

  const tdActions = document.createElement("td");
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "Remover";
  removeBtn.className = "danger";
  removeBtn.addEventListener("click", () => {
    tr.remove();
    syncEmptyRow();
  });
  tdActions.appendChild(removeBtn);

  tr.appendChild(tdCheck);
  tr.appendChild(tdInsumo);
  tr.appendChild(tdUnidade);
  tr.appendChild(tdQtd);
  tr.appendChild(tdSpec);
  tr.appendChild(tdApr);
  tr.appendChild(tdNec);
  tr.appendChild(tdProduto);
  tr.appendChild(tdActions);

  checkbox.addEventListener("change", () => updateRequestCounters());
  qtd.addEventListener("input", () => updateRequestCounters());

  const empty = tableBody.querySelector(".table-empty-row");
  if (empty) empty.remove();

  tableBody.appendChild(tr);
  rowIndex += 1;
  syncEmptyRow();
  showFeedback("");
}

function addCustomInsumo() {
  if (!customInsumoInput) return;
  const nome = customInsumoInput.value.trim();
  if (!nome) {
    showFeedback("Informe o nome do insumo manual.", "error");
    customInsumoInput.focus();
    return;
  }
  addRow("", nome, { isCustom: true });
  customInsumoInput.value = "";
  showFeedback("Insumo manual adicionado à lista.", "info");
}

if (customInsumoBtn && customInsumoInput) {
  customInsumoBtn.addEventListener("click", addCustomInsumo);
  customInsumoInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomInsumo();
    }
  });
}

if (insumoList) {
  insumoList.addEventListener("click", (event) => {
    const btn = event.target.closest(".insumo-item");
    if (!btn) return;
    addRow(btn.dataset.insumoId, btn.dataset.insumoNome);
  });
}

if (searchInput && insumoList) {
  searchInput.addEventListener("input", (event) => {
    const q = event.target.value.toLowerCase();
    const items = insumoList.querySelectorAll(".insumo-item");
    items.forEach((item) => {
      const name = item.dataset.insumoNome.toLowerCase();
      const categoriaOk = item.dataset.hiddenByCategoria !== "1";
      item.style.display = name.includes(q) && categoriaOk ? "flex" : "none";
    });
  });
}

if (obraSelect) {
  obraSelect.addEventListener("change", () => refreshApropriacaoSelects());
}

if (necessarioBase) {
  necessarioBase.addEventListener("change", () => {
    const previous = necessarioBase.value;
    refreshLeadTimeRules();
    if (necessarioBase.min && previous && previous < necessarioBase.min) {
      necessarioBase.value = necessarioBase.min;
      showFeedback(
        `Data base ajustada para ${formatPtDateFromIso(necessarioBase.min)}.`,
        "info"
      );
    }
  });
}

if (bulkApplyBtn && bulkSelect) {
  bulkApplyBtn.addEventListener("click", () => {
    const valor = bulkSelect.value;
    const unidadeValor = bulkUnidade ? bulkUnidade.value.trim() : "";
    const quantidadeValor = bulkQuantidade ? bulkQuantidade.value.trim() : "";
    if (!valor && !unidadeValor && !quantidadeValor) return;

    const checkedRows = getDataRows().filter((row) => {
      const check = row.querySelector(".row-check");
      return check && check.checked;
    });
    if (checkedRows.length === 0) {
      showFeedback("Selecione pelo menos um item para aplicar em massa.", "error");
      return;
    }

    checkedRows.forEach((row) => {
      const select = row.querySelector(".apropriacao-select");
      const unidade = row.querySelector(".row-unidade");
      const qtd = row.querySelector(".row-quantidade");
      if (select && valor) {
        select.value = valor;
      }
      if (unidade && unidadeValor) {
        if (
          unidade.tagName === "SELECT" &&
          !Array.from(unidade.options).some((o) => o.value === unidadeValor)
        ) {
          const extra = document.createElement("option");
          extra.value = unidadeValor;
          extra.textContent = unidadeValor;
          unidade.appendChild(extra);
        }
        unidade.value = unidadeValor;
      }
      if (qtd && quantidadeValor) {
        qtd.value = quantidadeValor;
      }
    });
    updateRequestCounters();
    showFeedback("Campos em massa aplicados aos itens selecionados.", "info");
  });
}

if (toggleAllBtn) {
  toggleAllBtn.addEventListener("click", () => {
    const checks = getDataRows().map((row) => row.querySelector(".row-check"));
    if (checks.length === 0) return;
    const allChecked = checks.every((check) => check && check.checked);
    checks.forEach((check) => {
      if (check) check.checked = !allChecked;
    });
    updateRequestCounters();
  });
}

if (clearItemsBtn) {
  clearItemsBtn.addEventListener("click", () => {
    getDataRows().forEach((row) => row.remove());
    syncEmptyRow();
    showFeedback("");
  });
}

if (categoriaFilter && insumoList) {
  categoriaFilter.addEventListener("click", (event) => {
    const btn = event.target.closest(".categoria-item");
    if (!btn) return;

    categoriaAtiva = btn.dataset.categoriaId || "";
    categoriaFilter.querySelectorAll(".categoria-item").forEach((item) => {
      item.classList.toggle("active", item === btn);
    });

    const items = insumoList.querySelectorAll(".insumo-item");
    items.forEach((item) => {
      const match = !categoriaAtiva || item.dataset.categoriaId === categoriaAtiva;
      item.dataset.hiddenByCategoria = match ? "" : "1";
      const q = searchInput ? searchInput.value.toLowerCase() : "";
      const name = item.dataset.insumoNome.toLowerCase();
      item.style.display = match && name.includes(q) ? "flex" : "none";
    });
  });

  const first = categoriaFilter.querySelector(".categoria-item");
  if (first) first.classList.add("active");
}

if (toggleSidebarBtn && requestLayout) {
  const sidebarMq =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 1150px)")
      : null;

  const applyStoredSidebar = () => {
    const shouldCollapse = readSidebarPreference();
    setSidebarCollapsed(shouldCollapse, false);
  };

  if (sidebarMq && sidebarMq.matches) {
    setSidebarCollapsed(false, false);
  } else {
    applyStoredSidebar();
  }

  toggleSidebarBtn.addEventListener("click", () => {
    if (sidebarMq && sidebarMq.matches) return;
    const collapsed = requestLayout.classList.contains("is-collapsed");
    setSidebarCollapsed(!collapsed);
  });

  if (sidebarMq) {
    sidebarMq.addEventListener("change", (event) => {
      if (event.matches) {
        setSidebarCollapsed(false, false);
      } else {
        applyStoredSidebar();
      }
    });
  }
}

if (obraSelect) {
  buildBulkSelect(obraSelect.value);
}

if (reqForm) {
  reqForm.addEventListener("submit", (event) => {
    const rows = getDataRows();
    if (rows.length === 0) {
      event.preventDefault();
      showFeedback("Adicione pelo menos um insumo antes de gerar o PDF.", "error");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + getLeadDaysForCount(rows.length));
    const minIso = toIsoDate(minDate);

    const invalidBase =
      necessarioBase && necessarioBase.value && necessarioBase.value < minIso;
    const invalidRowIndex = rows.findIndex((row) => {
      const field = row.querySelector(".row-necessario");
      return Boolean(field && field.value && field.value < minIso);
    });

    if (invalidBase || invalidRowIndex >= 0) {
      event.preventDefault();
      let message = buildMinDateErrorMessage(rows.length, minIso);
      if (invalidRowIndex >= 0) {
        message = `Item ${invalidRowIndex + 1}: ${message}`;
      }
      showFeedback(message, "error");
      alert(message);
      if (leadHint) {
        leadHint.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    showFeedback("");
  });
}

syncEmptyRow();
