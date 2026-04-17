// ─── CONFIG ──────────────────────────────────────────────────────────────────
const APP_CONFIG = {
  supabaseUrl: "https://qqexlkssyarkmhnxzcbc.supabase.co",
  supabaseAnonKey: "sb_publishable_skavb40bqySKywet3yAWgA_RF0_uI4c",
  tableName: "public.base_atentimento",
  exportFunctionName: "export-base-atendimentos",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const weekdayOrder = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA"];
const MAX_VISIBLE_ENTRIES_PER_DAY = 9999;
const DONUT_COLORS = ["#6c7bff", "#ff4f86", "#38d39a", "#ffbf36", "#58c5ff", "#9a7cff"];
const ALERT_WINDOWS = [
  { id: "morning",   label: "12:00", startHour: 0,  endHour: 12 },
  { id: "afternoon", label: "16:00", startHour: 12, endHour: 16 },
];

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const board               = document.getElementById("board");
const weekCard            = document.querySelector(".week-card");
const weekIcon            = document.querySelector(".week-icon");
const dayTemplate         = document.getElementById("day-template");
const entryTemplate       = document.getElementById("entry-template");
const weekRange           = document.getElementById("week-range");
const prevWeekBtn         = document.getElementById("prev-week");
const nextWeekBtn         = document.getElementById("next-week");
const totalAtendimentos   = document.getElementById("total-atendimentos");

const notificationsBtn    = document.getElementById("notifications-btn");
const filterBtn           = document.getElementById("filter-btn");
const exportBtn           = document.getElementById("export-btn");
const summaryBtn          = document.getElementById("summary-btn");

const notificationsCount  = document.getElementById("notifications-count");
const notificationsModal  = document.getElementById("notifications-modal");
const notificationsList   = document.getElementById("notifications-list");
const closeNotificationsBtn = document.getElementById("close-notifications");

const filterModal         = document.getElementById("filter-modal");
const filterForm          = document.getElementById("filter-form");
const filterSystemSelect  = document.getElementById("filter-system-select");
const clearFilterBtn      = document.getElementById("clear-filter");
const cancelFilterBtn     = document.getElementById("cancel-filter");

const analyticsModal      = document.getElementById("analytics-modal");
const analyticsWeekRange  = document.getElementById("analytics-week-range");
const closeAnalyticsBtn   = document.getElementById("close-analytics");
const analyticsPrevWeekBtn = document.getElementById("analytics-prev-week");
const analyticsNextWeekBtn = document.getElementById("analytics-next-week");
const chartDemandPerDay   = document.getElementById("chart-demand-per-day");
const chartTopCases       = document.getElementById("chart-top-cases");
const chartTopSystems     = document.getElementById("chart-top-systems");
const chartProblemsByDay  = document.getElementById("chart-problems-by-day");
const chartDemandRanking  = document.getElementById("chart-demand-ranking");

const kpiTotalAtendimentos = document.getElementById("kpi-total-atendimentos");
const kpiMediaDia          = document.getElementById("kpi-media-dia");
const kpiSistemaCritico    = document.getElementById("kpi-sistema-critico");
const kpiVariacaoSemanal   = document.getElementById("kpi-variacao-semanal");

const welcomePopup        = document.getElementById("welcome-popup");
const welcomeProgressBar  = document.getElementById("welcome-progress-bar");

const modal               = document.getElementById("record-modal");
const form                = document.getElementById("record-form");
const incidentInput       = document.getElementById("incident-input");
const documentInput       = document.getElementById("document-input");
const systemInput         = document.getElementById("system-input");
const observationInput    = document.getElementById("observation-input");
const daySelect           = document.getElementById("day-select");
const dayDisplay          = document.getElementById("day-display");
const cancelRecordBtn     = document.getElementById("cancel-record");
const createRecordBtn     = document.getElementById("create-record");

const dayRecordsModal     = document.getElementById("day-records-modal");
const dayRecordsTitle     = document.getElementById("day-records-title");
const dayRecordsList      = document.getElementById("day-records-list");
const closeDayRecordsBtn  = document.getElementById("close-day-records");

const documentsModal      = document.getElementById("documents-modal");
const documentsForm       = document.getElementById("documents-form");
const documentsInput      = document.getElementById("documents-input");
const cancelDocumentsBtn  = document.getElementById("cancel-documents");

const editEntryModal      = document.getElementById("edit-entry-modal");
const editEntryForm       = document.getElementById("edit-entry-form");
const editIncidentInput   = document.getElementById("edit-incident-input");
const editSystemInput     = document.getElementById("edit-system-input");
const editObservationInput = document.getElementById("edit-observation-input");
const cancelEditEntryBtn  = document.getElementById("cancel-edit-entry");

// ─── STATE ────────────────────────────────────────────────────────────────────
const weekStore = new Map();
const notifications = [];

let selectedMonday = getMonday(new Date());
let analyticsMonday = null;
let selectedEntryForDocuments = null;
let selectedEntryForEdit = null;
let activeSystemFilter = "ALL";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getRestTableName = () => APP_CONFIG.tableName.split(".").pop();

/**
 * FIX: Chave do Map usa formato ISO determinístico (YYYY-MM-DD)
 * O bug original usava toLocaleDateString("pt-BR") que pode produzir
 * formatos diferentes dependendo do ambiente/navegador.
 */
function getWeekKey(monday) {
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDayHeader(date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * FIX: Parseia datas ISO sem deslocamento de fuso horário.
 * new Date("2026-04-14") é interpretado como UTC midnight, que em UTC-3
 * vira o dia anterior. Aqui forçamos leitura local.
 */
function parseISODateAsLocal(value) {
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, y, mo, d] = m.map(Number);
    if (y && mo && d) return new Date(y, mo - 1, d);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function parseDocumentsInput(value) {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function emitDashboardEvent(name, message) {
  window.dispatchEvent(new CustomEvent(name, { detail: { message } }));
}

function getTodayWeekday() {
  const map = { 1: "SEGUNDA", 2: "TERÇA", 3: "QUARTA", 4: "QUINTA", 5: "SEXTA" };
  return map[new Date().getDay()] || "SEGUNDA";
}

function buildEmptyWeek() {
  return weekdayOrder.map((day) => ({ day, entries: [] }));
}

function getWeekDataForMonday(monday) {
  const key = getWeekKey(monday);
  if (!weekStore.has(key)) weekStore.set(key, buildEmptyWeek());
  return weekStore.get(key);
}

function getActiveWeekData() {
  return getWeekDataForMonday(selectedMonday);
}

function updateTotal(weekData) {
  const total = weekData
    .flatMap((d) => d.entries)
    .reduce((acc, e) => acc + e.documents.length, 0);
  if (totalAtendimentos) totalAtendimentos.textContent = String(total);
}

// ─── EXPORT HELPERS ──────────────────────────────────────────────────────────
function getExportFilename(contentDisposition) {
  if (typeof contentDisposition !== "string") {
    return `base_atendimentos_${Date.now()}.xlsx`;
  }
  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (!match?.[1]) return `base_atendimentos_${Date.now()}.xlsx`;
  return decodeURIComponent(match[1].trim());
}

function escapeCsvCell(value) {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
}

function buildRowsForLocalExport() {
  const rows = [];
  weekStore.forEach((weekData, weekKey) => {
    weekData.forEach((dayData) => {
      dayData.entries.forEach((entry) => {
        rows.push({
          semana: weekKey,
          dia_semana: dayData.day,
          incidente: entry.title,
          sistema: entry.system,
          observacao: entry.observation || "",
          documentos: entry.documents.join(", "),
          quantidade_documentos: entry.documents.length,
        });
      });
    });
  });
  return rows;
}

function downloadLocalCsvFallback() {
  const headers = ["semana","dia_semana","incidente","sistema","observacao","documentos","quantidade_documentos"];
  const rows = buildRowsForLocalExport();
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escapeCsvCell(row[h])).join(","));
  });
  const csv = `\uFEFF${lines.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `base_atendimentos_local_${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ─── API ──────────────────────────────────────────────────────────────────────
function buildHeaders(extra = {}) {
  return {
    apikey: APP_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${APP_CONFIG.supabaseAnonKey}`,
    ...extra,
  };
}

async function loadAttendancesFromDatabase() {
  const url =
    `${APP_CONFIG.supabaseUrl}/rest/v1/${getRestTableName()}` +
    `?select=id_primary,data,incidente,documento,sistema,observacao` +
    `&order=data.asc,id_primary.asc`;

  const response = await fetch(url, { headers: buildHeaders() });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao carregar atendimentos: ${response.status} – ${body}`);
  }

  const rows = await response.json();

  // Diagnóstico no console para facilitar debug
  console.info(`[Painel] ${rows.length} registros carregados do banco.`);

  weekStore.clear();
  notifications.length = 0;

  rows.forEach((row) => {
    const date = parseISODateAsLocal(row.data);
    if (!date) {
      console.warn("[Painel] Data inválida ignorada:", row.data, "| id:", row.id_primary);
      return;
    }

    const weekdayIndex = date.getDay() - 1; // 0=Seg … 4=Sex
    if (weekdayIndex < 0 || weekdayIndex >= weekdayOrder.length) {
      console.warn("[Painel] Dia de semana fora do range ignorado:", row.data, date.getDay());
      return;
    }

    const day = weekdayOrder[weekdayIndex];
    const monday = getMonday(date);
    const weekKey = getWeekKey(monday);

    if (!weekStore.has(weekKey)) weekStore.set(weekKey, buildEmptyWeek());

    const dayData = weekStore.get(weekKey).find((item) => item.day === day);
    if (!dayData) return;

    dayData.entries.push({
      id_primary: row.id_primary,
      title: row.incidente || "Sem incidente",
      system: row.sistema || "Sem sistema",
      documents: [row.documento || "Sem documento"],
      observation: row.observacao || "",
      level: "danger",
    });

    // FIX: createdAt usa datetime completo para comparação correta com "hoje".
    // row.data é apenas "YYYY-MM-DD"; adicionamos hora local fictícia 00:00
    // para que a data seja processada no fuso local (não UTC).
    notifications.push({
      incident: row.incidente || "Sem incidente",
      document: row.documento || "Sem documento",
      system: row.sistema || "Sem sistema",
      day,
      createdAt: row.data + "T00:00:00", // força parse local
    });
  });

  // Log de diagnóstico das semanas carregadas
  console.info("[Painel] Semanas no store:", [...weekStore.keys()]);
  console.info("[Painel] Segunda selecionada (key):", getWeekKey(selectedMonday));
}

async function getNextPrimaryKey() {
  const url =
    `${APP_CONFIG.supabaseUrl}/rest/v1/${getRestTableName()}` +
    `?select=id_primary&order=id_primary.desc&limit=1`;
  const response = await fetch(url, { headers: buildHeaders() });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao consultar último id_primary: ${response.status} – ${body}`);
  }
  const rows = await response.json();
  const lastId = Number.parseInt(rows?.[0]?.id_primary, 10);
  return Number.isNaN(lastId) ? 1 : lastId + 1;
}

async function saveAttendanceToDatabase({ incident, documentValue, system, observationValue, day, weekStart, weekEnd, dateValue }) {
  const url = `${APP_CONFIG.supabaseUrl}/rest/v1/${getRestTableName()}`;

  let nextId = null;
  try { nextId = await getNextPrimaryKey(); } catch (e) { console.warn(e.message); }

  const payload = {
    id_primary: nextId ?? 1,
    data: dateValue,
    incidente: incident,
    documento: documentValue,
    sistema: system,
    observacao: observationValue || `Dia: ${day} | Semana: ${weekStart} - ${weekEnd}`,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${response.status}: ${body}`);
  }
  return payload.id_primary;
}

async function updateAttendanceInDatabase({ idPrimary, incident, system, observationValue }) {
  const url =
    `${APP_CONFIG.supabaseUrl}/rest/v1/${getRestTableName()}?id_primary=eq.${idPrimary}`;
  const payload = { incidente: incident, sistema: system, observacao: observationValue || "" };

  const response = await fetch(url, {
    method: "PATCH",
    headers: buildHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${response.status}: ${body}`);
  }
  const updated = await response.json();
  if (!Array.isArray(updated) || updated.length === 0) {
    const exists = await attendanceExistsInDatabase(idPrimary);
    if (!exists) throw new Error(`Nenhum registro encontrado para id_primary=${idPrimary}.`);
  }
}

async function deleteAttendanceFromDatabase(idPrimary) {
  const url =
    `${APP_CONFIG.supabaseUrl}/rest/v1/${getRestTableName()}?id_primary=eq.${idPrimary}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: buildHeaders({ Prefer: "return=representation" }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${response.status}: ${body}`);
  }
  const deleted = await response.json();
  if (!Array.isArray(deleted) || deleted.length === 0) {
    const exists = await attendanceExistsInDatabase(idPrimary);
    if (exists) throw new Error(`Falha ao excluir: registro id_primary=${idPrimary} ainda existe.`);
  }
}

async function attendanceExistsInDatabase(idPrimary) {
  const url =
    `${APP_CONFIG.supabaseUrl}/rest/v1/${getRestTableName()}` +
    `?select=id_primary&id_primary=eq.${idPrimary}&limit=1`;
  const response = await fetch(url, { headers: buildHeaders() });
  if (!response.ok) return false;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function exportDatabaseFromEdgeFunction() {
  const endpoint = `${APP_CONFIG.supabaseUrl}/functions/v1/${APP_CONFIG.exportFunctionName}`;

  const tryDownload = async (resp) => {
    if (!resp.ok) throw new Error(`Falha ao exportar base: ${resp.status} ${await resp.text()}`);
    const blob = await resp.blob();
    const filename = getExportFilename(resp.headers.get("content-disposition"));
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click();
    link.remove(); URL.revokeObjectURL(url);
  };

  try {
    await tryDownload(await fetch(endpoint, { method: "GET", headers: buildHeaders() }));
  } catch (e1) {
    try {
      await tryDownload(await fetch(endpoint, { method: "GET" }));
    } catch (e2) {
      downloadLocalCsvFallback();
      window.alert(
        `Não foi possível baixar da Edge Function.\nBaixamos um CSV local como fallback.\n\n${e1.message} | ${e2.message}`
      );
    }
  }
}

// ─── WELCOME POPUP ────────────────────────────────────────────────────────────
function showWelcomePopup() {
  if (!welcomePopup) return;
  welcomePopup.setAttribute("aria-hidden", "false");
  if (welcomeProgressBar) {
    welcomeProgressBar.classList.remove("is-running");
    void welcomeProgressBar.offsetWidth;
    welcomeProgressBar.classList.add("is-running");
  }
  window.setTimeout(() => welcomePopup.setAttribute("aria-hidden", "true"), 3000);
}

// ─── ERROR BANNER ─────────────────────────────────────────────────────────────
function showLoadError(message) {
  if (!board) return;
  board.innerHTML = `
    <div style="
      grid-column: 1 / -1;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 12px; padding: 40px; text-align: center;
    ">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
           stroke="#ff365f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p style="color:#ff8fa3;font-size:.9rem;max-width:400px;margin:0">
        <strong>Erro ao carregar dados do banco:</strong><br/>${message}
      </p>
      <p style="color:#bcc3e2;font-size:.78rem;margin:0">
        Verifique a chave de API e as permissões do Supabase.<br/>
        Abra o Console do navegador (F12) para mais detalhes.
      </p>
      <button onclick="initializeApp()" style="
        margin-top:8px; border:none; border-radius:8px;
        background:linear-gradient(90deg,#ff4f86,#ff2f70);
        color:#fff; font-size:.8rem; font-weight:700;
        padding:8px 18px; cursor:pointer;
      ">↺ Tentar novamente</button>
    </div>
  `;
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
function renderNotifications() {
  if (!notificationsCount || !notificationsList) return;

  const now = new Date();

  const todaySummaries = ALERT_WINDOWS.map((w) => {
    const count = notifications.filter((item) => {
      const createdAt = new Date(item.createdAt);
      if (Number.isNaN(createdAt.getTime())) return false;
      const isToday =
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getDate() === now.getDate();
      if (!isToday) return false;
      const hour = createdAt.getHours();
      return hour >= w.startHour && hour < w.endHour;
    }).length;
    return { ...w, count };
  });

  notificationsCount.textContent = String(
    todaySummaries.reduce((acc, s) => acc + s.count, 0)
  );
  notificationsList.innerHTML = "";

  if (todaySummaries.every((s) => s.count === 0)) {
    notificationsList.innerHTML =
      '<article class="day-record-item"><p>Nenhuma demanda criada hoje para os alertas de 12h e 16h.</p></article>';
    return;
  }

  todaySummaries.forEach((s) => {
    const node = document.createElement("article");
    node.className = "day-record-item";
    node.innerHTML = `
      <h4>Alerta das ${s.label}</h4>
      <p>Demandas criadas hoje: <strong>${s.count}</strong></p>
      <small>Janela considerada: ${String(s.startHour).padStart(2,"0")}:00 até ${String(s.endHour).padStart(2,"0")}:00</small>
    `;
    notificationsList.appendChild(node);
  });
}

function openNotificationsModal() {
  if (!notificationsModal) return;
  renderNotifications();
  notificationsModal.setAttribute("aria-hidden", "false");
  animateModalCard(notificationsModal);
}
function closeNotificationsModal() {
  notificationsModal?.setAttribute("aria-hidden", "true");
}

// ─── CHARTS ───────────────────────────────────────────────────────────────────
function getTopEntries(sourceMap, limit = 5) {
  return [...sourceMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function ensureChartTooltip(container) {
  let tooltip = container.querySelector(".chart-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    container.appendChild(tooltip);
  }
  return tooltip;
}

function showChartTooltip(container, event, label, value) {
  const tooltip = ensureChartTooltip(container);
  tooltip.innerHTML = `<strong>${label}</strong><br/>Quantidade: ${value}`;
  const rect = container.getBoundingClientRect();
  tooltip.style.left = `${event.clientX - rect.left + 12}px`;
  tooltip.style.top  = `${event.clientY - rect.top  - 8}px`;
  tooltip.style.opacity   = "1";
  tooltip.style.transform = "translateY(0)";
}

function hideChartTooltip(container) {
  const tooltip = container.querySelector(".chart-tooltip");
  if (!tooltip) return;
  tooltip.style.opacity   = "0";
  tooltip.style.transform = "translateY(4px)";
}

function renderVerticalBarChart(container, data, emptyMessage = "Sem dados.") {
  if (!container) return;
  container.innerHTML = "";
  container.className  = "chart-area vertical-bars";
  container.style.position = "relative";
  if (!data.length) { container.innerHTML = `<p class="chart-empty">${emptyMessage}</p>`; return; }
  const max = Math.max(...data.map((d) => d.value), 1);
  data.forEach((item) => {
    const node = document.createElement("div");
    node.className = "vertical-bar-item";
    const h = (item.value / max) * 100;
    node.innerHTML = `
      <span class="vertical-bar-value">${item.value}</span>
      <div class="vertical-bar-track">
        <div class="vertical-bar-fill" style="height:${Math.max(h, item.value > 0 ? 6 : 0)}%"></div>
      </div>
      <span class="vertical-bar-label">${item.label}</span>`;
    node.addEventListener("mousemove", (e) => showChartTooltip(container, e, item.label, item.value));
    node.addEventListener("mouseleave", () => hideChartTooltip(container));
    container.appendChild(node);
  });
}

function renderRankList(container, data, emptyMessage = "Sem dados.") {
  if (!container) return;
  container.innerHTML = "";
  container.className  = "chart-area rank-list";
  container.style.position = "relative";
  if (!data.length) { container.innerHTML = `<p class="chart-empty">${emptyMessage}</p>`; return; }
  data.forEach((item, i) => {
    const node = document.createElement("div");
    node.className = "rank-row";
    node.innerHTML = `
      <span class="rank-row-index">${i + 1}</span>
      <span class="rank-row-label" title="${item.label}">${item.label}</span>
      <span class="rank-row-value">${item.value}</span>`;
    node.addEventListener("mousemove", (e) => showChartTooltip(container, e, item.label, item.value));
    node.addEventListener("mouseleave", () => hideChartTooltip(container));
    container.appendChild(node);
  });
}

function renderMiniHorizontal(container, data, emptyMessage = "Sem dados.") {
  if (!container) return;
  container.innerHTML = "";
  container.className  = "chart-area mini-horizontal";
  container.style.position = "relative";
  if (!data.length) { container.innerHTML = `<p class="chart-empty">${emptyMessage}</p>`; return; }
  const max = Math.max(...data.map((d) => d.value), 1);
  data.forEach((item) => {
    const node = document.createElement("div");
    node.className = "mini-row";
    node.innerHTML = `
      <span class="mini-row-label">${item.label}</span>
      <span class="mini-row-track"><span class="mini-row-fill" style="width:${(item.value/max)*100}%"></span></span>
      <span class="mini-row-value">${item.value}</span>`;
    node.addEventListener("mousemove", (e) => showChartTooltip(container, e, item.label, item.value));
    node.addEventListener("mouseleave", () => hideChartTooltip(container));
    container.appendChild(node);
  });
}

function polarToCartesian(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const s = polarToCartesian(cx, cy, r, endAngle);
  const e = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

function renderDonutChart(container, data, emptyMessage = "Sem dados.") {
  if (!container) return;
  container.innerHTML = "";
  container.className  = "chart-area";
  container.style.position = "relative";
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!data.length || total <= 0) {
    container.innerHTML = `<p class="chart-empty">${emptyMessage}</p>`;
    return;
  }
  const topData = data.slice(0, 6);
  const wrap = document.createElement("div");
  wrap.className = "donut-layout";
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 160 160");
  svg.setAttribute("class", "donut-chart");
  const base = document.createElementNS(NS, "circle");
  base.setAttribute("cx","80"); base.setAttribute("cy","80"); base.setAttribute("r","46");
  base.setAttribute("fill","none"); base.setAttribute("stroke","rgba(255,255,255,0.08)");
  base.setAttribute("stroke-width","18");
  svg.appendChild(base);
  let angle = 0;
  topData.forEach((item, i) => {
    const sweep = (item.value / total) * 360;
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", describeArc(80, 80, 46, angle, angle + sweep));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", DONUT_COLORS[i % DONUT_COLORS.length]);
    path.setAttribute("stroke-width", "18");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);
    angle += sweep;
  });
  const tTop = document.createElementNS(NS, "text");
  tTop.setAttribute("x","80"); tTop.setAttribute("y","74");
  tTop.setAttribute("text-anchor","middle"); tTop.setAttribute("fill","#cfd5f0");
  tTop.setAttribute("font-size","11"); tTop.textContent = "Total";
  svg.appendChild(tTop);
  const tVal = document.createElementNS(NS, "text");
  tVal.setAttribute("x","80"); tVal.setAttribute("y","92");
  tVal.setAttribute("text-anchor","middle"); tVal.setAttribute("fill","#ffffff");
  tVal.setAttribute("font-size","18"); tVal.setAttribute("font-weight","700");
  tVal.textContent = String(total);
  svg.appendChild(tVal);
  const legend = document.createElement("div");
  legend.className = "donut-legend";
  topData.forEach((item, i) => {
    const li = document.createElement("div");
    li.className = "donut-legend-item";
    li.innerHTML = `
      <span class="donut-legend-color" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></span>
      <span class="donut-legend-label" title="${item.label}">${item.label}</span>
      <span class="donut-legend-value">${item.value}</span>`;
    li.addEventListener("mousemove", (e) => showChartTooltip(container, e, item.label, item.value));
    li.addEventListener("mouseleave", () => hideChartTooltip(container));
    legend.appendChild(li);
  });
  wrap.appendChild(svg);
  wrap.appendChild(legend);
  container.appendChild(wrap);
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function buildWeeklyAnalytics(weekData) {
  const demandsByDay = weekdayOrder.map((name) => ({
    label: name,
    value: weekData.find((d) => d.day === name)?.entries.length || 0,
  }));
  const problemsByDay = weekdayOrder.map((name) => ({
    label: name,
    value: (weekData.find((d) => d.day === name)?.entries || [])
      .reduce((a, e) => a + e.documents.length, 0),
  }));
  const incidentMap = new Map();
  const systemMap   = new Map();
  weekData.forEach((d) => {
    d.entries.forEach((e) => {
      incidentMap.set(e.title,  (incidentMap.get(e.title)  || 0) + 1);
      systemMap.set(e.system, (systemMap.get(e.system) || 0) + 1);
    });
  });
  return {
    demandsByDay,
    topCases:        getTopEntries(incidentMap).map(([label, value]) => ({ label, value })),
    topSystems:      getTopEntries(systemMap).map(([label, value]) => ({ label, value })),
    topDaysByProblems: [...problemsByDay].sort((a, b) => b.value - a.value),
  };
}

function getTotalDemands(weekData) {
  return weekData.reduce((a, d) => a + d.entries.length, 0);
}

function renderAnalyticsModal() {
  if (!analyticsModal || !analyticsWeekRange) return;
  if (!analyticsMonday) analyticsMonday = new Date(selectedMonday);
  const friday = addDays(analyticsMonday, 4);
  analyticsWeekRange.textContent = `${formatDate(analyticsMonday)} - ${formatDate(friday)}`;
  const weekData     = getWeekDataForMonday(analyticsMonday);
  const prevWeekData = getWeekDataForMonday(addDays(analyticsMonday, -7));
  const analytics    = buildWeeklyAnalytics(weekData);
  const total        = getTotalDemands(weekData);
  const totalPrev    = getTotalDemands(prevWeekData);
  const avgPerDay    = (total / weekdayOrder.length).toFixed(1);
  const diffPct      = totalPrev ? Math.round(((total - totalPrev) / totalPrev) * 100) : 0;

  if (kpiTotalAtendimentos) kpiTotalAtendimentos.textContent = String(total);
  if (kpiMediaDia)          kpiMediaDia.textContent          = String(avgPerDay);
  if (kpiSistemaCritico)    kpiSistemaCritico.textContent    = analytics.topSystems[0]?.label || "-";
  if (kpiVariacaoSemanal)   kpiVariacaoSemanal.textContent   = `${diffPct > 0 ? "+" : ""}${diffPct}%`;

  renderVerticalBarChart(chartDemandPerDay,   analytics.demandsByDay,       "Sem demandas nesta semana.");
  renderRankList(         chartTopCases,      analytics.topCases,           "Sem casos para analisar.");
  renderMiniHorizontal(   chartDemandRanking, analytics.demandsByDay,       "Sem demandas nesta semana.");
  renderDonutChart(       chartTopSystems,    analytics.topSystems,         "Sem sistemas com ocorrências.");
  renderVerticalBarChart( chartProblemsByDay, analytics.topDaysByProblems,  "Sem problemas registrados.");
}

function openAnalyticsModal() {
  if (!analyticsModal) return;
  analyticsMonday = new Date(selectedMonday);
  renderAnalyticsModal();
  analyticsModal.setAttribute("aria-hidden", "false");
  animateModalCard(analyticsModal);
}
function closeAnalyticsModal() {
  analyticsModal?.setAttribute("aria-hidden", "true");
}

// ─── FILTER ───────────────────────────────────────────────────────────────────
function getUniqueSystemsFromWeek() {
  const systems = new Set();
  getActiveWeekData().forEach((d) => d.entries.forEach((e) => { if (e.system) systems.add(e.system); }));
  return [...systems].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function populateSystemFilterOptions() {
  if (!filterSystemSelect) return;
  const options = ['<option value="ALL">Todos os sistemas</option>'];
  getUniqueSystemsFromWeek().forEach((s) => {
    options.push(`<option value="${s}"${s === activeSystemFilter ? " selected" : ""}>${s}</option>`);
  });
  filterSystemSelect.innerHTML = options.join("");
}

function openFilterModal() {
  if (!filterModal) return;
  populateSystemFilterOptions();
  filterModal.setAttribute("aria-hidden", "false");
  animateModalCard(filterModal);
  filterSystemSelect?.focus();
}
function closeFilterModal() {
  filterModal?.setAttribute("aria-hidden", "true");
}

// ─── ENTRY DETAILS MODAL ──────────────────────────────────────────────────────
function openEntryDetailsModal(dayName, dateLabel, entry) {
  if (!dayRecordsTitle || !dayRecordsList || !dayRecordsModal) return;
  dayRecordsTitle.textContent = `${dayName} • ${dateLabel}`;
  dayRecordsList.innerHTML = "";

  const item = document.createElement("article");
  item.className = "day-record-item";
  item.innerHTML = `
    <h4>Incidente: ${entry.title}</h4>
    <p>Sistema: ${entry.system}</p>
    ${entry.observation ? `<p>Observação: ${entry.observation}</p>` : ""}
    <small>Documentos (${entry.documents.length}):</small>
    <ul>${entry.documents.map((d) => `<li>${d}</li>`).join("")}</ul>
    <div class="detail-actions">
      <button type="button" class="detail-add-doc-btn">+ Documento</button>
      <button type="button" class="detail-edit-btn">Editar demanda</button>
      <button type="button" class="detail-delete-btn">Excluir demanda</button>
    </div>`;

  item.querySelector(".detail-add-doc-btn")?.addEventListener("click", () => openDocumentsModal(entry));
  item.querySelector(".detail-edit-btn")?.addEventListener("click", () => openEditEntryModal(entry));
  item.querySelector(".detail-delete-btn")?.addEventListener("click", async () => {
    if (!window.confirm("Deseja realmente excluir esta demanda?")) return;
    if (!entry.id_primary) {
      window.alert("Não foi possível excluir: id_primary não encontrado.");
      return;
    }
    try {
      await deleteAttendanceFromDatabase(entry.id_primary);
    } catch (e) {
      window.alert(`Não foi possível excluir no banco: ${e.message}`);
      return;
    }
    const dayData = getActiveWeekData().find((d) => d.day === dayName);
    if (!dayData) return;
    const idx = dayData.entries.indexOf(entry);
    if (idx >= 0) dayData.entries.splice(idx, 1);
    closeDayRecordsModal();
    renderWeek(selectedMonday);
    renderNotifications();
    emitDashboardEvent("dashboard:action-warning", "Demanda excluída");
  });

  dayRecordsList.appendChild(item);
  dayRecordsModal.setAttribute("aria-hidden", "false");
  animateModalCard(dayRecordsModal);
}

function closeDayRecordsModal() {
  dayRecordsModal?.setAttribute("aria-hidden", "true");
}

// ─── BOARD RENDER ─────────────────────────────────────────────────────────────
function animateCalendarChange() {
  if (!weekCard || !weekIcon) return;
  weekCard.classList.remove("is-changing");
  weekIcon.classList.remove("is-changing");
  void weekCard.offsetWidth;
  weekCard.classList.add("is-changing");
  weekIcon.classList.add("is-changing");
  window.setTimeout(() => {
    weekCard.classList.remove("is-changing");
    weekIcon.classList.remove("is-changing");
  }, 520);
}

function renderWeek(baseMonday) {
  if (!board || !weekRange || !dayTemplate || !entryTemplate) return;

  board.innerHTML = "";
  const friday = addDays(baseMonday, 4);
  weekRange.textContent = `${formatDate(baseMonday)} - ${formatDate(friday)}`;

  const weekData = getActiveWeekData();
  updateTotal(weekData);

  weekData.forEach((day, index) => {
    const dayNode   = dayTemplate.content.firstElementChild.cloneNode(true);
    const dateLabel = formatDayHeader(addDays(baseMonday, index));

    dayNode.querySelector("h3").textContent   = day.day;
    dayNode.querySelector("span").textContent = dateLabel;

    const entriesRoot  = dayNode.querySelector(".entries");
    const expandDayBtn = dayNode.querySelector(".expand-day-btn");

    const visibleEntries = activeSystemFilter === "ALL"
      ? day.entries
      : day.entries.filter((e) => e.system === activeSystemFilter);

    visibleEntries.slice(0, MAX_VISIBLE_ENTRIES_PER_DAY).forEach((entry, idx) => {
      const entryNode = entryTemplate.content.firstElementChild.cloneNode(true);
      entryNode.classList.add(entry.level, "is-entering");
      entryNode.style.animationDelay = `${Math.min(idx * 70, 280)}ms`;
      entryNode.querySelector("h4").textContent            = entry.title;
      entryNode.querySelector(".system-pill").textContent  = entry.system || "Sem sistema";
      entryNode.querySelector("small").textContent         =
        `${entry.documents.length} erro${entry.documents.length > 1 ? "s" : ""} com documento`;

      const openDetails = () => openEntryDetailsModal(day.day, dateLabel, entry);
      entryNode.addEventListener("click", openDetails);
      entryNode.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetails(); }
      });
      entriesRoot.appendChild(entryNode);
    });

    if (expandDayBtn) expandDayBtn.hidden = true;
    board.appendChild(dayNode);
  });

  if (analyticsModal?.getAttribute("aria-hidden") === "false") renderAnalyticsModal();
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────────────
function animateModalCard(modalElement) {
  const card = modalElement?.querySelector(".modal-card");
  if (!card) return;
  card.classList.remove("is-animating");
  void card.offsetWidth;
  card.classList.add("is-animating");
}

function openModal() {
  if (!form || !modal) return;
  form.reset();
  const today = getTodayWeekday();
  if (daySelect)  daySelect.value  = today;
  if (dayDisplay) dayDisplay.value = today;
  modal.setAttribute("aria-hidden", "false");
  animateModalCard(modal);
  incidentInput?.focus();
}
function closeModal() {
  modal?.setAttribute("aria-hidden", "true");
}

function openDocumentsModal(entry) {
  if (!documentsModal || !documentsForm) return;
  selectedEntryForDocuments = entry;
  documentsForm.reset();
  documentsModal.setAttribute("aria-hidden", "false");
  animateModalCard(documentsModal);
  documentsInput?.focus();
}
function closeDocumentsModal() {
  documentsModal?.setAttribute("aria-hidden", "true");
  selectedEntryForDocuments = null;
}

function openEditEntryModal(entry) {
  if (!editEntryModal) return;
  selectedEntryForEdit = entry;
  if (editIncidentInput)    editIncidentInput.value    = entry.title || "";
  if (editSystemInput)      editSystemInput.value      = entry.system || "";
  if (editObservationInput) editObservationInput.value = entry.observation || "";
  editEntryModal.setAttribute("aria-hidden", "false");
  animateModalCard(editEntryModal);
}
function closeEditEntryModal() {
  editEntryModal?.setAttribute("aria-hidden", "true");
  selectedEntryForEdit = null;
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────
createRecordBtn?.addEventListener("click", openModal);
cancelRecordBtn?.addEventListener("click", closeModal);
closeDayRecordsBtn?.addEventListener("click", closeDayRecordsModal);
notificationsBtn?.addEventListener("click", openNotificationsModal);
closeNotificationsBtn?.addEventListener("click", closeNotificationsModal);
filterBtn?.addEventListener("click", openFilterModal);
cancelFilterBtn?.addEventListener("click", closeFilterModal);
summaryBtn?.addEventListener("click", openAnalyticsModal);
closeAnalyticsBtn?.addEventListener("click", closeAnalyticsModal);
cancelDocumentsBtn?.addEventListener("click", closeDocumentsModal);
cancelEditEntryBtn?.addEventListener("click", closeEditEntryModal);

analyticsPrevWeekBtn?.addEventListener("click", () => {
  analyticsMonday = addDays(analyticsMonday || selectedMonday, -7);
  renderAnalyticsModal();
});
analyticsNextWeekBtn?.addEventListener("click", () => {
  analyticsMonday = addDays(analyticsMonday || selectedMonday, 7);
  renderAnalyticsModal();
});

exportBtn?.addEventListener("click", async () => {
  try { await exportDatabaseFromEdgeFunction(); }
  catch (e) { window.alert(`Não foi possível exportar: ${e.message}`); }
});

// Click fora fecha modal
[modal, dayRecordsModal, notificationsModal, filterModal,
 analyticsModal, documentsModal, editEntryModal].forEach((m) => {
  m?.addEventListener("click", (e) => { if (e.target === m) m.setAttribute("aria-hidden", "true"); });
});

clearFilterBtn?.addEventListener("click", () => {
  activeSystemFilter = "ALL";
  closeFilterModal();
  renderWeek(selectedMonday);
});

filterForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  activeSystemFilter = filterSystemSelect?.value || "ALL";
  closeFilterModal();
  renderWeek(selectedMonday);
});

documentsForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!selectedEntryForDocuments) { closeDocumentsModal(); return; }
  const docs = parseDocumentsInput(documentsInput?.value.trim() || "");
  if (!docs.length) { documentsInput?.focus(); return; }
  selectedEntryForDocuments.documents.push(...docs);
  closeDocumentsModal();
  renderWeek(selectedMonday);
  emitDashboardEvent("dashboard:action-success", "Documento(s) adicionado(s)");
});

editEntryForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedEntryForEdit) { closeEditEntryModal(); return; }
  const incident    = editIncidentInput?.value.trim()    || "";
  const system      = editSystemInput?.value.trim()      || "";
  const observation = editObservationInput?.value.trim() || "";
  if (!incident || !system) return;
  if (!selectedEntryForEdit.id_primary) {
    window.alert("Não foi possível editar: id_primary não encontrado.");
    return;
  }
  try {
    await updateAttendanceInDatabase({ idPrimary: selectedEntryForEdit.id_primary, incident, system, observationValue: observation });
  } catch (err) {
    window.alert(`Não foi possível editar no banco: ${err.message}`);
    return;
  }
  selectedEntryForEdit.title       = incident;
  selectedEntryForEdit.system      = system;
  selectedEntryForEdit.observation = observation;
  closeEditEntryModal();
  closeDayRecordsModal();
  renderWeek(selectedMonday);
  emitDashboardEvent("dashboard:action-success", "Demanda editada com sucesso");
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const incident       = incidentInput?.value.trim()    || "";
  const documentValue  = documentInput?.value.trim()    || "";
  const system         = systemInput?.value.trim()      || "";
  const observationValue = observationInput?.value.trim() || "";
  const day            = daySelect?.value || "";
  if (!incident || !documentValue || !system) return;

  const weekData = getActiveWeekData();
  const dayData  = weekData.find((d) => d.day === day);
  if (!dayData) return;

  const weekStart  = formatDate(selectedMonday);
  const weekEnd    = formatDate(addDays(selectedMonday, 4));
  const dateObj    = getDateForWeekday(selectedMonday, day);
  const dateValue  = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,"0")}-${String(dateObj.getDate()).padStart(2,"0")}`;

  let persistedId = null;
  try {
    persistedId = await saveAttendanceToDatabase({ incident, documentValue, system, observationValue, day, weekStart, weekEnd, dateValue });
  } catch (err) {
    window.alert(`Não foi possível salvar no banco: ${err.message}`);
    return;
  }

  dayData.entries.push({ id_primary: persistedId, title: incident, system, documents: [documentValue], observation: observationValue, level: "danger" });
  notifications.push({ incident, document: documentValue, system, day, createdAt: new Date().toISOString() });
  renderNotifications();
  closeModal();
  renderWeek(selectedMonday);
  emitDashboardEvent("dashboard:action-success", "Registro salvo");
});

prevWeekBtn?.addEventListener("click", () => {
  selectedMonday = addDays(selectedMonday, -7);
  renderWeek(selectedMonday);
  animateCalendarChange();
});
nextWeekBtn?.addEventListener("click", () => {
  selectedMonday = addDays(selectedMonday, 7);
  renderWeek(selectedMonday);
  animateCalendarChange();
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
function getDateForWeekday(baseMonday, weekday) {
  const index = weekdayOrder.indexOf(weekday);
  return addDays(baseMonday, index < 0 ? 0 : index);
}

async function initializeApp() {
  showWelcomePopup();
  try {
    await loadAttendancesFromDatabase();
  } catch (error) {
    console.error("[Painel] Erro ao carregar dados:", error);
    // Mostra banner de erro visível no painel em vez de só console.warn
    showLoadError(error.message);
    return; // para o fluxo aqui para não sobrescrever o banner
  }
  renderNotifications();
  renderWeek(selectedMonday);
}

initializeApp();
