/* Adds College Events (api/events) integration to the Teacher dashboard.
   Coexists with the existing /api/teacher-events code in teacher.js. */
(function () {
    'use strict';

    const fmtMoney = (n) => (window.UI?.fmtMoney || ((x) => '₹' + (x || 0))) (n);
    const fmtDate = (d) => (window.UI?.fmtDate || ((x) => new Date(x).toLocaleDateString())) (d);
    const escape = (s) => (window.UI?.escapeHtml || ((x) => String(x ?? '')))(s);
    const badge = (s) => (window.UI?.statusBadge || (() => ''))(s);

    function eventCard(ev) {
        return `
            <div class="data-card t-stack-sm">
                <div class="card-header">
                    <div>
                        <h4 class="card-title">${escape(ev.title)}</h4>
                        <p class="card-subtitle">
                            ${escape(ev.eventCategory)} · ${escape(ev.eventType.replace(/-/g, ' '))} ·
                            ${fmtDate(ev.eventDate)} · ${escape(ev.startTime)}–${escape(ev.endTime)}
                        </p>
                    </div>
                    <div>${badge(ev.status)}</div>
                </div>
                <p>${escape(ev.description || '')}</p>
                <div class="t-row t-text-muted" style="font-size:.85rem;gap:1.5rem;">
                    <span><i class="fas fa-location-dot"></i> ${escape(ev.venue || '—')}</span>
                    ${ev.expectedParticipants ? `<span><i class="fas fa-users"></i> ${ev.expectedParticipants}</span>` : ''}
                    ${ev.budget && ev.budget.totalRequested ? `<span><i class="fas fa-coins"></i> ${fmtMoney(ev.budget.totalApproved || ev.budget.totalRequested)}</span>` : ''}
                </div>
                ${ev.status === 'rejected' && ev.rejectionReason
                    ? `<div class="form-error">Rejected: ${escape(ev.rejectionReason)}</div>` : ''}
                <div class="card-actions">
                    ${ev.status === 'pending'
                        ? `<button class="btn btn-secondary btn-sm" data-coll-event-delete="${ev._id}"><i class="fas fa-trash"></i> Withdraw</button>`
                        : ''}
                    ${ev.status === 'approved' && ev.budget && ev.budget.totalApproved
                        ? `<button class="btn btn-secondary btn-sm" data-coll-event-utilize="${ev._id}" data-approved="${ev.budget.totalApproved}" data-utilized="${ev.budget.totalUtilized || 0}"><i class="fas fa-rupee-sign"></i> Log utilization</button>`
                        : ''}
                </div>
            </div>`;
    }

    async function loadList() {
        const list = document.getElementById('collegeEventsList');
        if (!list) return;
        try {
            const res = await api.getEvents();
            const events = (res.data || []);
            if (!events.length) {
                list.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-calendar"></i></div><div class="empty-title">No college events yet</div><div>Click <strong>Create College Event</strong> to submit one for HOD approval.</div></div>`;
                return;
            }
            list.innerHTML = events.map(eventCard).join('');
        } catch (e) {
            list.innerHTML = `<p class="form-error">Failed to load events: ${escape(e.message)}</p>`;
        }
    }

    function openModal() {
        const m = document.getElementById('collegeEventModal');
        if (!m) return;
        document.getElementById('collegeEventForm')?.reset();
        UI.openModal(m);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const f = e.target;
        const data = Object.fromEntries(new FormData(f).entries());
        const payload = {
            title: data.title,
            description: data.description,
            eventType: data.eventType,
            eventCategory: data.eventCategory,
            venue: data.venue,
            eventDate: data.eventDate,
            startTime: data.startTime,
            endTime: data.endTime,
            expectedParticipants: data.expectedParticipants ? Number(data.expectedParticipants) : undefined
        };
        if (data.totalRequested && Number(data.totalRequested) > 0) {
            payload.budget = { totalRequested: Number(data.totalRequested), categories: [] };
        }
        try {
            await api.createEvent(payload);
            UI.toast('Event submitted for HOD approval', 'success');
            UI.closeModal('collegeEventModal');
            loadList();
        } catch (err) {
            const msg = err.errors ? err.errors.map(x => x.msg).join('; ') : err.message;
            UI.toast('Failed to create event: ' + msg, 'error');
        }
    }

    async function handleListClick(e) {
        const del = e.target.closest('[data-coll-event-delete]');
        if (del) {
            const ok = await UI.confirm({ title: 'Withdraw event?', message: 'This will delete the pending event request.', confirmText: 'Withdraw', danger: true });
            if (!ok) return;
            try {
                await api.deleteEvent(del.dataset.collEventDelete);
                UI.toast('Event withdrawn', 'success');
                loadList();
            } catch (err) {
                UI.toast('Failed to withdraw: ' + err.message, 'error');
            }
            return;
        }
        const utilize = e.target.closest('[data-coll-event-utilize]');
        if (utilize) {
            const approved = Number(utilize.dataset.approved || 0);
            const utilized = Number(utilize.dataset.utilized || 0);
            const remaining = Math.max(0, approved - utilized);
            const res = await UI.prompt({
                title: 'Log budget utilization',
                description: `Approved: ${UI.fmtMoney(approved)} · Already logged: ${UI.fmtMoney(utilized)} · Remaining: ${UI.fmtMoney(remaining)}.`,
                submitText: 'Log',
                fields: [
                    { name: 'amount', label: 'Amount utilized (₹)', type: 'number', min: 1, max: remaining || undefined, required: true }
                ]
            });
            if (!res) return;
            try {
                await api.utilizeEventBudget(utilize.dataset.collEventUtilize, Number(res.amount));
                UI.toast('Utilization recorded', 'success');
                loadList();
            } catch (err) {
                UI.toast('Failed: ' + err.message, 'error');
            }
            return;
        }
    }

    function handleTabClick(e) {
        const btn = e.target.closest('[data-events-tab]');
        if (!btn) return;
        const name = btn.dataset.eventsTab;
        document.querySelectorAll('#events .tab-bar .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('#events .tab-content').forEach(c => c.classList.remove('active'));
        const tab = document.getElementById(name + 'EventsTab');
        if (tab) tab.classList.add('active');
    }

    function init() {
        const trigger = document.getElementById('createCollegeEventBtn');
        const form = document.getElementById('collegeEventForm');
        const list = document.getElementById('collegeEventsList');
        const tabBar = document.querySelector('#events .tab-bar');

        if (trigger) trigger.addEventListener('click', openModal);
        if (form) form.addEventListener('submit', handleSubmit);
        if (list) list.addEventListener('click', handleListClick);
        if (tabBar) tabBar.addEventListener('click', handleTabClick);

        // Re-load when navigating into Events
        document.querySelectorAll('a[data-section="events"], .nav-link[data-section="events"]').forEach(a => {
            a.addEventListener('click', () => setTimeout(loadList, 50));
        });
        // initial fetch if section visible
        if (document.getElementById('events')?.classList.contains('active')) {
            loadList();
        } else {
            // fallback: prefetch in 1s
            setTimeout(loadList, 800);
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
