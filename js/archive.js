/* ============================================
   ARCHIVE — Alliance Intel Viewer
   ============================================ */
(() => {
    let archiveData = null;
    let loaded = false;

    const allianceListEl = document.getElementById('archiveAllianceGrid');
    const tableWrap = document.getElementById('archiveTableWrap');
    const tableBody = document.getElementById('archiveTableBody');
    const navControls = document.getElementById('archiveNav');
    const viewTitle = document.getElementById('archiveViewTitle');
    const searchInput = document.getElementById('archiveSearchInput');
    const noResultsMsg = document.getElementById('archiveNoResults');
    const toastEl = document.getElementById('archiveToast');

    const RANK_MAP = { 'R5': 5, 'R4': 4, 'R3': 3, 'R2': 2, 'R1': 1 };
    const getRankValue = (r) => RANK_MAP[r?.toUpperCase()] || 0;

    // ---- Load ----
    async function loadArchive() {
        if (loaded) return;
        try {
            const res = await fetch('data/archive.json');
            archiveData = await res.json();
            loaded = true;

            // Update the last-update text
            const updateEl = document.getElementById('archiveLastUpdate');
            if (updateEl && archiveData.lastUpdate) {
                updateEl.textContent = 'LAST UPDATE: ' + archiveData.lastUpdate;
            }

            renderAllianceCards();
        } catch (err) {
            console.error('Failed to load archive:', err);
            if (allianceListEl) {
                allianceListEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load archive data.</div></div>';
            }
        }
    }

    // ---- Alliance Cards ----
    function renderAllianceCards() {
        if (!allianceListEl || !archiveData) return;
        allianceListEl.innerHTML = '';

        Object.keys(archiveData.alliances).forEach((key, i) => {
            const players = archiveData.alliances[key];
            const active = players.filter(p => !p.former).length;
            const former = players.filter(p => p.former).length;

            const card = document.createElement('div');
            card.className = 'alliance-card card-animate';
            card.style.animationDelay = `${i * 0.08}s`;
            card.addEventListener('click', () => showAlliancePlayers(key));

            card.innerHTML = `
                <div class="alliance-tag">${key}</div>
                <div class="alliance-member-count">${active} Players</div>
                ${former > 0 ? `<div class="alliance-former-count">${former} Former</div>` : ''}
            `;
            allianceListEl.appendChild(card);
        });
    }

    // ---- Show Alliance Players ----
    function showAlliancePlayers(name) {
        const players = [...archiveData.alliances[name]];
        players.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
        renderTable(players, name);

        allianceListEl.style.display = 'none';
        tableWrap.classList.add('visible');
        navControls.classList.add('visible');
        viewTitle.textContent = `// ${name} ROSTER`;
    }

    // ---- Search ----
    function handleSearch(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            resetView();
            return;
        }

        let all = [];
        Object.keys(archiveData.alliances).forEach(alliance => {
            archiveData.alliances[alliance].forEach(p => {
                all.push({ ...p, allianceName: alliance });
            });
        });

        const results = all.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.id.includes(q) ||
            p.allianceName.toLowerCase().includes(q)
        );

        results.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
        renderTable(results, null);

        allianceListEl.style.display = 'none';
        tableWrap.classList.add('visible');
        navControls.classList.add('visible');
        viewTitle.textContent = '// SEARCH RESULTS';
    }

    // ---- Render Table ----
    function renderTable(players, fixedAlliance) {
        tableBody.innerHTML = '';
        if (players.length === 0) {
            noResultsMsg?.classList.add('visible');
        } else {
            noResultsMsg?.classList.remove('visible');
            players.forEach(p => {
                const row = document.createElement('tr');
                if (p.former) row.classList.add('is-former');
                const alliance = fixedAlliance || p.allianceName;
                row.innerHTML = `
                    <td><span class="rank-badge rank-${p.rank}">${p.rank}</span></td>
                    <td>${alliance}</td>
                    <td>${escapeHtml(p.name)}${p.former ? ' <span class="former-tag">(FORMER)</span>' : ''}</td>
                    <td><span class="clickable-id" data-id="${escapeHtml(p.id)}">${escapeHtml(p.id)}</span></td>
                `;
                tableBody.appendChild(row);
            });

            // Attach click-to-copy on IDs
            tableBody.querySelectorAll('.clickable-id').forEach(el => {
                el.addEventListener('click', () => copyId(el.dataset.id));
            });
        }
    }

    // ---- Reset View ----
    function resetView() {
        allianceListEl.style.display = '';
        tableWrap.classList.remove('visible');
        navControls.classList.remove('visible');
        searchInput.value = '';
        renderAllianceCards();
    }

    // Expose for back button
    window.resetArchiveView = resetView;

    // ---- Copy ID ----
    function copyId(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('ID Copied!');
        });
    }

    function showToast(msg) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 2000);
    }

    // ---- Search with debounce ----
    const doSearch = debounce((q) => {
        if (loaded) handleSearch(q);
    }, 250);
    searchInput?.addEventListener('input', (e) => doSearch(e.target.value));

    // ---- Lazy Load ----
    window.addEventListener('tabchange', (e) => {
        if (e.detail.tab === 'archive') loadArchive();
    });

    document.addEventListener('DOMContentLoaded', () => {
        const hash = location.hash.replace('#', '');
        if (hash === 'archive') loadArchive();
    });

    // ---- Helpers ----
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
