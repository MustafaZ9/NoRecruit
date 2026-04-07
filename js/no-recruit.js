/* ============================================
   NO RECRUIT — Search, CSV, Add Player
   ============================================ */
(() => {
    const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMW9t3vfH3ganvTFRmX2WcUoaR7UAIc7oW13TmvyCt4DsOZ-pf34mIAE7BWKWRa2wsxTJ0CgyYQXz6/pub?gid=679693607&single=true&output=csv";
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzUe5q2XUyii6o4M-YxK2AiRvnFP0GmLByNWkbJmt_7qmqs2F6AxYKgn7t9JrcmGwKrLQ/exec?gid=679693607";

    let blockedPlayers = [];
    let loaded = false;

    const searchInput = document.getElementById('nrSearchInput');
    const resultsArea = document.getElementById('nrResults');
    const statusBadge = document.getElementById('nrStatus');
    const statusDot = statusBadge?.querySelector('.dot');
    const statusText = document.getElementById('nrStatusText');

    const modal = document.getElementById('nrModal');
    const openModalBtn = document.getElementById('nrOpenModal');
    const closeModalBtn = document.getElementById('nrCloseModal');
    const cancelBtn = document.getElementById('nrCancelBtn');
    const form = document.getElementById('nrForm');
    const submitBtn = document.getElementById('nrSubmitBtn');
    const successAlert = document.getElementById('nrSuccess');
    const errorAlert = document.getElementById('nrError');

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
                blockedPlayers = parseCSV(csv);
                loaded = true;
                statusBadge.className = 'status-badge status-badge--success';
                if (statusDot) statusDot.style.animation = 'none';
                statusText.textContent = `${blockedPlayers.length} Records Loaded`;
                searchInput.disabled = false;
                searchInput.placeholder = 'Type ID or Name to search...';

                // Cache in sessionStorage
                try {
                    sessionStorage.setItem('nr_cache', JSON.stringify({
                        data: blockedPlayers,
                        ts: Date.now()
                    }));
                } catch (e) { /* quota exceeded, ignore */ }
            })
            .catch(err => {
                console.error('No Recruit load error:', err);
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
                    name: cols[2] || "Unknown",
                    reason: cols[3] || ""
                });
            }
        }
        return result;
    }

    // ---- Search ----
    const doSearch = debounce(function (query) {
        resultsArea.innerHTML = '';
        if (!query) {
            resultsArea.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Enter player name or ID to check...</div></div>';
            return;
        }

        const matches = blockedPlayers.filter(p =>
            p.id.includes(query) || p.name.toLowerCase().includes(query)
        );

        if (matches.length > 0) {
            matches.forEach((player, i) => {
                const card = document.createElement('div');
                card.className = 'nr-card card-animate';
                card.style.animationDelay = `${i * 0.05}s`;
                const reasonHtml = player.reason
                    ? `<div class="nr-player-reason">${escapeHtml(player.reason)}</div>`
                    : '';
                card.innerHTML = `
                    <div class="nr-player-info">
                        <span class="nr-player-name">${escapeHtml(player.name)}</span>
                        <span class="nr-player-id">ID: ${escapeHtml(player.id)}</span>
                        ${reasonHtml}
                    </div>
                    <span class="nr-badge">NO RECRUIT</span>
                `;
                resultsArea.appendChild(card);
            });
        } else {
            resultsArea.innerHTML = '<div class="nr-clean">✅ No match found — Player is clear.</div>';
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

    // ---- Add Player ----
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('nrPlayerName').value.trim();
        const id = document.getElementById('nrPlayerId').value.trim();
        const reason = document.getElementById('nrPlayerReason').value.trim();

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
            formData.append('Player Name', name);
            formData.append('Player ID', id);
            formData.append('Reason', reason);

            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            successAlert.textContent = '✅ Request sent! Updating database...';
            successAlert.classList.add('show');
            form.reset();

            setTimeout(() => {
                loadData();
                closeModal();
                submitBtn.disabled = false;
                submitBtn.textContent = 'Add to List';
            }, 2500);
        } catch (err) {
            console.error('Add player error:', err);
            errorAlert.textContent = '❌ Network error. Check your connection.';
            errorAlert.classList.add('show');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add to List';
        }
    });

    // ---- Lazy Load: only fetch when tab is active ----
    function tryLoad() {
        if (loaded) return;
        // Check cache first
        try {
            const cached = JSON.parse(sessionStorage.getItem('nr_cache'));
            if (cached && (Date.now() - cached.ts) < 5 * 60 * 1000) {
                blockedPlayers = cached.data;
                loaded = true;
                statusBadge.className = 'status-badge status-badge--success';
                if (statusDot) statusDot.style.animation = 'none';
                statusText.textContent = `${blockedPlayers.length} Records (cached)`;
                searchInput.disabled = false;
                searchInput.placeholder = 'Type ID or Name to search...';
                return;
            }
        } catch (e) { /* ignore */ }
        loadData();
    }

    // Load if this tab is first, or on switch
    window.addEventListener('tabchange', (e) => {
        if (e.detail.tab === 'norecruit') tryLoad();
    });

    // Also load on DOMContentLoaded if hash is norecruit or empty
    document.addEventListener('DOMContentLoaded', () => {
        const hash = location.hash.replace('#', '');
        if (!hash || hash === 'norecruit') tryLoad();
    });

    // ---- Helpers ----
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
