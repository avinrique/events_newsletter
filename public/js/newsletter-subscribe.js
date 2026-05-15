// Subscribe form (uses public endpoints — no auth).
(async function () {
    const sel = document.getElementById('subDept');
    const main = document.getElementById('department');
    const sync = () => {
        if (main && main.options.length) {
            sel.innerHTML = main.innerHTML;
        }
    };
    const t = setInterval(() => { sync(); if (main?.options?.length > 1) clearInterval(t); }, 200);

    document.getElementById('subscribeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('subscribeMessage');
        const payload = {
            email: document.getElementById('subEmail').value.trim(),
            department: document.getElementById('subDept').value,
            name: document.getElementById('subName').value.trim()
        };
        if (!payload.email || !payload.department) {
            msg.textContent = 'Pick a department and enter your email.';
            return;
        }
        msg.textContent = 'Subscribing…';
        try {
            const r = await fetch('/api/newsletters/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(x => x.json());
            msg.textContent = r.message || (r.success ? 'Subscribed!' : 'Failed.');
            if (r.success) e.target.reset();
        } catch (err) {
            msg.textContent = 'Could not subscribe: ' + err.message;
        }
    });
})();
