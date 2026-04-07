/* ============================================
   APP.JS — Navigation Controller & Utilities
   ============================================ */

// ---- Debounce Utility ----
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ---- Navigation ----
const navTabs = document.querySelectorAll('.nav-tab');
const tabPages = document.querySelectorAll('.tab-page');

function switchTab(tabId) {
    // Update nav
    navTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Update pages
    tabPages.forEach(page => {
        page.classList.toggle('active', page.id === tabId + '-page');
    });

    // Update hash
    history.replaceState(null, '', '#' + tabId);

    // Fire custom event for lazy loading
    window.dispatchEvent(new CustomEvent('tabchange', { detail: { tab: tabId } }));
}

// Initialize nav clicks
navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// On load: read hash or default to norecruit
function initNav() {
    const hash = location.hash.replace('#', '');
    const validTabs = Array.from(navTabs).map(t => t.dataset.tab);
    const startTab = validTabs.includes(hash) ? hash : 'norecruit';
    switchTab(startTab);
}

// Listen for browser back/forward
window.addEventListener('hashchange', () => {
    const hash = location.hash.replace('#', '');
    const validTabs = Array.from(navTabs).map(t => t.dataset.tab);
    if (validTabs.includes(hash)) {
        switchTab(hash);
    }
});

document.addEventListener('DOMContentLoaded', initNav);
