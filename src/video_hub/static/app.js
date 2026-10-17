const API_BASE = "/api/tasks";

// State trackers
const selectedTaskIds = new Set();
let currentView = "active"; // "active" or "archive"

function switchTab(view) {
    currentView = view;
    selectedTaskIds.clear();

    const tabActive = document.getElementById("tabActive");
    const tabArchive = document.getElementById("tabArchive");
    const sectionTitle = document.getElementById("sectionTitle");
    const batchToolbar = document.getElementById("batchToolbar");
    const archiveBatchToolbar = document.getElementById("archiveBatchToolbar");

    if (view === "active") {
        tabActive.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-indigo-600 text-white shadow-sm";
        tabArchive.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800";
        sectionTitle.textContent = "Ingestion Queue";
        batchToolbar.style.display = "flex";
        archiveBatchToolbar.style.display = "none";
    } else {
        tabArchive.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-indigo-600 text-white shadow-sm";
        tabActive.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800";
        sectionTitle.textContent = "Archive History";
        batchToolbar.style.display = "none";
        archiveBatchToolbar.style.display = "flex";
    }

    fetchTasks();
}

async function fetchTasks() {
    try {
        const endpoint = currentView === "active" ? API_BASE : `${API_BASE}/archived`;
        const res = await fetch(endpoint);
        const tasks = await res.json();
        const container = document.getElementById("taskList");

        if (tasks.length === 0) {
            const emptyMsg = currentView === "active" ? "Queue is empty. Drop a link above!" : "Archive history is empty.";
            container.innerHTML = `<div class="text-slate-500 text-sm py-8 text-center bg-slate-900/50 rounded-xl border border-slate-800/50">${emptyMsg}</div>`;
            selectedTaskIds.clear();
            return;
        }

        container.innerHTML = tasks.map(task => {
            const isChecked = selectedTaskIds.has(task.id) ? "checked" : "";
            return `
                <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:border-slate-700 transition-all">
                    <div class="flex gap-4 items-center w-full sm:w-auto">
                        <input type="checkbox" value="${task.id}" ${isChecked} onchange="toggleTaskSelection(${task.id}, this.checked)" class="task-checkbox w-4 h-4 accent-indigo-600 rounded bg-slate-800 border-slate-700 cursor-pointer">
                        ${task.poster_url 
                            ? `<img src="${task.poster_url}" alt="Thumbnail" class="w-28 h-16 object-cover rounded-lg bg-slate-800 shrink-0">` 
                            : `<div class="w-28 h-16 bg-slate-800 rounded-lg shrink-0 flex items-center justify-center text-xs text-slate-500">No Art</div>`
                        }
                        <div class="min-w-0 flex-1">
                            <h3 class="font-medium text-sm text-slate-200 truncate max-w-md">${task.title || task.url}</h3>
                            <p class="text-xs text-slate-400 mt-1">Status: <span class="text-emerald-400 font-semibold">${task.status}</span></p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                        ${currentView === 'active' ? `
                            ${task.status === 'ready' ? `
                                <a href="/api/tasks/${task.id}/download" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors text-center shadow-sm">
                                    Download (.mp4)
                                </a>
                            ` : `
                                <span class="text-xs text-amber-400 font-medium px-2 py-1 bg-amber-950/40 rounded border border-amber-800/50 animate-pulse">
                                    Processing...
                                </span>
                            `}
                            <button onclick="archiveTask(${task.id})" class="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium px-2.5 py-2 rounded-lg transition-colors" title="Move to archive">
                                📁
                            </button>
                        ` : `
                            <button onclick="unarchiveTask(${task.id})" class="bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors border border-slate-700">
                                ↺ Restore
                            </button>
                            <button onclick="deleteTask(${task.id})" class="bg-slate-800 hover:bg-red-900/40 hover:text-red-400 text-slate-400 text-xs font-medium px-2.5 py-2 rounded-lg transition-colors" title="Permanently delete">
                                ✕
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Failed to load tasks:", err);
    }
}

function toggleTaskSelection(taskId, isChecked) {
    if (isChecked) {
        selectedTaskIds.add(taskId);
    } else {
        selectedTaskIds.delete(taskId);
    }
}

async function submitTask() {
    const input = document.getElementById("urlInput");
    const btn = document.getElementById("submitBtn");
    const url = input.value.trim();

    if (!url) return;

    btn.disabled = true;
    btn.textContent = "Extracting...";

    try {
        const res = await fetch(API_BASE + "/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        if (res.ok) {
            input.value = "";
            await fetchTasks();
        } else {
            alert("Failed to queue task.");
        }
    } catch (err) {
        console.error("Error submitting task:", err);
    } finally {
        btn.disabled = false;
        btn.textContent = "Extract & Queue";
    }
}

async function triggerBatchDownloads(taskIds) {
    if (taskIds.length === 0) {
        alert("No tasks selected or ready!");
        return;
    }

    for (let i = 0; i < taskIds.length; i++) {
        const taskId = taskIds[i];
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = `${API_BASE}/${taskId}/download`;
        document.body.appendChild(iframe);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}

async function downloadAllReady() {
    try {
        const res = await fetch(`${API_BASE}/batch/ready`);
        const readyTasks = await res.json();
        const ids = readyTasks.map(t => t.id);
        await triggerBatchDownloads(ids);
    } catch (err) {
        console.error("Batch download all failed:", err);
    }
}

async function downloadSelected() {
    const selectedIds = Array.from(selectedTaskIds);
    await triggerBatchDownloads(selectedIds);
}

async function archiveTask(taskId) {
    try {
        const res = await fetch(`${API_BASE}/${taskId}/archive`, { method: "POST" });
        if (res.ok) {
            selectedTaskIds.delete(taskId);
            await fetchTasks();
        }
    } catch (err) {
        console.error("Error archiving task:", err);
    }
}

async function unarchiveTask(taskId) {
    try {
        const res = await fetch(`${API_BASE}/${taskId}/unarchive`, { method: "POST" });
        if (res.ok) {
            await fetchTasks();
        }
    } catch (err) {
        console.error("Error unarchiving task:", err);
    }
}

async function unarchiveSelected() {
    const selectedIds = Array.from(selectedTaskIds);
    
    if (selectedIds.length === 0) {
        alert("No archived tasks selected!");
        return;
    }

    for (let i = 0; i < selectedIds.length; i++) {
        await fetch(`${API_BASE}/${selectedIds[i]}/unarchive`, { method: "POST" });
    }
    selectedTaskIds.clear();
    await fetchTasks();
}

async function deleteTask(taskId) {
    try {
        const res = await fetch(`${API_BASE}/${taskId}`, { method: "DELETE" });
        if (res.ok) {
            await fetchTasks();
        }
    } catch (err) {
        console.error("Error deleting task:", err);
    }
}

function toggleSelectAll(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.task-checkbox');
    checkboxes.forEach(cb => {
        if (!cb.disabled) {
            cb.checked = masterCheckbox.checked;
            const taskId = parseInt(cb.value);
            if (masterCheckbox.checked) {
                selectedTaskIds.add(taskId);
            } else {
                selectedTaskIds.delete(taskId);
            }
        }
    });
}

async function archiveSelected() {
    const selectedIds = Array.from(selectedTaskIds);
    
    if (selectedIds.length === 0) {
        alert("No tasks selected!");
        return;
    }

    for (let i = 0; i < selectedIds.length; i++) {
        await fetch(`${API_BASE}/${selectedIds[i]}/archive`, { method: "POST" });
    }
    selectedTaskIds.clear();
    await fetchTasks();
}

// Initial load & poll loop
fetchTasks();
setInterval(fetchTasks, 5000);