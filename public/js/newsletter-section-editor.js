/* Newsletter section builder + minimal rich-text editor.
 *
 *   const editor = NewsletterSectionEditor.mount(container, initialSections);
 *   editor.getSections()  // → [{ heading, body, order }, ...]
 *
 * Designed to be used inside any modal. Stateless besides its DOM.
 * Body field is a contenteditable div with a B / I / U / • / 1. / link toolbar.
 * No external dependency.
 */
(function () {
    function el(tag, props = {}, children = []) {
        const node = document.createElement(tag);
        for (const [k, v] of Object.entries(props)) {
            if (k === 'class')      node.className = v;
            else if (k === 'style') node.setAttribute('style', v);
            else if (k === 'html')  node.innerHTML = v;
            else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
            else                    node.setAttribute(k, v);
        }
        (Array.isArray(children) ? children : [children])
            .filter(Boolean)
            .forEach(c => node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
        return node;
    }

    function exec(cmd, arg) {
        document.execCommand(cmd, false, arg);
    }

    function makeToolbarButton(label, title, action) {
        return el('button', {
            type: 'button',
            class: 'nl-tb-btn',
            title,
            onmousedown: (e) => { e.preventDefault(); }, // keep focus in editor
            onclick: action
        }, [label]);
    }

    function buildEditor(initialHtml) {
        const editor = el('div', {
            class: 'nl-rt-editor',
            contenteditable: 'true',
            spellcheck: 'true',
            html: initialHtml || ''
        });

        const tb = el('div', { class: 'nl-rt-toolbar' }, [
            makeToolbarButton('B', 'Bold (Ctrl+B)',     () => exec('bold')),
            makeToolbarButton('I', 'Italic (Ctrl+I)',   () => exec('italic')),
            makeToolbarButton('U', 'Underline (Ctrl+U)', () => exec('underline')),
            makeToolbarButton('•', 'Bullet list',       () => exec('insertUnorderedList')),
            makeToolbarButton('1.', 'Numbered list',    () => exec('insertOrderedList')),
            makeToolbarButton('🔗', 'Insert link',      () => {
                const url = window.prompt('Link URL?');
                if (url) exec('createLink', url);
            }),
            makeToolbarButton('—', 'Clear formatting',  () => exec('removeFormat')),
        ]);

        const wrap = el('div', { class: 'nl-rt-wrap' }, [tb, editor]);
        return { wrap, editor };
    }

    function buildSectionRow(initial = {}, callbacks) {
        const headingInput = el('input', {
            type: 'text',
            class: 'form-control nl-section-heading',
            placeholder: 'Section heading',
            value: initial.heading || ''
        });

        const { wrap: bodyWrap, editor: bodyEditor } = buildEditor(initial.body);

        const upBtn   = el('button', { type: 'button', class: 'btn btn-ghost btn-sm', title: 'Move up' },   ['↑']);
        const downBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-sm', title: 'Move down' }, ['↓']);
        const rmBtn   = el('button', { type: 'button', class: 'btn btn-danger btn-sm', title: 'Remove' },   ['✕']);

        const row = el('div', { class: 'nl-section-row' }, [
            el('div', { class: 'nl-section-controls' }, [upBtn, downBtn, rmBtn]),
            el('div', { class: 'nl-section-body' }, [
                el('label', { class: 'form-label' }, ['Section heading']),
                headingInput,
                el('label', { class: 'form-label', style: 'margin-top:.5rem' }, ['Body']),
                bodyWrap
            ])
        ]);

        upBtn.addEventListener('click',   () => callbacks.move(row, -1));
        downBtn.addEventListener('click', () => callbacks.move(row,  1));
        rmBtn.addEventListener('click',   () => callbacks.remove(row));

        row._nl_get = () => ({
            heading: headingInput.value.trim(),
            body: bodyEditor.innerHTML.trim()
        });

        return row;
    }

    const NewsletterSectionEditor = {
        mount(container, initialSections = []) {
            container.innerHTML = '';
            container.classList.add('nl-section-editor');

            const list = el('div', { class: 'nl-section-list' });
            const addBtn = el('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, [
                el('i', { class: 'fas fa-plus' }), ' Add Section'
            ]);

            const moveRow = (row, delta) => {
                const rows = Array.from(list.children);
                const idx = rows.indexOf(row);
                const newIdx = idx + delta;
                if (newIdx < 0 || newIdx >= rows.length) return;
                if (delta < 0) list.insertBefore(row, rows[newIdx]);
                else           list.insertBefore(rows[newIdx], row);
            };
            const removeRow = (row) => row.remove();
            const callbacks = { move: moveRow, remove: removeRow };

            const addSection = (init = {}) => {
                list.appendChild(buildSectionRow(init, callbacks));
            };

            addBtn.addEventListener('click', () => addSection({ heading: '', body: '' }));

            // Seed with provided sections (sorted by their existing order).
            (initialSections || [])
                .slice()
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .forEach(s => addSection(s));

            container.appendChild(list);
            container.appendChild(addBtn);

            return {
                getSections() {
                    return Array.from(list.children)
                        .map((row, i) => {
                            const { heading, body } = row._nl_get();
                            return { heading, body, order: i };
                        })
                        .filter(s => s.heading || s.body);
                },
                addSection,
                clear() { list.innerHTML = ''; },
                replaceAll(sections) {
                    list.innerHTML = '';
                    (sections || []).forEach(s => addSection(s));
                }
            };
        }
    };

    window.NewsletterSectionEditor = NewsletterSectionEditor;
})();
