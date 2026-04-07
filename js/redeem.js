/* ============================================
   REDEEM — Gift Code Trigger via Cloudflare Worker
   ============================================ */
(() => {
    const WORKER_URL = 'https://autokgc-trigger.twikilab.workers.dev';

    const fab = document.getElementById('redeemFab');
    const toast = document.getElementById('redeemToast');
    let toastTimer;

    function showToast(message, type) {
        if (!toast) return;
        toast.textContent = message;
        toast.className = `redeem-toast show ${type}`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
    }

    fab?.addEventListener('click', async () => {
        if (fab.disabled) return;

        fab.disabled = true;
        const original = fab.innerHTML;
        fab.innerHTML = '⏳';
        fab.style.animation = 'none';

        try {
            const resp = await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await resp.json().catch(() => null);

            if (resp.ok && data?.success) {
                showToast('✅ Gift code redemption triggered!', 'success');
                // Save last trigger time
                try { localStorage.setItem('lastRedeem', Date.now()); } catch (e) {}
            } else {
                showToast(`❌ Failed: ${data?.error || resp.statusText}`, 'error');
            }
        } catch {
            showToast('❌ Network error. Is the worker running?', 'error');
        }

        fab.disabled = false;
        fab.innerHTML = original;
        fab.style.animation = 'fabPulse 3s ease-in-out infinite';
    });
})();
