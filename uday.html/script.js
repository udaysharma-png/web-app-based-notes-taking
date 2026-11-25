 // ===== 1. Elements =====
const titleInput = document.getElementById("noteTitle");
const contentInput = document.getElementById("noteContent");
const categorySelect = document.getElementById("noteCategory");
const charCount = document.getElementById("charCount");
const addBtn = document.getElementById("addBtn");
const cancelBtn = document.getElementById("cancelBtn");
const notesContainer = document.getElementById("notesContainer");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const categoryFilters = document.getElementById("categoryFilters");
const noteCount = document.getElementById("noteCount");
const themeBtn = document.getElementById("themeBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const toast = document.getElementById("toast");

const CATEGORIES = ["Personal", "Study", "Work", "Ideas"];

// ===== 2. Notes load / save =====
function normalizeNote(note, i) {
  return {
    id: Number(note.id) || Date.now() + i,
    title: String(note.title || ""),
    content: String(note.content || ""),
    category: CATEGORIES.includes(note.category) ? note.category : "Personal",
    pinned: Boolean(note.pinned),
    createdAt: note.createdAt || null,
    updatedAt: note.updatedAt || null,
    oldDate: note.oldDate || note.date || ""
  };
}

function loadNotes() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem("notes"));
  } catch (e) {
    data = null;
  }
  if (!Array.isArray(data)) return [];
  return data.map(normalizeNote);
}

let notes = loadNotes();
let editId = null;
let activeFilter = "All";
let lastDeleted = null;

function saveNotes() {
  localStorage.setItem("notes", JSON.stringify(notes));
}

// ===== 3. Helpers =====
function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getDateText(note) {
  let text = "";
  if (note.createdAt) {
    text = "Created: " + formatDateTime(note.createdAt);
  } else if (note.oldDate) {
    text = note.oldDate;
  }
  if (note.updatedAt) {
    text += " | Edited: " + formatDateTime(note.updatedAt);
  }
  return text;
}

function findNote(id) {
  return notes.find(function (n) {
    return n.id === id;
  });
}

// ===== 4. Toast (chhota notification) =====
let toastTimer = null;

function hideToast() {
  toast.classList.remove("show");
}

function showToast(message, actionLabel, onAction) {
  toast.innerHTML = "";

  const text = document.createElement("span");
  text.textContent = message;
  toast.appendChild(text);

  if (actionLabel) {
    const btn = document.createElement("button");
    btn.textContent = actionLabel;
    btn.addEventListener("click", function () {
      onAction();
      hideToast();
    });
    toast.appendChild(btn);
  }

  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 5000);
}

// ===== 5. Notes dikhao =====
function sortNotes(list) {
  const mode = sortSelect.value;
  return list.sort(function (a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; // pinned hamesha upar
    if (mode === "oldest") return (a.createdAt || 0) - (b.createdAt || 0);
    if (mode === "az") return (a.title || "").localeCompare(b.title || "");
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function displayNotes() {
  notesContainer.innerHTML = "";

  const searchText = searchInput.value.trim().toLowerCase();

  const filtered = notes.filter(function (note) {
    const matchesSearch =
      note.title.toLowerCase().includes(searchText) ||
      note.content.toLowerCase().includes(searchText);

    let matchesFilter = true;
    if (activeFilter === "Pinned") matchesFilter = note.pinned;
    else if (activeFilter !== "All") matchesFilter = note.category === activeFilter;

    return matchesSearch && matchesFilter;
  });

  const visibleNotes = sortNotes(filtered);

  noteCount.textContent =
    "Showing " + visibleNotes.length + " of " + notes.length + (notes.length === 1 ? " note" : " notes");

  if (visibleNotes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-msg";
    empty.textContent =
      notes.length === 0
        ? "NO NOTES YET."
        : "no match found.";
    notesContainer.appendChild(empty);
    return;
  }

  visibleNotes.forEach(function (note) {
    const noteDiv = document.createElement("div");
    noteDiv.classList.add("note");
    if (note.pinned) noteDiv.classList.add("pinned");

    noteDiv.innerHTML = `
      <div class="note-top">
        <h3>${escapeHTML(note.title) || "Untitled"}</h3>
        <button class="pin-btn ${note.pinned ? "active" : ""}"
                data-action="pin" data-id="${note.id}"
                title="${note.pinned ? "Unpin karo" : "Pin karo"}">📌</button>
      </div>
      <p>${escapeHTML(note.content)}</p>
      <div class="note-meta">
        <span class="badge cat-${note.category.toLowerCase()}">${note.category}</span>
        <small class="note-date">🕒 ${escapeHTML(getDateText(note))}</small>
      </div>
      <div class="note-actions">
        <button class="copy-btn" data-action="copy" data-id="${note.id}">Copy</button>
        <button class="edit-btn" data-action="edit" data-id="${note.id}">Edit</button>
        <button class="delete-btn" data-action="delete" data-id="${note.id}">Delete</button>
      </div>
    `;
    notesContainer.appendChild(noteDiv);
  });
}

// ===== 6. Note ke buttons (Pin / Copy / Edit / Delete) =====
notesContainer.addEventListener("click", function (e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;

  if (action === "delete") deleteNote(id);
  if (action === "edit") editNote(id);
  if (action === "pin") togglePin(id);
  if (action === "copy") copyNote(id);
});

function deleteNote(id) {
  const note = findNote(id);
  if (!note) return;

  lastDeleted = note;
  notes = notes.filter(function (n) {
    return n.id !== id;
  });

  if (editId === id) resetForm();

  saveNotes();
  displayNotes();

  showToast("Note deleted", "Undo", function () {
    if (lastDeleted) {
      notes.push(lastDeleted);
      lastDeleted = null;
      saveNotes();
      displayNotes();
    }
  });
}

function editNote(id) {
  const note = findNote(id);
  if (!note) return;

  titleInput.value = note.title;
  contentInput.value = note.content;
  categorySelect.value = note.category;
  editId = id;
  addBtn.textContent = "Update Note";
  cancelBtn.hidden = false;
  updateCounter();
  titleInput.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function togglePin(id) {
  const note = findNote(id);
  if (!note) return;

  note.pinned = !note.pinned;
  saveNotes();
  displayNotes();
}

function copyNote(id) {
  const note = findNote(id);
  if (!note) return;

  const text = note.title + "\n\n" + note.content;
  navigator.clipboard
    .writeText(text)
    .then(function () {
      showToast("Note copied📋");
    })
    .catch(function () {
      showToast("note not copied");
    });
}

// ===== 7. Form =====
function updateCounter() {
  const text = contentInput.value.trim();
  const words = text === "" ? 0 : text.split(/\s+/).length;
  charCount.textContent = words + " words, " + contentInput.value.length + " characters";
}

function resetForm() {
  titleInput.value = "";
  contentInput.value = "";
  categorySelect.value = "Personal";
  editId = null;
  addBtn.textContent = "Add Note";
  cancelBtn.hidden = true;
  updateCounter();
}

function saveNote() {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const category = categorySelect.value;

  if (title === "" && content === "") {
    showToast("Pehle kuch likho!");
    titleInput.focus();
    return;
  }

  if (editId === null) {
    notes.push({
      id: Date.now(),
      title: title,
      content: content,
      category: category,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: null,
      oldDate: ""
    });
    showToast("Note added✅");
  } else {
    const note = findNote(editId);
    if (note) {
      note.title = title;
      note.content = content;
      note.category = category;
      note.updatedAt = Date.now();
    }
    showToast("Note updated ✅");
  }

  saveNotes();
  resetForm();
  displayNotes();
}

addBtn.addEventListener("click", saveNote);
cancelBtn.addEventListener("click", resetForm);
contentInput.addEventListener("input", updateCounter);

// Shortcuts: Ctrl+Enter = save, Esc = edit cancel
document.addEventListener("keydown", function (e) {
  const inForm = e.target === titleInput || e.target === contentInput;
  if (e.ctrlKey && e.key === "Enter" && inForm) {
    e.preventDefault();
    saveNote();
  }
  if (e.key === "Escape" && editId !== null) {
    resetForm();
  }
});

// ===== 8. Search, sort, filter =====
searchInput.addEventListener("input", displayNotes);
sortSelect.addEventListener("change", displayNotes);

categoryFilters.addEventListener("click", function (e) {
  const chip = e.target.closest(".chip");
  if (!chip) return;

  activeFilter = chip.dataset.filter;
  categoryFilters.querySelectorAll(".chip").forEach(function (c) {
    c.classList.toggle("active", c === chip);
  });
  displayNotes();
});

// ===== 9. Backup: Export / Import =====
exportBtn.addEventListener("click", function () {
  if (notes.length === 0) {
    showToast("NO NOTE FOR EXPORT");
    return;
  }

  const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "my-notes-backup.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showToast("Backup downloaded 💾");
});

importBtn.addEventListener("click", function () {
  importFile.click();
});

importFile.addEventListener("change", function () {
  const file = importFile.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function () {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("WRONG FORMAT");

      let added = 0;
      data.forEach(function (item, i) {
        const note = normalizeNote(item, i);
        if (!findNote(note.id)) {
          notes.push(note);
          added++;
        }
      });

      saveNotes();
      displayNotes();
      showToast(added + " note imported✅");
    } catch (err) {
      showToast("File error note not updated");
    }
    importFile.value = "";
  };
  reader.readAsText(file);
});

// ===== 10. Dark mode =====
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeBtn.textContent = "☀️ Light Mode";
}

themeBtn.addEventListener("click", function () {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
    themeBtn.textContent = "☀️ Light Mode";
  } else {
    localStorage.setItem("theme", "light");
    themeBtn.textContent = "🌙 Dark Mode";
  }
});

// ===== 11. Start =====
saveNotes();
updateCounter();
displayNotes();