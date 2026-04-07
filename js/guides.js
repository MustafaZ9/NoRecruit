/* ============================================
   GUIDES — Load, Filter, Search, Copy
   ============================================ */
(() => {
    let guidesData = [];
    let activeCategory = 'All';
    let loaded = false;

    const container = document.getElementById('guidesGrid');
    const searchInput = document.getElementById('guidesSearchInput');
    const filtersContainer = document.getElementById('guidesFilters');

    // ---- Load ----
    async function loadGuides() {
        if (loaded) return;
        try {
            const res = await fetch('data/guides.json');
            guidesData = await res.json();
            loaded = true;
            renderFilters();
            renderCards();
        } catch (err) {
            console.error('Failed to load guides:', err);
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load guides.</div></div>';
        }
    }

    // ---- Category Filters ----
    function renderFilters() {
        const categories = ['All', ...new Set(guidesData.map(g => g.category))];
        filtersContainer.innerHTML = '';
        categories.forEach(cat => {
            const chip = document.createElement('button');
            chip.className = 'filter-chip' + (cat === activeCategory ? ' active' : '');
            chip.textContent = cat;
            chip.addEventListener('click', () => {
                activeCategory = cat;
                renderFilters();
                renderCards();
            });
            filtersContainer.appendChild(chip);
        });
    }

    // ---- Render Cards ----
    function renderCards() {
        if (!container) return;
        const query = (searchInput?.value || '').toLowerCase().trim();
        container.innerHTML = '';

        const filtered = guidesData.filter(g => {
            const matchCat = activeCategory === 'All' || g.category === activeCategory;
            const matchSearch = !query ||
                g.title.toLowerCase().includes(query) ||
                g.content.toLowerCase().includes(query);
            return matchCat && matchSearch;
        });

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📭</div><div class="empty-text">No guides found matching your search.</div></div>';
            return;
        }

        filtered.forEach((guide, i) => {
            const card = document.createElement('div');
            card.className = 'guide-card card-animate';
            card.style.animationDelay = `${i * 0.04}s`;

            const contentHtml = linkifyUrls(escapeHtml(guide.content));
            const isLong = guide.content.length > 200;

            card.innerHTML = `
                <div class="guide-category-tag">${escapeHtml(guide.category)}</div>
                <div class="guide-card-header">
                    <h3 class="guide-card-title">${escapeHtml(guide.title)}</h3>
                    <button class="guide-copy-btn" title="Copy" data-idx="${i}">📋</button>
                </div>
                <div class="guide-card-content ${isLong ? 'collapsed' : ''}">${contentHtml}</div>
                ${isLong ? '<button class="guide-expand-btn">Show more ▾</button>' : ''}
            `;

            // Copy
            card.querySelector('.guide-copy-btn').addEventListener('click', function () {
                const text = guide.title + '\n\n' + guide.content;
                navigator.clipboard.writeText(text).then(() => {
                    this.textContent = '✓';
                    this.classList.add('copied');
                    setTimeout(() => {
                        this.textContent = '📋';
                        this.classList.remove('copied');
                    }, 1500);
                });
            });

            // Expand
            const expandBtn = card.querySelector('.guide-expand-btn');
            if (expandBtn) {
                expandBtn.addEventListener('click', function () {
                    const content = card.querySelector('.guide-card-content');
                    const collapsed = content.classList.toggle('collapsed');
                    this.textContent = collapsed ? 'Show more ▾' : 'Show less ▴';
                });
            }

            container.appendChild(card);
        });
    }

    // ---- Search ----
    const doSearch = debounce(() => renderCards(), 250);
    searchInput?.addEventListener('input', doSearch);

    // ---- Lazy Load ----
    window.addEventListener('tabchange', (e) => {
        if (e.detail.tab === 'guides') loadGuides();
    });

    document.addEventListener('DOMContentLoaded', () => {
        const hash = location.hash.replace('#', '');
        if (hash === 'guides') loadGuides();
    });

    // ---- Helpers ----
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function linkifyUrls(text) {
        return text.replace(/(https?:\/\/[^\s<]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    }
})();
