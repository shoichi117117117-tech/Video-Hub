const API_BASE = "/api/tasks";

async function fetchTasks() {
    try {
        const res = await fetch(API_BASE);
        const tasks = await res.json();
        const container = document.getElementById("taskList");

        if (tasks.length === 0) {
            container.innerHTML = `<div class="text-slate-500 text-sm py-8 text-center bg-slate-900/50 rounded-xl border border-slate-800/50">Queue is empty. Drop a link above!</div>`;
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:border-slate-700 transition-all">
                <div class="flex gap-4 items-center w-full sm:w-auto">
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
                    ${task.status === 'ready' ? `
                        <a href="/api/tasks/${task.id}/download" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors text-center shadow-sm">
                            Download(.mp4)
                        </a>
                    ` : `
                        <span class="text-xs text-amber-400 font-medium px-2 py-1 bg-amber-950/40 rounded border border-amber-800/50 animate-pulse">
                            Processing...
                        </span>
                    `}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Failed to load tasks:", err);
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

// Load tasks on startup and poll every 5 seconds
fetchTasks();
setInterval(fetchTasks, 5000);