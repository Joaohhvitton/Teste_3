window.APP_CONFIG = {
  supabaseUrl: "https://qqexlkssyarkmhnxzcbc.supabase.co",
  supabaseAnonKey: "sb_publishable_skavb40bqySKywet3yAWgA_RF0_uI4c",
  tableName: "public.base_atentimento",
};

const weekdayOrder = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA"];
const MAX_VISIBLE_ENTRIES_PER_DAY = 4;

const board = document.getElementById("board");
const dayTemplate = document.getElementById("day-template");
const entryTemplate = document.getElementById("entry-template");
const weekRange = document.getElementById("week-range");
const prevWeekBtn = document.getElementById("prev-week");
const nextWeekBtn = document.getElementById("next-week");
const totalAtendimentos = document.getElementById("total-atendimentos");

const notificationsBtn = document.getElementById("notifications-btn");
const notificationsCount = document.getElementById("notifications-count");
const notificationsModal = document.getElementById("notifications-modal");
const notificationsList = document.getElementById("notifications-list");
const closeNotificationsBtn = document.getElementById("close-notifications");
const notifications = [];

const welcomePopup = document.getElementById("welcome-popup");

const modal = document.getElementById("record-modal");
const form = document.getElementById("record-form");
const incidentInput = document.getElementById("incident-input");
const documentInput = document.getElementById("document-input");
const systemInput = document.getElementById("system-input");
const daySelect = document.getElementById("day-select");
const dayDisplay = document.getElementById("day-display");
const cancelRecordBtn = document.getElementById("cancel-record");
const createRecordBtn = document.getElementById("create-record");

const dayRecordsModal = document.getElementById("day-records-modal");
const dayRecordsTitle = document.getElementById("day-records-title");
const dayRecordsList = document.getElementById("day-records-list");
const closeDayRecordsBtn = document.getElementById("close-day-records");

const APP_CONFIG = {
  supabaseUrl: window.APP_CONFIG?.supabaseUrl || "https://qqexlkssyarkmhnxzcbc.supabase.co",
  supabaseAnonKey: window.APP_CONFIG?.supabaseAnonKey || "sb_publishable_skavb40bqySKywet3yAWgA_RF0_uI4c",
  tableName: window.APP_CONFIG?.tableName || "public.base_atentimento",
};

const getRestTableName = () => APP_CONFIG.tableName.split(".").pop();

const parseISODateAsLocal = (value) => {
  if (typeof value !== "string") return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const getDateForWeekday = (baseMonday, weekday) => {
  const index = weekdayOrder.indexOf(weekday);
  if (index < 0) return new Date(baseMonday);
  return addDays(baseMonday, index);
};


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

async function saveAttendanceToDatabase({ incident, documentValue, system, day, weekStart, weekEnd, dateValue }) {
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
    observacao: `Dia: ${day} | Semana: ${weekStart} - ${weekEnd}`,
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
      return;
    }

    const body = await response.text();
    throw new Error(`Supabase ${response.status}: ${body}`);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Falha ao salvar no Supabase.");
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
      title: row.incidente || "Sem incidente",
      system: row.sistema || "Sem sistema",
      documents: [row.documento || "Sem documento"],
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


const formatDate = (date) =>
  date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const formatDayHeader = (date) =>
  date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const getWeekKey = (monday) => formatDate(monday);

const getTodayWeekday = () => {
  const day = new Date().getDay();
  const map = {
    1: "SEGUNDA",
    2: "TERÇA",
    3: "QUARTA",
    4: "QUINTA",
    5: "SEXTA",
  };
  return map[day] || "SEGUNDA";
};

const buildEmptyWeek = () =>
  weekdayOrder.map((day) => ({
    day,
    entries: [],
  }));

const weekStore = new Map();
let selectedMonday = getMonday(new Date());

function getActiveWeekData() {
  const key = getWeekKey(selectedMonday);
  if (!weekStore.has(key)) {
    weekStore.set(key, buildEmptyWeek());
  }
  return weekStore.get(key);
}

function updateTotal(weekData) {
  const total = weekData.flatMap((day) => day.entries).reduce((acc, item) => acc + item.documents.length, 0);
  totalAtendimentos.textContent = String(total);
}

function showWelcomePopup() {
  if (!welcomePopup) return;
  welcomePopup.setAttribute("aria-hidden", "false");
  window.setTimeout(() => {
    welcomePopup.setAttribute("aria-hidden", "true");
  }, 4000);
}

function renderNotifications() {
  notificationsCount.textContent = String(notifications.length);
  notificationsList.innerHTML = "";

  if (notifications.length === 0) {
    notificationsList.innerHTML = '<article class="day-record-item"><p>Nenhuma demanda cadastrada ainda.</p></article>';
    return;
  }

  [...notifications].reverse().forEach((item) => {
    const node = document.createElement("article");
    node.className = "day-record-item";
    node.innerHTML = `
      <h4>${item.incident}</h4>
      <p>${item.day} • ${item.system}</p>
      <small>${item.document}</small>
    `;
    notificationsList.appendChild(node);
  });
}

function openNotificationsModal() {
  renderNotifications();
  notificationsModal.setAttribute("aria-hidden", "false");
  animateModalCard(notificationsModal);
}

function closeNotificationsModal() {
  notificationsModal.setAttribute("aria-hidden", "true");
}

function openDayRecordsModal(dayName, dateLabel, entries) {
  dayRecordsTitle.textContent = `${dayName} • ${dateLabel}`;
  dayRecordsList.innerHTML = "";

  entries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "day-record-item";
    item.innerHTML = `
      <h4>${entry.title}</h4>
      <p>${entry.system}</p>
      <small>${entry.documents.join(", ")}</small>
    `;
    dayRecordsList.appendChild(item);
  });

  dayRecordsModal.setAttribute("aria-hidden", "false");
  animateModalCard(dayRecordsModal);
}

function closeDayRecordsModal() {
  dayRecordsModal.setAttribute("aria-hidden", "true");
}

function renderWeek(baseMonday) {
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

    const visibleEntries = day.entries.slice(0, MAX_VISIBLE_ENTRIES_PER_DAY);
    visibleEntries.forEach((entry) => {
      const entryNode = entryTemplate.content.firstElementChild.cloneNode(true);
      entryNode.classList.add(entry.level);
      entryNode.querySelector("h4").textContent = entry.title;
      entryNode.querySelector("p").textContent = `${entry.system} • ${entry.documents.join(", ")}`;
      entryNode.querySelector("small").textContent = `${entry.documents.length} erro${entry.documents.length > 1 ? "s" : ""} com documento`;

      const addDocumentBtn = entryNode.querySelector(".add-document-btn");
      addDocumentBtn.addEventListener("click", () => {
        const newDocument = window.prompt("Informe o novo documento/cliente:");
        if (!newDocument) return;
        entry.documents.push(newDocument.trim());
        renderWeek(selectedMonday);
      });

      entriesRoot.appendChild(entryNode);
    });

    if (day.entries.length > MAX_VISIBLE_ENTRIES_PER_DAY) {
      const hiddenCount = day.entries.length - MAX_VISIBLE_ENTRIES_PER_DAY;
      expandDayBtn.hidden = false;
      expandDayBtn.textContent = `Expandir (${hiddenCount}+)`;
      expandDayBtn.addEventListener("click", () => {
        openDayRecordsModal(day.day, dateLabel, day.entries);
      });
    }

    board.appendChild(dayNode);
  });
}


function animateModalCard(modalElement) {
  const card = modalElement.querySelector('.modal-card');
  if (!card) return;
  card.classList.remove('is-animating');
  void card.offsetWidth;
  card.classList.add('is-animating');
}

function openModal() {
  form.reset();
  const todayWeekday = getTodayWeekday();
  daySelect.value = todayWeekday;
  dayDisplay.value = todayWeekday;
  modal.setAttribute("aria-hidden", "false");
  animateModalCard(modal);
  incidentInput.focus();
}

function closeModal() {
  modal.setAttribute("aria-hidden", "true");
}

createRecordBtn.addEventListener("click", openModal);
cancelRecordBtn.addEventListener("click", closeModal);
closeDayRecordsBtn.addEventListener("click", closeDayRecordsModal);
notificationsBtn.addEventListener("click", openNotificationsModal);
closeNotificationsBtn.addEventListener("click", closeNotificationsModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

dayRecordsModal.addEventListener("click", (event) => {
  if (event.target === dayRecordsModal) {
    closeDayRecordsModal();
  }
});

notificationsModal.addEventListener("click", (event) => {
  if (event.target === notificationsModal) {
    closeNotificationsModal();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const incident = incidentInput.value.trim();
  const documentValue = documentInput.value.trim();
  const system = systemInput.value.trim();
  const day = daySelect.value;

  if (!incident || !documentValue || !system) return;

  const weekData = getActiveWeekData();
  const dayData = weekData.find((item) => item.day === day);

  const weekStart = formatDate(selectedMonday);
  const weekEnd = formatDate(addDays(selectedMonday, 4));
  const dateValue = getDateForWeekday(selectedMonday, day).toISOString().split("T")[0];

  try {
    await saveAttendanceToDatabase({
      incident,
      documentValue,
      system,
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
    title: incident,
    system,
    documents: [documentValue],
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
});

prevWeekBtn.addEventListener("click", () => {
  selectedMonday = addDays(selectedMonday, -7);
  renderWeek(selectedMonday);
});

nextWeekBtn.addEventListener("click", () => {
  selectedMonday = addDays(selectedMonday, 7);
  renderWeek(selectedMonday);
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
