/* Department Management — shared UI helpers.
   Loaded BEFORE any role-specific JS in every view.
   Exposes a global `UI` object. */
(function () {
    'use strict';

    function ensureToastStack() {
        let stack = document.getElementById('toastStack');
        if (!stack) {
            stack = document.createElement('div');
            stack.id = 'toastStack';
            stack.className = 'toast-stack';
            stack.setAttribute('role', 'status');
            stack.setAttribute('aria-live', 'polite');
            document.body.appendChild(stack);
        }
        return stack;
    }

    const ICONS = { success: '✓', error: '!', danger: '!', warning: '!', info: 'i' };

    function toast(message, type = 'info', { duration = 3500 } = {}) {
        if (!message) return;
        const stack = ensureToastStack();
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.innerHTML =
            `<span class="toast-icon">${ICONS[type] || 'i'}</span>` +
            `<span class="toast-message"></span>`;
        el.querySelector('.toast-message').textContent = message;
        stack.appendChild(el);
        const remove = () => {
            el.classList.add('toast-out');
            el.addEventListener('animationend', () => el.remove(), { once: true });
        };
        setTimeout(remove, duration);
        el.addEventListener('click', remove);
        return el;
    }

    /* ---------------- modal helpers ---------------- */
    let openStack = [];

    function openModal(target) {
        const el = typeof target === 'string'
            ? document.getElementById(target.replace(/^#/, ''))
            : target;
        if (!el) return null;
        el.classList.add('show');
        document.body.style.overflow = 'hidden';
        openStack.push(el);
        bindGlobalEscape();
        const focusable = el.querySelector('input, textarea, select, button:not(.modal-close):not(.close)');
        if (focusable) setTimeout(() => focusable.focus(), 50);
        // overlay click closes
        const onOverlayClick = (e) => { if (e.target === el) closeModal(el); };
        el.addEventListener('click', onOverlayClick, { once: false });
        el._uiOverlayHandler = onOverlayClick;
        // close buttons inside
        el.querySelectorAll('[data-modal-close], .modal-close, .close').forEach(btn => {
            if (btn._uiClose) return;
            btn._uiClose = true;
            btn.addEventListener('click', (ev) => { ev.preventDefault(); closeModal(el); });
        });
        return el;
    }

    function closeModal(target) {
        const el = typeof target === 'string'
            ? document.getElementById(target.replace(/^#/, ''))
            : target;
        if (!el) return;
        el.classList.remove('show');
        openStack = openStack.filter(m => m !== el);
        if (!openStack.length) document.body.style.overflow = '';
        if (el._uiOverlayHandler) {
            el.removeEventListener('click', el._uiOverlayHandler);
            delete el._uiOverlayHandler;
        }
    }

    let escapeBound = false;
    function bindGlobalEscape() {
        if (escapeBound) return;
        escapeBound = true;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && openStack.length) {
                closeModal(openStack[openStack.length - 1]);
            }
        });
    }

    /* ---------------- confirm dialog ---------------- */
    function confirm({ title = 'Are you sure?', message = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
        return new Promise((resolve) => {
            const id = '__uiConfirm' + Date.now();
            const overlay = document.createElement('div');
            overlay.className = 'modal show';
            overlay.id = id;
            overlay.innerHTML = `
                <div class="modal-content" style="max-width:420px;">
                    <div class="modal-header">
                        <h3 class="modal-title"></h3>
                        <button class="modal-close" aria-label="Close">&times;</button>
                    </div>
                    <div class="modal-body"><p class="t-mb-0"></p></div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-act="cancel"></button>
                        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok"></button>
                    </div>
                </div>
            `;
            overlay.querySelector('.modal-title').textContent = title;
            overlay.querySelector('.modal-body p').textContent = message;
            overlay.querySelector('[data-act="cancel"]').textContent = cancelText;
            overlay.querySelector('[data-act="ok"]').textContent = confirmText;
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
            openStack.push(overlay);
            bindGlobalEscape();

            const finish = (val) => {
                overlay.remove();
                openStack = openStack.filter(m => m !== overlay);
                if (!openStack.length) document.body.style.overflow = '';
                resolve(val);
            };
            overlay.querySelector('[data-act="ok"]').addEventListener('click', () => finish(true));
            overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => finish(false));
            overlay.querySelector('.modal-close').addEventListener('click', () => finish(false));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });
            setTimeout(() => overlay.querySelector('[data-act="ok"]').focus(), 50);
        });
    }

    /* ---------------- prompt dialog ---------------- */
    function prompt({ title = 'Input', description = '', fields = [], submitText = 'Save', cancelText = 'Cancel' } = {}) {
        return new Promise((resolve) => {
            const id = '__uiPrompt' + Date.now();
            const overlay = document.createElement('div');
            overlay.className = 'modal show';
            overlay.id = id;
            const fieldsHTML = fields.map((f, i) => {
                const inputId = `${id}_f${i}`;
                const required = f.required ? 'required' : '';
                const value = f.value != null ? String(f.value).replace(/"/g, '&quot;') : '';
                if (f.type === 'textarea') {
                    return `
                        <div class="form-group">
                            <label class="form-label" for="${inputId}">${f.label}${f.required ? ' <span class="required">*</span>' : ''}</label>
                            <textarea id="${inputId}" name="${f.name}" ${required} placeholder="${f.placeholder || ''}">${value}</textarea>
                            ${f.hint ? `<small class="form-hint">${f.hint}</small>` : ''}
                        </div>`;
                }
                if (f.type === 'select' && Array.isArray(f.options)) {
                    const opts = f.options.map(o => {
                        const sel = String(o.value) === String(f.value) ? 'selected' : '';
                        return `<option value="${o.value}" ${sel}>${o.label}</option>`;
                    }).join('');
                    return `
                        <div class="form-group">
                            <label class="form-label" for="${inputId}">${f.label}${f.required ? ' <span class="required">*</span>' : ''}</label>
                            <select id="${inputId}" name="${f.name}" ${required}>${opts}</select>
                            ${f.hint ? `<small class="form-hint">${f.hint}</small>` : ''}
                        </div>`;
                }
                return `
                    <div class="form-group">
                        <label class="form-label" for="${inputId}">${f.label}${f.required ? ' <span class="required">*</span>' : ''}</label>
                        <input id="${inputId}" name="${f.name}" type="${f.type || 'text'}" value="${value}" ${required} placeholder="${f.placeholder || ''}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.step != null ? `step="${f.step}"` : ''} ${f.minlength != null ? `minlength="${f.minlength}"` : ''} />
                        ${f.hint ? `<small class="form-hint">${f.hint}</small>` : ''}
                    </div>`;
            }).join('');

            overlay.innerHTML = `
                <div class="modal-content modal-md">
                    <div class="modal-header">
                        <h3 class="modal-title"></h3>
                        <button class="modal-close" aria-label="Close">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${description ? `<p class="t-text-muted">${description}</p>` : ''}
                        <form id="${id}_form">${fieldsHTML}</form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-act="cancel"></button>
                        <button type="submit" form="${id}_form" class="btn btn-primary" data-act="ok"></button>
                    </div>
                </div>
            `;
            overlay.querySelector('.modal-title').textContent = title;
            overlay.querySelector('[data-act="cancel"]').textContent = cancelText;
            overlay.querySelector('[data-act="ok"]').textContent = submitText;
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
            openStack.push(overlay);
            bindGlobalEscape();

            const finish = (val) => {
                overlay.remove();
                openStack = openStack.filter(m => m !== overlay);
                if (!openStack.length) document.body.style.overflow = '';
                resolve(val);
            };
            const form = overlay.querySelector('form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = {};
                fields.forEach((f, i) => {
                    const inputId = `${id}_f${i}`;
                    const el = document.getElementById(inputId);
                    if (!el) return;
                    let v = el.value;
                    if (f.type === 'number') v = v === '' ? null : Number(v);
                    data[f.name] = v;
                });
                finish(data);
            });
            overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => finish(null));
            overlay.querySelector('.modal-close').addEventListener('click', () => finish(null));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(null); });
            const first = overlay.querySelector('input, textarea, select');
            if (first) setTimeout(() => first.focus(), 50);
        });
    }

    /* ---------------- sidebar toggle (mobile) ---------------- */
    function findSidebar() {
        return document.querySelector('.app-sidebar, .sidebar, nav.sidebar, nav.admin-nav, nav.superadmin-nav');
    }

    function toggleSidebar(force) {
        const sb = findSidebar();
        if (!sb) return;
        const open = force != null ? force : !sb.classList.contains('open');
        sb.classList.toggle('open', open);
        document.body.classList.toggle('sidebar-open', open);
        let bd = document.getElementById('__sbBackdrop');
        if (open) {
            if (!bd) {
                bd = document.createElement('div');
                bd.id = '__sbBackdrop';
                bd.className = 'sidebar-backdrop';
                bd.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.4);z-index:998;';
                bd.addEventListener('click', () => toggleSidebar(false));
                document.body.appendChild(bd);
            }
            bd.style.display = 'block';
        } else if (bd) {
            bd.style.display = 'none';
        }
    }

    function injectHamburger() {
        // Don't inject on the auth/landing page (no sidebar there).
        if (!findSidebar()) return;
        if (document.getElementById('__sbToggle')) return;
        const btn = document.createElement('button');
        btn.id = '__sbToggle';
        btn.setAttribute('aria-label', 'Toggle navigation');
        btn.innerHTML = '<i class="fas fa-bars"></i>';
        btn.style.cssText = [
            'position:fixed', 'top:12px', 'left:12px', 'z-index:1000',
            'width:40px', 'height:40px', 'border-radius:8px',
            'background:#667eea', 'color:#fff', 'border:none',
            'box-shadow:0 4px 12px rgba(15,23,42,0.2)',
            'font-size:1.1rem', 'cursor:pointer', 'display:none'
        ].join(';');
        btn.addEventListener('click', () => toggleSidebar());
        document.body.appendChild(btn);

        const apply = () => {
            const small = window.matchMedia('(max-width: 1023.98px)').matches;
            btn.style.display = small ? 'inline-flex' : 'none';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            if (!small) toggleSidebar(false);
        };
        apply();
        window.addEventListener('resize', apply);
    }

    function bindSidebarToggle() {
        document.addEventListener('click', (e) => {
            const t = e.target.closest('[data-sidebar-toggle]');
            if (t) { e.preventDefault(); toggleSidebar(); return; }
            // close when an in-sidebar nav link is clicked on mobile
            const link = e.target.closest('.app-sidebar a, .sidebar a, .nav-link');
            if (link && window.matchMedia('(max-width: 1023.98px)').matches) {
                toggleSidebar(false);
            }
        });
    }

    function fmtDate(d, opts = { dateStyle: 'medium' }) {
        if (!d) return '';
        const date = (d instanceof Date) ? d : new Date(d);
        if (Number.isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat(undefined, opts).format(date);
    }

    function fmtMoney(n) {
        if (n == null || n === '') return '₹0';
        const num = Number(n);
        if (Number.isNaN(num)) return '₹0';
        return '₹' + num.toLocaleString('en-IN');
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function statusBadge(status) {
        const s = (status || '').toLowerCase();
        const cls =
            s === 'approved'  ? 'badge-success' :
            s === 'rejected'  ? 'badge-danger' :
            s === 'completed' ? 'badge-info' :
            s === 'cancelled' ? 'badge-neutral' :
            s === 'draft'     ? 'badge-neutral' :
            s === 'published' ? 'badge-success' :
            'badge-warning';
        const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
        return `<span class="badge ${cls}">${label}</span>`;
    }

    document.addEventListener('DOMContentLoaded', () => {
        bindSidebarToggle();
        injectHamburger();
        ensureToastStack();
        // shim legacy global helpers so older inline calls still work:
        if (!window.showNotification) {
            window.showNotification = (msg, type = 'info') => toast(msg, type === 'success' ? 'success' : type === 'error' ? 'error' : type);
        }
    });

    window.UI = {
        toast,
        openModal,
        closeModal,
        confirm,
        prompt,
        fmtDate,
        fmtMoney,
        escapeHtml,
        statusBadge,
    };
})();
