window.APP_CONFIG = {
  supabaseUrl: "https://qqexlkssyarkmhnxzcbc.supabase.co",
  supabaseAnonKey: "sb_publishable_skavb40bqySKywet3yAWgA_RF0_uI4c",
  tableName: "public.base_atentimento",
};

const weekdayOrder = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA"];
const MAX_VISIBLE_ENTRIES_PER_DAY = 9999;

const board = document.getElementById("board");
const weekCard = document.querySelector(".week-card");
const weekIcon = document.querySelector(".week-icon");
const dayTemplate = document.getElementById("day-template");
const entryTemplate = document.getElementById("entry-template");
const weekRange = document.getElementById("week-range");
const prevWeekBtn = document.getElementById("prev-week");
const nextWeekBtn = document.getElementById("next-week");
const totalAtendimentos = document.getElementById("total-atendimentos");

const notificationsBtn = document.getElementById("notifications-btn");
const filterBtn = document.getElementById("filter-btn");
const exportBtn = document.getElementById("export-btn");
const summaryBtn = document.getElementById("summary-btn");

const notificationsCount = document.getElementById("notifications-count");
const notificationsModal = document.getElementById("notifications-modal");
const notificationsList = document.getElementById("notifications-list");
const closeNotificationsBtn = document.getElementById("close-notifications");

const filterModal = document.getElementById("filter-modal");
const filterForm = document.getElementById("filter-form");
const filterSystemSelect = document.getElementById("filter-system-select");
const clearFilterBtn = document.getElementById("clear-filter");
const cancelFilterBtn = document.getElementById("cancel-filter");

const analyticsModal = document.getElementById("analytics-modal");
const analyticsWeekRange = document.getElementById("analytics-week-range");
const closeAnalyticsBtn = document.getElementById("close-analytics");
const analyticsPrevWeekBtn = document.getElementById("analytics-prev-week");
const analyticsNextWeekBtn = document.getElementById("analytics-next-week");
const chartDemandPerDay = document.getElementById("chart-demand-per-day");
const chartTopCases = document.getElementById("chart-top-cases");
const chartTopSystems = document.getElementById("chart-top-systems");
const chartProblemsByDay = document.getElementById("chart-problems-by-day");

const notifications = [];
const ALERT_WINDOWS = [
  { id: "morning", label: "12:00", startHour: 0, endHour: 12 },
  { id: "afternoon", label: "16:00", startHour: 12, endHour: 16 },
];

const welcomePopup = document.getElementById("welcome-popup");
const welcomeProgressBar = document.getElementById("welcome-progress-bar");

const modal = document.getElementById("record-modal");
const form = document.getElementById("record-form");
const incidentInput = document.getElementById("incident-input");
const documentInput = document.getElementById("document-input");
const systemInput = document.getElementById("system-input");
const observationInput = document.getElementById("observation-input");
const daySelect = document.getElementById("day-select");
const dayDisplay = document.getElementById("day-display");
const cancelRecordBtn = document.getElementById("cancel-record");
const createRecordBtn = document.getElementById("create-record");

const dayRecordsModal = document.getElementById("day-records-modal");
const dayRecordsTitle = document.getElementById("day-records-title");
const dayRecordsList = document.getElementById("day-records-list");
const closeDayRecordsBtn = document.getElementById("close-day-records");

const documentsModal = document.getElementById("documents-modal");
const documentsForm = document.getElementById("documents-form");
const documentsInput = document.getElementById("documents-input");
const cancelDocumentsBtn = document.getElementById("cancel-documents");

const editEntryModal = document.getElementById("edit-entry-modal");
const editEntryForm = document.getElementById("edit-entry-form");
const editIncidentInput = document.getElementById("edit-incident-input");
const editSystemInput = document.getElementById("edit-system-input");
const editObservationInput = document.getElementById("edit-observation-input");
const cancelEditEntryBtn = document.getElementById("cancel-edit-entry");

const APP_CONFIG = {
  supabaseUrl: window.APP_CONFIG?.supabaseUrl || "https://qqexlkssyarkmhnxzcbc.supabase.co",
  supabaseAnonKey: window.APP_CONFIG?.supabaseAnonKey || "sb_publishable_skavb40bqySKywet3yAWgA_RF0_uI4c",
  tableName: window.APP_CONFIG?.tableName || "public.base_atentimento",
  exportFunctionName: window.APP_CONFIG?.exportFunctionName || "export-base-atendimentos",
};

const weekStore = new Map();
let selectedMonday = getMonday(new Date());
let analyticsMonday = null;
let selectedEntryForDocuments = null;
let selectedEntryForEdit = null;
let activeSystemFilter = "ALL";

const getRestTableName = () => APP_CONFIG.tableName.split(".").pop();

const parseISODateAsLocal = (value) => {
  if (typeof value !== "string") return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDate = (date) =>
  date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatDayHeader = (date) =>
  date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

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

const getWeekKey = (monday) => formatDate(monday);

function getDateForWeekday(baseMonday, weekday) {
  const index = weekdayOrder.indexOf(weekday);
  if (index < 0) return new Date(baseMonday);
  return addDays(baseMonday, index);
}

const parseDocumentsInput = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const emitDashboardEvent = (name, message) => {
  window.dispatchEvent(new CustomEvent(name, { detail: { message } }));
};

function getExportFilename(contentDisposition) {
  if (typeof contentDisposition !== "string") {
    return `base_atendimentos_${Date.now()}.xlsx`;
  }

  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (!match?.[1]) {
    return `base_atendimentos_${Date.now()}.xlsx`;
  }

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
  const headers = [
    "semana",
    "dia_semana",
    "incidente",
    "sistema",
    "observacao",
    "documentos",
    "quantidade_documentos",
  ];

  const rows = buildRowsForLocalExport();
  const lines = [headers.join(",")];

  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsvCell(row[header])).join(","));
  });

  const csv = `﻿${lines.join("\n")}`;
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

async function exportDatabaseFromEdgeFunction() {
  const endpoint = `${APP_CONFIG.supabaseUrl}/functions/v1/${APP_CONFIG.exportFunctionName}`;
  const authenticatedHeaders = {
    apikey: APP_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${APP_CONFIG.supabaseAnonKey}`,
  };

  const tryDownloadFromResponse = async (response) => {
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Falha ao exportar base: ${response.status} ${body}`);
    }

    const blob = await response.blob();
    const filename = getExportFilename(response.headers.get("content-disposition"));

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  try {
    const response = await fetch(endpoint, { method: "GET", headers: authenticatedHeaders });
    await tryDownloadFromResponse(response);
    return;
  } catch (primaryError) {
    try {
      const responseWithoutHeaders = await fetch(endpoint, { method: "GET" });
      await tryDownloadFromResponse(responseWithoutHeaders);
      return;
    } catch (secondaryError) {
      const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
      const secondaryMessage = secondaryError instanceof Error ? secondaryError.message : String(secondaryError);

      downloadLocalCsvFallback();
      window.alert(
        `Não foi possível baixar da Edge Function. Baixamos um CSV local do painel como fallback.\n\nDetalhes: ${primaryMessage} | ${secondaryMessage}`
      );
    }
  }
}

async function getNextPrimaryKey() {
  const endpoint = `${APP_CONFIG.supabaseUrl}/rest/v1/${getRestTableName()}?select=id_primary&order=id_primary.desc&limit=1`;
  const headers = {
    apikey: APP_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${APP_CONFIG.supabaseAnonKey}`,
  };

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao consultar último id_primary: ${response.status} ${body}`);
  }

  const rows = await response.json();
  const rawId = rows?.[0]?.id_primary;
  const lastId = Number.parseInt(rawId, 10);

  if (!Number.isNaN(lastId) && lastId >= 1) {
    return lastId + 1;
  }

  return 1;
}

async function saveAttendanceToDatabase({
  incident,
  documentValue,
  system,
  observationValue,
  day,
  weekStart,
  weekEnd,
  dateValue,
}) {
  const endpoint = `${APP_CONFIG.supabaseUrl}/rest/v1/${getRestTableName()}`;
  const headers = {
    "Content-Type": "application/json",
    apikey: APP_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${APP_CONFIG.supabaseAnonKey}`,
    Prefer: "return=minimal",
  };

  let nextId = null;

  try {
    nextId = await getNextPrimaryKey();
  } catch (error) {
    console.warn(error.message);
  }

  const basePayload = {
    data: dateValue,
    incidente: incident,
    documento: documentValue,
    sistema: system,
    observacao: observationValue || `Dia: ${day} | Semana: ${weekStart} - ${weekEnd}`,
  };

  const payload = {
    id_primary: nextId ?? 1,
    ...basePayload,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return payload.id_primary;
    }

    const body = await response.text();
    throw new Error(`Supabase ${response.status}: ${body}`);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Falha ao salvar no Supabase.");
  }
}

async function updateAttendanceInDatabase({ idPrimary, incident, system, observationValue }) {
  const endpoint = `${APP_CONFIG.supabaseUrl}/rest/v1/${getRestTableName()}?id_primary=eq.${idPrimary}`;
  const headers = {
    "Content-Type": "application/json",
    apikey: APP_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${APP_CONFIG.supabaseAnonKey}`,
    Prefer: "return=minimal",
  };

  const payload = {
    incidente: incident,
    sistema: system,
    observacao: observationValue || "",
  };

  const response = await fetch(endpoint, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${response.status}: ${body}`);
  }
}

async function deleteAttendanceFromDatabase(idPrimary) {
  const endpoint = `${APP_CONFIG.supabaseUrl}/rest/v1/${getRestTableName()}?id_primary=eq.${idPrimary}`;
  const headers = {
    apikey: APP_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${APP_CONFIG.supabaseAnonKey}`,
    Prefer: "return=minimal",
  };

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${response.status}: ${body}`);
  }
}

async function loadAttendancesFromDatabase() {
  const endpoint = `${APP_CONFIG.supabaseUrl}/rest/v1/${getRestTableName()}?select=id_primary,data,incidente,documento,sistema,observacao&order=data.asc,id_primary.asc`;
  const headers = {
    apikey: APP_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${APP_CONFIG.supabaseAnonKey}`,
  };

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao carregar atendimentos: ${response.status} ${body}`);
  }

  const rows = await response.json();
  weekStore.clear();
  notifications.length = 0;

  rows.forEach((row) => {
    const date = parseISODateAsLocal(row.data);
    if (!date) return;

    const weekdayIndex = date.getDay() - 1;
    if (weekdayIndex < 0 || weekdayIndex >= weekdayOrder.length) return;

    const day = weekdayOrder[weekdayIndex];
    const monday = getMonday(date);
    const weekKey = getWeekKey(monday);

    if (!weekStore.has(weekKey)) {
      weekStore.set(weekKey, buildEmptyWeek());
    }

    const weekData = weekStore.get(weekKey);
    const dayData = weekData.find((item) => item.day === day);
    if (!dayData) return;

    dayData.entries.push({
      id_primary: row.id_primary,
      title: row.incidente || "Sem incidente",
      system: row.sistema || "Sem sistema",
      documents: [row.documento || "Sem documento"],
      observation: row.observacao || "",
      level: "danger",
    });

    notifications.push({
      incident: row.incidente || "Sem incidente",
      document: row.documento || "Sem documento",
      system: row.sistema || "Sem sistema",
      day,
      createdAt: row.data,
    });
  });
}

function getTodayWeekday() {
  const day = new Date().getDay();
  const map = {
    1: "SEGUNDA",
    2: "TERÇA",
    3: "QUARTA",
    4: "QUINTA",
    5: "SEXTA",
  };
  return map[day] || "SEGUNDA";
}

function buildEmptyWeek() {
  return weekdayOrder.map((day) => ({
    day,
    entries: [],
  }));
}

function getWeekDataForMonday(monday) {
  const key = getWeekKey(monday);
  if (!weekStore.has(key)) {
    weekStore.set(key, buildEmptyWeek());
  }
  return weekStore.get(key);
}

function getActiveWeekData() {
  return getWeekDataForMonday(selectedMonday);
}

function updateTotal(weekData) {
  const total = weekData
    .flatMap((day) => day.entries)
    .reduce((acc, item) => acc + item.documents.length, 0);

  if (totalAtendimentos) {
    totalAtendimentos.textContent = String(total);
  }
}

function showWelcomePopup() {
  if (!welcomePopup) return;

  welcomePopup.setAttribute("aria-hidden", "false");

  if (welcomeProgressBar) {
    welcomeProgressBar.classList.remove("is-running");
    void welcomeProgressBar.offsetWidth;
    welcomeProgressBar.classList.add("is-running");
  }

  window.setTimeout(() => {
    welcomePopup.setAttribute("aria-hidden", "true");
  }, 3000);
}

function renderNotifications() {
  if (!notificationsCount || !notificationsList) return;

  const now = new Date();

  const todaySummaries = ALERT_WINDOWS.map((windowConfig) => {
    const count = notifications.filter((item) => {
      const createdAt = new Date(item.createdAt);
      if (Number.isNaN(createdAt.getTime())) return false;

      const isToday =
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getDate() === now.getDate();

      if (!isToday) return false;

      const hour = createdAt.getHours();
      return hour >= windowConfig.startHour && hour < windowConfig.endHour;
    }).length;

    return {
      ...windowConfig,
      count,
    };
  });

  notificationsCount.textContent = String(
    todaySummaries.reduce((acc, item) => acc + item.count, 0)
  );

  notificationsList.innerHTML = "";

  if (todaySummaries.every((item) => item.count === 0)) {
    notificationsList.innerHTML =
      '<article class="day-record-item"><p>Nenhuma demanda criada hoje para os alertas de 12h e 16h.</p></article>';
    return;
  }

  todaySummaries.forEach((item) => {
    const node = document.createElement("article");
    node.className = "day-record-item";
    node.innerHTML = `
      <h4>Alerta das ${item.label}</h4>
      <p>Demandas criadas hoje: <strong>${item.count}</strong></p>
      <small>Janela considerada: ${String(item.startHour).padStart(2, "0")}:00 até ${String(item.endHour).padStart(2, "0")}:00</small>
    `;
    notificationsList.appendChild(node);
  });
}

function openNotificationsModal() {
  if (!notificationsModal) return;
  renderNotifications();
  notificationsModal.setAttribute("aria-hidden", "false");
  animateModalCard(notificationsModal);
  emitDashboardEvent("dashboard:popup-opened", "Notificações abertas");
}

function closeNotificationsModal() {
  if (!notificationsModal) return;
  notificationsModal.setAttribute("aria-hidden", "true");
}

function getTopEntries(sourceMap, limit = 5) {
  return [...sourceMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function ensureChartTooltip(container) {
  let tooltip = container.querySelector(".chart-tooltip");

  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    tooltip.style.position = "absolute";
    tooltip.style.pointerEvents = "none";
    tooltip.style.zIndex = "10";
    tooltip.style.padding = "0.4rem 0.6rem";
    tooltip.style.background = "rgba(8, 10, 28, 0.95)";
    tooltip.style.border = "1px solid rgba(255, 255, 255, 0.16)";
    tooltip.style.borderRadius = "0.5rem";
    tooltip.style.fontSize = "0.75rem";
    tooltip.style.color = "#ffffff";
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateY(4px)";
    tooltip.style.transition = "opacity 0.18s ease, transform 0.18s ease";
    container.appendChild(tooltip);
  }

  return tooltip;
}

function showChartTooltip(container, event, label, value, prefix = "Quantidade") {
  const tooltip = ensureChartTooltip(container);
  tooltip.innerHTML = `<strong>${label}</strong><br/>${prefix}: ${value}`;
  tooltip.style.opacity = "1";
  tooltip.style.transform = "translateY(0)";

  const rect = container.getBoundingClientRect();
  const left = event.clientX - rect.left + 12;
  const top = event.clientY - rect.top - 8;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideChartTooltip(container) {
  const tooltip = container.querySelector(".chart-tooltip");
  if (!tooltip) return;
  tooltip.style.opacity = "0";
  tooltip.style.transform = "translateY(4px)";
}

function renderBarChart(container, data, emptyMessage = "Sem dados.") {
  if (!container) return;

  container.innerHTML = "";
  container.style.position = "relative";

  if (!data.length) {
    container.innerHTML = `<p class="chart-empty">${emptyMessage}</p>`;
    return;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  data.forEach((item) => {
    const row = document.createElement("div");
    row.className = "chart-row";

    row.innerHTML = `
      <span class="chart-row-label" title="${item.label}">${item.label}</span>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(item.value / max) * 100}%"></div>
      </div>
      <span class="chart-row-value">${item.value}</span>
    `;

    row.addEventListener("mousemove", (event) => {
      showChartTooltip(container, event, item.label, item.value);
    });

    row.addEventListener("mouseleave", () => {
      hideChartTooltip(container);
    });

    container.appendChild(row);
  });
}

function renderLineChart(container, data, emptyMessage = "Sem dados.") {
  if (!container) return;

  container.innerHTML = "";
  container.style.position = "relative";

  if (!data.length) {
    container.innerHTML = `<p class="chart-empty">${emptyMessage}</p>`;
    return;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  const wrapper = document.createElement("div");
  wrapper.className = "line-chart";

  data.forEach((item) => {
    const columnWrap = document.createElement("div");
    columnWrap.className = "line-column-wrap";

    const bar = document.createElement("div");
    bar.className = "line-bar";
    bar.style.height = `${(item.value / max) * 100}%`;

    const label = document.createElement("span");
    label.className = "line-label";
    label.textContent = item.label;

    const value = document.createElement("span");
    value.className = "line-value";
    value.textContent = item.value;

    columnWrap.appendChild(value);
    columnWrap.appendChild(bar);
    columnWrap.appendChild(label);

    columnWrap.addEventListener("mousemove", (event) => {
      showChartTooltip(container, event, item.label, item.value, "Demandas");
    });

    columnWrap.addEventListener("mouseleave", () => {
      hideChartTooltip(container);
    });

    wrapper.appendChild(columnWrap);
  });

  container.appendChild(wrapper);
}

function renderRanking(container, data, emptyMessage = "Sem dados.") {
  if (!container) return;

  container.innerHTML = "";
  container.style.position = "relative";

  if (!data.length) {
    container.innerHTML = `<p class="chart-empty">${emptyMessage}</p>`;
    return;
  }

  data.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "rank-item";

    row.innerHTML = `
      <span title="${item.label}">${index + 1}. ${item.label}</span>
      <strong>${item.value}</strong>
    `;

    row.addEventListener("mousemove", (event) => {
      showChartTooltip(container, event, item.label, item.value);
    });

    row.addEventListener("mouseleave", () => {
      hideChartTooltip(container);
    });

    container.appendChild(row);
  });
}

function buildWeeklyAnalytics(weekData) {
  const demandsByDay = weekdayOrder.map((dayName) => {
    const dayData = weekData.find((item) => item.day === dayName);
    return {
      label: dayName,
      value: dayData?.entries.length || 0,
    };
  });

  const problemsByDay = weekdayOrder.map((dayName) => {
    const dayData = weekData.find((item) => item.day === dayName);
    const problemsCount = (dayData?.entries || []).reduce(
      (acc, entry) => acc + entry.documents.length,
      0
    );
    return {
      label: dayName,
      value: problemsCount,
    };
  });

  const incidentMap = new Map();
  const systemMap = new Map();

  weekData.forEach((dayData) => {
    dayData.entries.forEach((entry) => {
      incidentMap.set(entry.title, (incidentMap.get(entry.title) || 0) + 1);
      systemMap.set(entry.system, (systemMap.get(entry.system) || 0) + 1);
    });
  });

  const topCases = getTopEntries(incidentMap).map(([label, value]) => ({ label, value }));
  const topSystems = getTopEntries(systemMap).map(([label, value]) => ({ label, value }));
  const topDaysByProblems = [...problemsByDay].sort((a, b) => b.value - a.value);

  return {
    demandsByDay,
    topCases,
    topSystems,
    topDaysByProblems,
  };
}

function renderAnalyticsModal() {
  if (!analyticsModal || !analyticsWeekRange) return;

  if (!analyticsMonday) {
    analyticsMonday = new Date(selectedMonday);
  }

  const friday = addDays(analyticsMonday, 4);
  analyticsWeekRange.textContent = `${formatDate(analyticsMonday)} - ${formatDate(friday)}`;

  const weekData = getWeekDataForMonday(analyticsMonday);
  const analytics = buildWeeklyAnalytics(weekData);

  renderLineChart(chartDemandPerDay, analytics.demandsByDay, "Sem demandas nesta semana.");
  renderBarChart(chartProblemsByDay, analytics.topDaysByProblems, "Sem problemas registrados nesta semana.");
  renderBarChart(chartTopSystems, analytics.topSystems, "Sem sistemas com ocorrências nesta semana.");
  renderRanking(chartTopCases, analytics.topCases, "Sem casos para analisar nesta semana.");
}

function openAnalyticsModal() {
  if (!analyticsModal) return;

  analyticsMonday = new Date(selectedMonday);
  renderAnalyticsModal();
  analyticsModal.setAttribute("aria-hidden", "false");
  animateModalCard(analyticsModal);
  emitDashboardEvent("dashboard:popup-opened", "Resumo semanal aberto");
}

function closeAnalyticsModal() {
  if (!analyticsModal) return;
  analyticsModal.setAttribute("aria-hidden", "true");
}

function getUniqueSystemsFromWeek() {
  const systems = new Set();

  getActiveWeekData().forEach((dayData) => {
    dayData.entries.forEach((entry) => {
      if (entry.system) systems.add(entry.system);
    });
  });

  return [...systems].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function populateSystemFilterOptions() {
  if (!filterSystemSelect) return;

  const options = ['<option value="ALL">Todos os sistemas</option>'];

  getUniqueSystemsFromWeek().forEach((system) => {
    const selected = system === activeSystemFilter ? " selected" : "";
    options.push(`<option value="${system}"${selected}>${system}</option>`);
  });

  filterSystemSelect.innerHTML = options.join("");
}

function openFilterModal() {
  if (!filterModal) return;

  populateSystemFilterOptions();
  filterModal.setAttribute("aria-hidden", "false");
  animateModalCard(filterModal);

  if (filterSystemSelect) {
    filterSystemSelect.focus();
  }

  emitDashboardEvent("dashboard:popup-opened", "Filtro de sistema aberto");
}

function closeFilterModal() {
  if (!filterModal) return;
  filterModal.setAttribute("aria-hidden", "true");
}

function openDayRecordsModal(dayName, dateLabel, entries) {
  if (!dayRecordsTitle || !dayRecordsList || !dayRecordsModal) return;

  dayRecordsTitle.textContent = `${dayName} • ${dateLabel}`;
  dayRecordsList.innerHTML = "";

  entries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "day-record-item";
    item.innerHTML = `
      <h4>${entry.title}</h4>
      <p>Sistema: ${entry.system}</p>
      <small>Documentos: ${entry.documents.join(", ")}</small>
    `;
    dayRecordsList.appendChild(item);
  });

  dayRecordsModal.setAttribute("aria-hidden", "false");
  animateModalCard(dayRecordsModal);
}

function openEntryDetailsModal(dayName, dateLabel, entry) {
  if (!dayRecordsTitle || !dayRecordsList || !dayRecordsModal) return;

  dayRecordsTitle.textContent = `${dayName} • ${dateLabel}`;
  dayRecordsList.innerHTML = "";

  const item = document.createElement("article");
  item.className = "day-record-item";

  const documentsMarkup = entry.documents.map((document) => `<li>${document}</li>`).join("");

  item.innerHTML = `
    <h4>Erro: ${entry.title}</h4>
    <p>Sistema: ${entry.system}</p>
    ${entry.observation ? `<p>Observação: ${entry.observation}</p>` : ""}
    <small>Documentos (${entry.documents.length}):</small>
    <ul>${documentsMarkup}</ul>
    <div class="detail-actions">
      <button type="button" class="detail-add-doc-btn">+ Documento</button>
      <button type="button" class="detail-edit-btn">Editar demanda</button>
      <button type="button" class="detail-delete-btn">Excluir demanda</button>
    </div>
  `;

  item.querySelector(".detail-add-doc-btn")?.addEventListener("click", () => {
    openDocumentsModal(entry);
  });

  item.querySelector(".detail-edit-btn")?.addEventListener("click", () => {
    openEditEntryModal(entry);
  });

  item.querySelector(".detail-delete-btn")?.addEventListener("click", async () => {
    const confirmed = window.confirm("Deseja realmente excluir esta demanda?");
    if (!confirmed) return;

    if (!entry.id_primary) {
      window.alert("Não foi possível excluir no banco: id_primary não encontrado.");
      return;
    }

    try {
      await deleteAttendanceFromDatabase(entry.id_primary);
    } catch (error) {
      window.alert(`Não foi possível excluir no banco: ${error.message}`);
      return;
    }

    const weekData = getActiveWeekData();
    const dayData = weekData.find((itemData) => itemData.day === dayName);
    if (!dayData) return;

    const index = dayData.entries.indexOf(entry);
    if (index < 0) return;

    dayData.entries.splice(index, 1);
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
  if (!dayRecordsModal) return;
  dayRecordsModal.setAttribute("aria-hidden", "true");
}

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
    const dayNode = dayTemplate.content.firstElementChild.cloneNode(true);
    const dateLabel = formatDayHeader(addDays(baseMonday, index));

    dayNode.querySelector("h3").textContent = day.day;
    dayNode.querySelector("span").textContent = dateLabel;

    const entriesRoot = dayNode.querySelector(".entries");
    const expandDayBtn = dayNode.querySelector(".expand-day-btn");

    const visibleEntries =
      activeSystemFilter === "ALL"
        ? day.entries
        : day.entries.filter((entry) => entry.system === activeSystemFilter);

    visibleEntries.slice(0, MAX_VISIBLE_ENTRIES_PER_DAY).forEach((entry, entryIndex) => {
      const entryNode = entryTemplate.content.firstElementChild.cloneNode(true);

      entryNode.classList.add(entry.level);
      entryNode.classList.add("is-entering");
      entryNode.style.animationDelay = `${Math.min(entryIndex * 70, 280)}ms`;

      entryNode.querySelector("h4").textContent = entry.title;
      entryNode.querySelector(".system-pill").textContent = entry.system || "Sem sistema";
      entryNode.querySelector("small").textContent =
        `${entry.documents.length} erro${entry.documents.length > 1 ? "s" : ""} com documento`;

      const openDetails = () => {
        openEntryDetailsModal(day.day, dateLabel, entry);
      };

      entryNode.addEventListener("click", openDetails);
      entryNode.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetails();
        }
      });

      entriesRoot.appendChild(entryNode);
    });

    if (expandDayBtn) {
      expandDayBtn.hidden = true;
    }

    board.appendChild(dayNode);
  });

  if (analyticsModal?.getAttribute("aria-hidden") === "false") {
    renderAnalyticsModal();
  }
}

function animateModalCard(modalElement) {
  if (!modalElement) return;

  const card = modalElement.querySelector(".modal-card");
  if (!card) return;

  card.classList.remove("is-animating");
  void card.offsetWidth;
  card.classList.add("is-animating");
}

function openModal() {
  if (!form || !modal) return;

  form.reset();
  const todayWeekday = getTodayWeekday();

  if (daySelect) daySelect.value = todayWeekday;
  if (dayDisplay) dayDisplay.value = todayWeekday;

  modal.setAttribute("aria-hidden", "false");
  animateModalCard(modal);

  if (incidentInput) {
    incidentInput.focus();
  }

  emitDashboardEvent("dashboard:popup-opened", "Novo registro");
}

function closeModal() {
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
}

function openDocumentsModal(entry) {
  if (!documentsModal || !documentsForm) return;

  selectedEntryForDocuments = entry;
  documentsForm.reset();
  documentsModal.setAttribute("aria-hidden", "false");
  animateModalCard(documentsModal);

  if (documentsInput) {
    documentsInput.focus();
  }

  emitDashboardEvent("dashboard:popup-opened", "Adicionar documento");
}

function closeDocumentsModal() {
  if (!documentsModal) return;
  documentsModal.setAttribute("aria-hidden", "true");
  selectedEntryForDocuments = null;
}

function openEditEntryModal(entry) {
  if (!editEntryModal) return;

  selectedEntryForEdit = entry;

  if (editIncidentInput) editIncidentInput.value = entry.title || "";
  if (editSystemInput) editSystemInput.value = entry.system || "";
  if (editObservationInput) editObservationInput.value = entry.observation || "";

  editEntryModal.setAttribute("aria-hidden", "false");
  animateModalCard(editEntryModal);
  emitDashboardEvent("dashboard:popup-opened", "Editar demanda");
}

function closeEditEntryModal() {
  if (!editEntryModal) return;
  editEntryModal.setAttribute("aria-hidden", "true");
  selectedEntryForEdit = null;
}

createRecordBtn?.addEventListener("click", openModal);
cancelRecordBtn?.addEventListener("click", closeModal);
closeDayRecordsBtn?.addEventListener("click", closeDayRecordsModal);
notificationsBtn?.addEventListener("click", openNotificationsModal);
closeNotificationsBtn?.addEventListener("click", closeNotificationsModal);
filterBtn?.addEventListener("click", openFilterModal);

summaryBtn?.addEventListener("click", openAnalyticsModal);
closeAnalyticsBtn?.addEventListener("click", closeAnalyticsModal);

analyticsPrevWeekBtn?.addEventListener("click", () => {
  analyticsMonday = addDays(analyticsMonday || selectedMonday, -7);
  renderAnalyticsModal();
});

analyticsNextWeekBtn?.addEventListener("click", () => {
  analyticsMonday = addDays(analyticsMonday || selectedMonday, 7);
  renderAnalyticsModal();
});

exportBtn?.addEventListener("click", async () => {
  try {
    await exportDatabaseFromEdgeFunction();
  } catch (error) {
    window.alert(`Não foi possível exportar a base: ${error.message}`);
  }
});

modal?.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

dayRecordsModal?.addEventListener("click", (event) => {
  if (event.target === dayRecordsModal) closeDayRecordsModal();
});

notificationsModal?.addEventListener("click", (event) => {
  if (event.target === notificationsModal) closeNotificationsModal();
});

filterModal?.addEventListener("click", (event) => {
  if (event.target === filterModal) closeFilterModal();
});

analyticsModal?.addEventListener("click", (event) => {
  if (event.target === analyticsModal) closeAnalyticsModal();
});

documentsModal?.addEventListener("click", (event) => {
  if (event.target === documentsModal) closeDocumentsModal();
});

editEntryModal?.addEventListener("click", (event) => {
  if (event.target === editEntryModal) closeEditEntryModal();
});

cancelFilterBtn?.addEventListener("click", closeFilterModal);

clearFilterBtn?.addEventListener("click", () => {
  activeSystemFilter = "ALL";
  closeFilterModal();
  renderWeek(selectedMonday);
});

filterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  activeSystemFilter = filterSystemSelect?.value || "ALL";
  closeFilterModal();
  renderWeek(selectedMonday);
});

cancelDocumentsBtn?.addEventListener("click", closeDocumentsModal);
cancelEditEntryBtn?.addEventListener("click", closeEditEntryModal);

editEntryForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedEntryForEdit) {
    closeEditEntryModal();
    return;
  }

  const incident = editIncidentInput?.value.trim() || "";
  const system = editSystemInput?.value.trim() || "";
  const observation = editObservationInput?.value.trim() || "";

  if (!incident || !system) return;

  if (!selectedEntryForEdit.id_primary) {
    window.alert("Não foi possível editar no banco: id_primary não encontrado.");
    return;
  }

  try {
    await updateAttendanceInDatabase({
      idPrimary: selectedEntryForEdit.id_primary,
      incident,
      system,
      observationValue: observation,
    });
  } catch (error) {
    window.alert(`Não foi possível editar no banco: ${error.message}`);
    return;
  }

  selectedEntryForEdit.title = incident;
  selectedEntryForEdit.system = system;
  selectedEntryForEdit.observation = observation;

  closeEditEntryModal();
  closeDayRecordsModal();
  renderWeek(selectedMonday);
  emitDashboardEvent("dashboard:action-success", "Demanda editada com sucesso");
});

documentsForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!selectedEntryForDocuments) {
    closeDocumentsModal();
    return;
  }

  const documents = parseDocumentsInput(documentsInput?.value.trim() || "");
  if (documents.length === 0) {
    documentsInput?.focus();
    return;
  }

  selectedEntryForDocuments.documents.push(...documents);
  closeDocumentsModal();
  renderWeek(selectedMonday);
  emitDashboardEvent("dashboard:action-success", "Documento(s) adicionado(s)");
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const incident = incidentInput?.value.trim() || "";
  const documentValue = documentInput?.value.trim() || "";
  const system = systemInput?.value.trim() || "";
  const observationValue = observationInput?.value.trim() || "";
  const day = daySelect?.value || "";

  if (!incident || !documentValue || !system) return;

  const weekData = getActiveWeekData();
  const dayData = weekData.find((item) => item.day === day);
  if (!dayData) return;

  const weekStart = formatDate(selectedMonday);
  const weekEnd = formatDate(addDays(selectedMonday, 4));
  const dateValue = getDateForWeekday(selectedMonday, day).toISOString().split("T")[0];

  let persistedId = null;

  try {
    persistedId = await saveAttendanceToDatabase({
      incident,
      documentValue,
      system,
      observationValue,
      day,
      weekStart,
      weekEnd,
      dateValue,
    });
  } catch (error) {
    window.alert(`Não foi possível salvar no banco: ${error.message}`);
    return;
  }

  dayData.entries.push({
    id_primary: persistedId,
    title: incident,
    system,
    documents: [documentValue],
    observation: observationValue,
    level: "danger",
  });

  notifications.push({
    incident,
    document: documentValue,
    system,
    day,
    createdAt: new Date().toISOString(),
  });

  renderNotifications();
  closeModal();
  renderWeek(selectedMonday);
  emitDashboardEvent("dashboard:action-success", "Registro salvo com animação");
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

async function initializeApp() {
  showWelcomePopup();

  try {
    await loadAttendancesFromDatabase();
  } catch (error) {
    console.warn(error.message);
  }

  renderNotifications();
  renderWeek(selectedMonday);
}

initializeApp();
