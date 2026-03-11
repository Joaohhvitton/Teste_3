const weekdayOrder = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA"];

const board = document.getElementById("board");
const dayTemplate = document.getElementById("day-template");
const entryTemplate = document.getElementById("entry-template");
const weekRange = document.getElementById("week-range");
const prevWeekBtn = document.getElementById("prev-week");
const nextWeekBtn = document.getElementById("next-week");
const totalAtendimentos = document.getElementById("total-atendimentos");

const modal = document.getElementById("record-modal");
const form = document.getElementById("record-form");
const incidentInput = document.getElementById("incident-input");
const documentInput = document.getElementById("document-input");
const systemInput = document.getElementById("system-input");
const daySelect = document.getElementById("day-select");
const dayDisplay = document.getElementById("day-display");
const cancelRecordBtn = document.getElementById("cancel-record");
const createRecordBtn = document.getElementById("create-record");

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

function renderWeek(baseMonday) {
  board.innerHTML = "";
  const friday = addDays(baseMonday, 4);
  weekRange.textContent = `${formatDate(baseMonday)} - ${formatDate(friday)}`;

  const weekData = getActiveWeekData();
  updateTotal(weekData);

  weekData.forEach((day, index) => {
    const dayNode = dayTemplate.content.firstElementChild.cloneNode(true);
    dayNode.querySelector("h3").textContent = day.day;
    dayNode.querySelector("span").textContent = formatDayHeader(addDays(baseMonday, index));

    const entriesRoot = dayNode.querySelector(".entries");
    day.entries.forEach((entry) => {
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

    board.appendChild(dayNode);
  });
}

function openModal() {
  form.reset();
  const todayWeekday = getTodayWeekday();
  daySelect.value = todayWeekday;
  dayDisplay.value = todayWeekday;
  modal.setAttribute("aria-hidden", "false");
  incidentInput.focus();
}

function closeModal() {
  modal.setAttribute("aria-hidden", "true");
}

createRecordBtn.addEventListener("click", openModal);
cancelRecordBtn.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const incident = incidentInput.value.trim();
  const documentValue = documentInput.value.trim();
  const system = systemInput.value.trim();
  const day = daySelect.value;

  if (!incident || !documentValue || !system) return;

  const weekData = getActiveWeekData();
  const dayData = weekData.find((item) => item.day === day);

  dayData.entries.push({
    title: incident,
    system,
    documents: [documentValue],
    level: "danger",
  });

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

renderWeek(selectedMonday);
