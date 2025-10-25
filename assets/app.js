import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://yoszuiotyyckvirlbleh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc3p1aW90eXlja3ZpcmxibGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTEzODgsImV4cCI6MjA3NjEyNzM4OH0.SVuKeVx8fdTF38ipWpQaoQTlkfdXj7D05E9-LyBTW04';

// Reuse a global supabase client when present to avoid multiple GoTrueClient instances
// in the same browser context (helps prevent the console warning).
const supabase = (typeof window !== 'undefined' && window.__CEREZO_SUPABASE__) || createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (typeof window !== 'undefined' && !window.__CEREZO_SUPABASE__) {
  window.__CEREZO_SUPABASE__ = supabase;
}

const STAGES = [
  { value: "Preproducción", label: "Preproducción" },
  { value: "Producción", label: "Producción" },
  { value: "Postproducción", label: "Postproducción" },
  { value: "Entregado", label: "Entregado" },
];

const INITIAL_PROJECTS = [
  {
    id: "p1",
    name: "Campaña Arboleda",
    client: "Bosque Films",
    stage: "Preproducción",
    deadline: "2024-08-05",
    owner: "Lucía Torres",
    thumbnail:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    notes: "Rodaje en locación natural. Casting en curso.",
  },
  {
    id: "p2",
    name: "Serie Documental Pacífico",
    client: "Ola Media",
    stage: "Producción",
    deadline: "2024-07-19",
    owner: "Marcos Herrera",
    thumbnail:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80",
    notes: "Semana 3 de rodaje. Equipo en Valdivia.",
  },
  {
    id: "p3",
    name: "Product Launch Solaris",
    client: "Linear Labs",
    stage: "Postproducción",
    deadline: "2024-07-30",
    owner: "Ana Cabrera",
    thumbnail:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
    notes: "Versión 1 enviada. Feedback pendiente.",
  },
  {
    id: "p4",
    name: "Brand Film Aurora",
    client: "Studio Norte",
    stage: "Producción",
    deadline: "2024-07-10",
    owner: "Diego Costa",
    thumbnail:
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=80",
    notes: "Rodaje con Steadicam. Requiere color check.",
  },
  {
    id: "p5",
    name: "Videoclip Solar Beat",
    client: "Luna Records",
    stage: "Postproducción",
    deadline: "2024-07-14",
    owner: "Valeria Mena",
    thumbnail:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
    notes: "Edición fina. Coordinación con animación.",
  },
  {
    id: "p6",
    name: "Spots Festivales 2024",
    client: "Cerezo House",
    stage: "Entregado",
    deadline: "2024-06-21",
    owner: "Equipo Cerezo",
    thumbnail: "",
    notes: "Paquete final entregado y aprobado.",
  },
];

const state = {
  projects: [],
  filters: {
    client: "all",
    stage: "all",
  },
  galleryFilter: "all",
  activeView: "table",
  calendarDate: startOfMonth(new Date()),
  isLoading: true,
};

const ui = {};

window.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  populateStaticSelects();
  await loadProjects();
  renderAll();
}

async function loadProjects() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*');
    
    if (error) {
      console.error('Error loading projects:', error);
      state.projects = [...INITIAL_PROJECTS];
    } else if (data && data.length > 0) {
      state.projects = data;
    } else {
      state.projects = [...INITIAL_PROJECTS];
      await seedInitialData();
    }
  } catch (err) {
    console.error('Error connecting to Supabase:', err);
    state.projects = [...INITIAL_PROJECTS];
  }
  state.isLoading = false;
}

async function seedInitialData() {
  try {
    const { error } = await supabase
      .from('projects')
      .insert(INITIAL_PROJECTS);
    
    if (error) {
      console.error('Error seeding initial data:', error);
    }
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

function cacheElements() {
  ui.viewButtons = Array.from(document.querySelectorAll(".view-btn"));
  ui.views = Array.from(document.querySelectorAll(".view"));
  ui.tableBody = document.getElementById("projectsTableBody");
  ui.clientFilter = document.getElementById("clientFilter");
  ui.stageFilter = document.getElementById("stageFilter");
  ui.kanbanBoard = document.getElementById("kanbanBoard");
  ui.galleryGrid = document.getElementById("galleryGrid");
  ui.galleryFilterButtons = Array.from(
    document.querySelectorAll("[data-gallery-filter]")
  );
  ui.calendarGrid = document.getElementById("calendarGrid");
  ui.calendarMonth = document.getElementById("calendarMonth");
  ui.calendarPrev = document.getElementById("calendarPrev");
  ui.calendarNext = document.getElementById("calendarNext");
  ui.addProjectBtn = document.getElementById("addProjectBtn");
  ui.themeToggle = document.getElementById("themeToggle");
  ui.dialog = document.getElementById("projectDialog");
  ui.form = document.getElementById("projectForm");
  ui.modalTitle = document.getElementById("modalTitle");
  ui.formFields = {
    name: document.getElementById("projectName"),
    client: document.getElementById("projectClient"),
    owner: document.getElementById("projectOwner"),
    stage: document.getElementById("projectStage"),
    deadline: document.getElementById("projectDeadline"),
    thumbnail: document.getElementById("projectThumbnail"),
    notes: document.getElementById("projectNotes"),
  };
}

function bindEvents() {
  ui.viewButtons.forEach((btn) =>
    btn.addEventListener("click", () => setActiveView(btn.dataset.view))
  );

  ui.clientFilter.addEventListener("change", (event) => {
    state.filters.client = event.target.value;
    renderTable();
  });

  ui.stageFilter.addEventListener("change", (event) => {
    state.filters.stage = event.target.value;
    renderTable();
  });

  ui.galleryFilterButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      state.galleryFilter = btn.dataset.galleryFilter;
      ui.galleryFilterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderGallery();
    })
  );

  ui.calendarPrev.addEventListener("click", () => {
    state.calendarDate = addMonths(state.calendarDate, -1);
    renderCalendar();
  });

  ui.calendarNext.addEventListener("click", () => {
    state.calendarDate = addMonths(state.calendarDate, 1);
    renderCalendar();
  });

  ui.addProjectBtn.addEventListener("click", () => openProjectDialog("create"));

  ui.themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    updateThemeToggle();
    refreshIcons();
  });

  ui.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });

  ui.dialog.addEventListener("click", (event) => {
    if (event.target === ui.dialog) {
      closeDialog();
    }
  });

  ui.form.addEventListener("submit", handleFormSubmit);

  document
    .querySelectorAll("[data-close-dialog]")
    .forEach((ctrl) => ctrl.addEventListener("click", closeDialog));
}

function populateStaticSelects() {
  // Stage filter
  ui.stageFilter.innerHTML = [
    `<option value="all">Todas</option>`,
    ...STAGES.map(
      (stage) => `<option value="${stage.value}">${stage.label}</option>`
    ),
  ].join("");

  ui.formFields.stage.innerHTML = STAGES.map(
    (stage) => `<option value="${stage.value}">${stage.label}</option>`
  ).join("");

  refreshClientFilter();
  updateThemeToggle();
}

function renderAll() {
  refreshClientFilter();
  renderTable();
  renderKanban();
  renderCalendar();
  renderGallery();
  refreshIcons();
}

function refreshClientFilter() {
  const selected = state.filters.client;
  const clients = Array.from(
    new Set(state.projects.map((project) => project.client))
  ).sort((a, b) => a.localeCompare(b, "es"));

  ui.clientFilter.innerHTML = [
    `<option value="all">Todos</option>`,
    ...clients.map((client) => `<option value="${client}">${client}</option>`),
  ].join("");

  if (selected !== "all" && !clients.includes(selected)) {
    state.filters.client = "all";
  }

  ui.clientFilter.value = state.filters.client;
  ui.stageFilter.value = state.filters.stage;
}

function renderTable() {
  const projects = getFilteredProjects();
  ui.tableBody.innerHTML = "";

  if (!projects.length) {
    const emptyRow = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Sin proyectos que coincidan con los filtros actuales.";
    td.className = "calendar-empty";
    emptyRow.appendChild(td);
    ui.tableBody.appendChild(emptyRow);
    return;
  }

  projects.forEach((project) => {
    const row = document.createElement("tr");
    row.dataset.id = project.id;

    const nameCell = createEditableCell(project.id, "name", project.name);
    const clientCell = createEditableCell(project.id, "client", project.client);

    const stageCell = document.createElement("td");
    const stageSelect = document.createElement("select");
    STAGES.forEach((stage) => {
      const option = document.createElement("option");
      option.value = stage.value;
      option.textContent = stage.label;
      if (stage.value === project.stage) option.selected = true;
      stageSelect.appendChild(option);
    });
    stageSelect.addEventListener("change", (event) => {
      updateProjectField(project.id, "stage", event.target.value);
    });
    stageCell.appendChild(stageSelect);

    const deadlineCell = document.createElement("td");
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = formatDateForInput(project.deadline);
    dateInput.addEventListener("change", (event) => {
      updateProjectField(project.id, "deadline", event.target.value);
    });
    deadlineCell.appendChild(dateInput);

    const ownerCell = createEditableCell(project.id, "owner", project.owner);

    row.append(nameCell, clientCell, stageCell, deadlineCell, ownerCell);
    ui.tableBody.appendChild(row);
  });
}

function createEditableCell(projectId, field, value) {
  const cell = document.createElement("td");
  cell.contentEditable = "true";
  cell.textContent = value;
  cell.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      cell.blur();
    }
  });
  cell.addEventListener("blur", () => {
    const newValue = cell.textContent.trim();
    if (newValue.length === 0) {
      cell.textContent = value;
      return;
    }
    if (newValue !== value) {
      updateProjectField(projectId, field, newValue);
    }
  });
  return cell;
}

function renderKanban() {
  ui.kanbanBoard.innerHTML = "";

  STAGES.forEach((stage) => {
    const column = document.createElement("article");
    column.className = "kanban-column";
    column.dataset.stage = stage.value;

    const header = document.createElement("header");
    header.innerHTML = `<span>${stage.label}</span><span class="kanban-count">${state.projects.filter((p) => p.stage === stage.value).length}</span>`;

    const list = document.createElement("div");
    list.className = "kanban-items";
    list.dataset.stage = stage.value;
    list.addEventListener("dragover", (event) => {
      event.preventDefault();
      list.classList.add("drag-over");
    });
    list.addEventListener("dragleave", () => list.classList.remove("drag-over"));
    list.addEventListener("drop", (event) => {
      event.preventDefault();
      const projectId = event.dataTransfer.getData("text/plain");
      list.classList.remove("drag-over");
      updateProjectField(projectId, "stage", stage.value);
    });

    state.projects
      .filter((project) => project.stage === stage.value)
      .forEach((project) => {
        const card = document.createElement("article");
        card.className = "kanban-card";
        card.draggable = true;
        card.dataset.id = project.id;
        card.innerHTML = `
          <div>
            <h3>${project.name}</h3>
            <p>${truncateText(project.notes || "Sin notas adjuntas.", 80)}</p>
          </div>
          <div class="kanban-meta">
            <span class="kanban-client"><i data-lucide="briefcase"></i>${project.client}</span>
            <span class="kanban-owner"><i data-lucide="user"></i>${project.owner}</span>
          </div>
        `;
        card.addEventListener("dragstart", (event) => {
          event.dataTransfer.setData("text/plain", project.id);
          card.classList.add("dragging");
        });
        card.addEventListener("dragend", () => card.classList.remove("dragging"));
        card.addEventListener("click", () => openProjectDialog("edit", project.id));
        list.appendChild(card);
      });

    column.append(header, list);
    ui.kanbanBoard.appendChild(column);
  });
}

function renderCalendar() {
  ui.calendarGrid.innerHTML = "";

  const start = startOfMonth(state.calendarDate);
  const month = start.getMonth();
  const startOffset = (start.getDay() + 6) % 7; // Shift Sunday to the end for Monday-first calendar
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - startOffset);

  const totalCells = 42; // 6 weeks grid

  const monthLabel = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(start);
  ui.calendarMonth.textContent =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  for (let i = 0; i < totalCells; i += 1) {
    const dayDate = new Date(gridStart);
    dayDate.setDate(gridStart.getDate() + i);

    const day = document.createElement("div");
    day.className = "calendar-day";
    if (dayDate.getMonth() !== month) {
      day.classList.add("inactive");
    }
    if (isSameDay(dayDate, new Date())) {
      day.classList.add("today");
    }

    const header = document.createElement("div");
    header.className = "calendar-day-header";
    header.innerHTML = `<span>${dayDate.getDate()}</span>`;

    day.appendChild(header);

    const todaysProjects = state.projects.filter((project) =>
      isSameDay(new Date(project.deadline), dayDate)
    );

    if (todaysProjects.length === 0) {
      const placeholder = document.createElement("span");
      placeholder.className = "calendar-empty";
      placeholder.textContent = "Sin entregas";
      day.appendChild(placeholder);
    } else {
      todaysProjects.forEach((project) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "event-pill";
        pill.innerHTML = `<i data-lucide="star"></i>${project.name}`;
        pill.addEventListener("click", () =>
          openProjectDialog("edit", project.id)
        );
        day.appendChild(pill);
      });
    }

    ui.calendarGrid.appendChild(day);
  }
}

function renderGallery() {
  ui.galleryGrid.innerHTML = "";
  const filter = state.galleryFilter;
  const projects =
    filter === "all"
      ? state.projects
      : state.projects.filter((project) => project.stage === filter);

  if (!projects.length) {
    const empty = document.createElement("div");
    empty.className = "calendar-empty";
    empty.textContent = "Nada por aquí todavía. Sube un nuevo proyecto.";
    ui.galleryGrid.appendChild(empty);
    return;
  }

  projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "gallery-card";
    card.dataset.id = project.id;

    const media = document.createElement("div");
    media.className = "gallery-media";
    if (project.thumbnail) {
      const img = document.createElement("img");
      img.src = project.thumbnail;
      img.alt = `Frame del proyecto ${project.name}`;
      media.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "gallery-placeholder";
      placeholder.textContent = project.client
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();
      media.appendChild(placeholder);
    }

    const info = document.createElement("div");
    info.className = "gallery-info";
    info.innerHTML = `
      <span class="gallery-status">
        <i data-lucide="sparkles"></i>${project.stage}
      </span>
      <div>
        <h3>${project.name}</h3>
        <div class="gallery-meta">
          <span><i data-lucide="briefcase"></i> ${project.client}</span>
          <span><i data-lucide="user"></i> ${project.owner}</span>
          <span><i data-lucide="calendar-clock"></i> ${formatHumanDate(
            project.deadline
          )}</span>
        </div>
      </div>
    `;

    card.append(media, info);
    card.addEventListener("click", () => openProjectDialog("edit", project.id));
    ui.galleryGrid.appendChild(card);
  });
}

function openProjectDialog(mode, projectId) {
  ui.dialog.dataset.mode = mode;

  if (mode === "edit") {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return;
    ui.dialog.dataset.projectId = projectId;
    ui.modalTitle.textContent = "Editar proyecto";
    ui.formFields.name.value = project.name;
    ui.formFields.client.value = project.client;
    ui.formFields.owner.value = project.owner;
    ui.formFields.stage.value = project.stage;
    ui.formFields.deadline.value = formatDateForInput(project.deadline);
    ui.formFields.thumbnail.value = project.thumbnail || "";
    ui.formFields.notes.value = project.notes || "";
  } else {
    ui.modalTitle.textContent = "Nuevo proyecto";
    delete ui.dialog.dataset.projectId;
    ui.form.reset();
    ui.formFields.stage.value = STAGES[0].value;
    ui.formFields.deadline.value = formatDateForInput(new Date());
  }

  if (!ui.dialog.open) {
    ui.dialog.showModal();
  }

  window.setTimeout(() => {
    ui.formFields.name.focus();
    if (typeof ui.formFields.name.select === "function") {
      ui.formFields.name.select();
    }
  }, 60);
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const formData = {
    name: ui.formFields.name.value.trim(),
    client: ui.formFields.client.value.trim(),
    owner: ui.formFields.owner.value.trim(),
    stage: ui.formFields.stage.value,
    deadline: ui.formFields.deadline.value,
    thumbnail: ui.formFields.thumbnail.value.trim(),
    notes: ui.formFields.notes.value.trim(),
  };

  if (!formData.name || !formData.client || !formData.owner || !formData.deadline) {
    return;
  }

  if (!isValidDateString(formData.deadline)) {
    ui.formFields.deadline.setCustomValidity("Selecciona una fecha válida");
    ui.formFields.deadline.reportValidity();
    return;
  }
  ui.formFields.deadline.setCustomValidity("");

  try {
    if (ui.dialog.dataset.mode === "edit") {
      const { projectId } = ui.dialog.dataset;
      const { error } = await supabase
        .from('projects')
        .update(formData)
        .eq('id', projectId);
      
      if (error) throw error;
      
      const projectIndex = state.projects.findIndex((project) => project.id === projectId);
      if (projectIndex >= 0) {
        state.projects[projectIndex] = {
          ...state.projects[projectIndex],
          ...formData,
        };
      }
    } else {
      const id =
        (window.crypto &&
          typeof window.crypto.randomUUID === "function" &&
          window.crypto.randomUUID()) ||
        `p-${Date.now()}`;
      
      const newProject = {
        id,
        ...formData,
      };
      
      const { error } = await supabase
        .from('projects')
        .insert([newProject]);
      
      if (error) throw error;
      
      state.projects.push(newProject);
    }
  } catch (error) {
    console.error('Error saving project:', error);
    alert('Error al guardar el proyecto. Por favor intenta de nuevo.');
    return;
  }

  closeDialog();
  renderAll();
}

function closeDialog() {
  if (ui.dialog.open) {
    ui.dialog.close();
  }
  ui.form.reset();
  delete ui.dialog.dataset.mode;
  delete ui.dialog.dataset.projectId;
}

async function updateProjectField(projectId, field, value) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return;

  if (field === "deadline" && !isValidDateString(value)) {
    return;
  }

  project[field] = value;

  try {
    const { error } = await supabase
      .from('projects')
      .update({ [field]: value })
      .eq('id', projectId);
    
    if (error) {
      console.error('Error updating project:', error);
      alert('Error al actualizar el proyecto.');
      return;
    }
  } catch (err) {
    console.error('Error updating project:', err);
  }

  if (field === "client") {
    refreshClientFilter();
  }

  renderAll();
}

function setActiveView(view) {
  state.activeView = view;
  ui.views.forEach((section) => {
    section.classList.toggle("active", section.id === `${view}-view`);
  });
  ui.viewButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.view === view)
  );
  refreshIcons();
}

function getFilteredProjects() {
  return state.projects.filter((project) => {
    const matchClient =
      state.filters.client === "all" || project.client === state.filters.client;
    const matchStage =
      state.filters.stage === "all" || project.stage === state.filters.stage;
    return matchClient && matchStage;
  });
}

function startOfMonth(date) {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addMonths(date, amount) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + amount);
  return startOfMonth(result);
}

function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function formatDateForInput(value) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHumanDate(value) {
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .format(date)
      .replace(".", "");
  } catch (error) {
    return value;
  }
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function isValidDateString(value) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
}

function updateThemeToggle() {
  ui.themeToggle.textContent = "";
  const icon = document.createElement("i");
  icon.dataset.lucide = document.body.classList.contains("dark-theme")
    ? "moon"
    : "sun";
  ui.themeToggle.appendChild(icon);
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}
