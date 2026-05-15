(async function () {
    const grid = document.getElementById('archGrid');
    const sel  = document.getElementById('archDept');

    try {
        const r = await fetch('/newsletter/api/departments/public').then(x => x.json());
        (r.data || []).forEach(d => {
            const opt = document.createElement('option');
            opt.value = d._id;
            opt.textContent = d.name;
            sel.appendChild(opt);
        });
    } catch (e) {
        grid.innerHTML = `<p class="arch-empty">Could not load departments.</p>`;
        return;
    }

    const params = new URLSearchParams(location.search);
    const initial = params.get('deptId');
    if (initial) {
        sel.value = initial;
        render(initial);
    }

    sel.addEventListener('change', () => {
        const v = sel.value;
        const rss = document.getElementById('archRssLink');
        if (!v) {
            grid.innerHTML = `<p class="arch-empty">Choose a department to see its archive.</p>`;
            history.replaceState({}, '', '/newsletter/archive');
            rss.style.display = 'none';
            return;
        }
        history.replaceState({}, '', `/newsletter/archive?deptId=${v}`);
        rss.href = `/newsletter/rss/${v}`;
        rss.style.display = 'inline-flex';
        render(v);
    });

    if (initial) {
        const rss = document.getElementById('archRssLink');
        rss.href = `/newsletter/rss/${initial}`;
        rss.style.display = 'inline-flex';
    }

    async function render(deptId) {
        grid.innerHTML = `<p class="arch-empty">Loading…</p>`;
        try {
            const r = await fetch(`/api/newsletters/published?deptId=${encodeURIComponent(deptId)}`).then(x => x.json());
            const items = r.data || [];
            if (!items.length) {
                grid.innerHTML = `<p class="arch-empty">No published newsletters yet for this department.</p>`;
                return;
            }
            const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            grid.innerHTML = items.map(n => {
                const author = n.publishedBy?.name || '';
                const pub    = n.publishedAt ? new Date(n.publishedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';
                const monthLabel = `${months[n.month] || ''} ${n.year || ''}`.trim();
                const cover  = n.coverImage
                    ? `<div class="cover"><img src="${UI.escapeHtml(n.coverImage)}" alt="${UI.escapeHtml(n.title)}"></div>`
                    : `<div class="cover">${UI.escapeHtml(monthLabel)}</div>`;
                const summary = n.summary ? `<p class="summary">${UI.escapeHtml(n.summary)}</p>` : '';
                return `
                    <article class="arch-card">
                        ${cover}
                        <div class="body">
                            <h3>${UI.escapeHtml(n.title)}</h3>
                            <div class="meta">${UI.escapeHtml(monthLabel)}${author ? ' · By ' + UI.escapeHtml(author) : ''}${pub ? ' · ' + UI.escapeHtml(pub) : ''}</div>
                            ${summary}
                            <a class="read-btn" href="/newsletter?dept=${n.department._id}&month=${n.month}&year=${n.year}">Read <i class="fas fa-arrow-right"></i></a>
                        </div>
                    </article>
                `;
            }).join('');
        } catch (e) {
            grid.innerHTML = `<p class="arch-empty">Could not load newsletters.</p>`;
        }
    }
})();
