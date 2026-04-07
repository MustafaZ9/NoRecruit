/* ============================================
   LOD MEMBERS — Search, CSV, Add Member
   ============================================ */
(() => {
    const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMW9t3vfH3ganvTFRmX2WcUoaR7UAIc7oW13TmvyCt4DsOZ-pf34mIAE7BWKWRa2wsxTJ0CgyYQXz6/pub?gid=848797758&single=true&output=csv";
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzUe5q2XUyii6o4M-YxK2AiRvnFP0GmLByNWkbJmt_7qmqs2F6AxYKgn7t9JrcmGwKrLQ/exec?gid=848797758";

    let members = [];
    let loaded = false;

    const searchInput = document.getElementById('lodSearchInput');
    const resultsArea = document.getElementById('lodResults');
    const statusBadge = document.getElementById('lodStatus');
    const statusDot = statusBadge?.querySelector('.dot');
    const statusText = document.getElementById('lodStatusText');

    const modal = document.getElementById('lodModal');
    const openModalBtn = document.getElementById('lodOpenModal');
    const closeModalBtn = document.getElementById('lodCloseModal');
    const cancelBtn = document.getElementById('lodCancelBtn');
    const form = document.getElementById('lodForm');
    const submitBtn = document.getElementById('lodSubmitBtn');
    const successAlert = document.getElementById('lodSuccess');
    const errorAlert = document.getElementById('lodError');

    // ---- CSV Loading ----
    function loadData() {
        statusBadge.className = 'status-badge status-badge--loading';
        statusText.textContent = 'Connecting to database...';

        fetch(SHEET_CSV_URL)
            .then(res => {
                if (!res.ok) throw new Error('Network error');
                return res.text();
            })
            .then(csv => {
                members = parseCSV(csv);
                loaded = true;
                statusBadge.className = 'status-badge status-badge--success';
                if (statusDot) statusDot.style.animation = 'none';
                statusText.textContent = `${members.length} Members Loaded`;
                searchInput.disabled = false;
                searchInput.placeholder = 'Type ID or Name to search...';

                try {
                    sessionStorage.setItem('lod_cache', JSON.stringify({
                        data: members,
                        ts: Date.now()
                    }));
                } catch (e) { /* ignore */ }
            })
            .catch(err => {
                console.error('LoD load error:', err);
                statusBadge.className = 'status-badge status-badge--error';
                if (statusDot) statusDot.style.animation = 'none';
                statusText.textContent = 'Connection Failed';
            });
    }

    function parseCSV(text) {
        const lines = text.split('\n');
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const cols = parts.map(c => c.replace(/^"|"$/g, '').trim());
            if (cols.length >= 2) {
                result.push({
                    id: cols[1] || "Unknown",
                    name: cols[0] || "Unknown",
                    reason: ""
                });
            }
        }
        return result;
    }

    // ---- Search ----
    const doSearch = debounce(function (query) {
        resultsArea.innerHTML = '';
        if (!query) {
            resultsArea.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Enter member name or ID to search...</div></div>';
            return;
        }

        const matches = members.filter(p =>
            p.id.includes(query) || p.name.toLowerCase().includes(query)
        );

        if (matches.length > 0) {
            matches.forEach((player, i) => {
                const card = document.createElement('div');
                card.className = 'lod-card card-animate';
                card.style.animationDelay = `${i * 0.05}s`;
                const reasonHtml = player.reason
                    ? `<div class="lod-player-reason">${escapeHtml(player.reason)}</div>`
                    : '';
                card.innerHTML = `
                    <div class="lod-player-info">
                        <span class="lod-player-name">${escapeHtml(player.name)}</span>
                        <span class="lod-player-id">ID: ${escapeHtml(player.id)}</span>
                        ${reasonHtml}
                    </div>
                    <span class="lod-badge">MEMBER</span>
                `;
                resultsArea.appendChild(card);
            });
        } else {
            resultsArea.innerHTML = '<div class="lod-clean">No member found matching that query.</div>';
        }
    }, 250);

    searchInput?.addEventListener('input', function () {
        doSearch(this.value.trim().toLowerCase());
    });

    // ---- Modal ----
    function openModal() {
        modal.classList.add('open');
        successAlert.classList.remove('show');
        errorAlert.classList.remove('show');
    }
    function closeModal() {
        modal.classList.remove('open');
        form.reset();
        successAlert.classList.remove('show');
        errorAlert.classList.remove('show');
    }

    openModalBtn?.addEventListener('click', openModal);
    closeModalBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // ---- Add Member ----
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('lodPlayerName').value.trim();
        const id = document.getElementById('lodPlayerId').value.trim();

        if (!id) {
            errorAlert.textContent = '❌ Player ID is required!';
            errorAlert.classList.add('show');
            successAlert.classList.remove('show');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        errorAlert.classList.remove('show');
        successAlert.classList.remove('show');

        try {
            const formData = new URLSearchParams();
            formData.append('Name', name);
            formData.append('ID', id);

            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            successAlert.textContent = '✅ Member added! Updating database...';
            successAlert.classList.add('show');
            form.reset();

            setTimeout(() => {
                loadData();
                closeModal();
                submitBtn.disabled = false;
                submitBtn.textContent = 'Add Member';
            }, 2500);
        } catch (err) {
            console.error('Add member error:', err);
            errorAlert.textContent = '❌ Network error. Check your connection.';
            errorAlert.classList.add('show');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Member';
        }
    });

    // ---- Lazy Load ----
    function tryLoad() {
        if (loaded) return;
        try {
            const cached = JSON.parse(sessionStorage.getItem('lod_cache'));
            if (cached && (Date.now() - cached.ts) < 5 * 60 * 1000) {
                members = cached.data;
                loaded = true;
                statusBadge.className = 'status-badge status-badge--success';
                if (statusDot) statusDot.style.animation = 'none';
                statusText.textContent = `${members.length} Members (cached)`;
                searchInput.disabled = false;
                searchInput.placeholder = 'Type ID or Name to search...';
                return;
            }
        } catch (e) { /* ignore */ }
        loadData();
    }

    window.addEventListener('tabchange', (e) => {
        if (e.detail.tab === 'lod') tryLoad();
    });

    document.addEventListener('DOMContentLoaded', () => {
        const hash = location.hash.replace('#', '');
        if (hash === 'lod') tryLoad();
    });

    // ---- Helpers ----
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
