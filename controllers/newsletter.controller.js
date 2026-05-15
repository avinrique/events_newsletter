const Newsletter = require('../models/Newsletter');
const TeacherEvent = require('../models/TeacherEvent');
const Event = require('../models/Event');
const Department = require('../models/Department');
const Project = require('../models/Project');
const Club = require('../models/Club');
const Certificate = require('../models/Certificate');
const Internship = require('../models/Internship');
const User = require('../models/User');
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const { sendMail } = require('../utils/mailer');

function isHOD(user) {
    return user.role === 'hod' || (user.role === 'teacher' && user.position === 'HOD');
}
function isAdmin(user) {
    return user.role === 'admin' || user.role === 'superadmin';
}

function populated(query) {
    return query
        .populate('department', 'name code')
        .populate('createdBy', 'name email')
        .populate('publishedBy', 'name email')
        .populate({ path: 'teacherEventIds', select: 'title eventDate documentContent images', populate: [
            { path: 'createdBy', select: 'name' }
        ]})
        .populate({ path: 'eventIds', select: 'title eventDate eventCategory venue status' });
}

// POST /api/newsletters
exports.createNewsletter = async (req, res) => {
    try {
        const { title, month, year, department, summary, sections = [], coverImage, teacherEventIds, eventIds, scheduledFor } = req.body;

        let deptId = department;
        if (isHOD(req.user)) deptId = req.user.department;
        if (!deptId) return res.status(400).json({ success: false, message: 'Department is required' });

        if (month == null || year == null) {
            return res.status(400).json({ success: false, message: 'Month and year are required' });
        }

        const doc = await Newsletter.create({
            title: (title || '').trim() || `Department Newsletter — ${new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
            month: Number(month),
            year: Number(year),
            department: deptId,
            summary: summary || '',
            sections,
            coverImage,
            teacherEventIds: teacherEventIds || [],
            eventIds: eventIds || [],
            createdBy: req.user._id,
            status: 'draft',
            scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
        });
        const out = await populated(Newsletter.findById(doc._id));
        res.status(201).json({ success: true, data: out });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false, message: 'Validation failed',
                errors: Object.values(error.errors).map(e => ({ msg: e.message, path: e.path, type: 'field' }))
            });
        }
        res.status(500).json({ success: false, message: 'Error creating newsletter', error: error.message });
    }
};

// GET /api/newsletters
exports.getNewsletters = async (req, res) => {
    try {
        const q = {};
        if (isHOD(req.user)) q.department = req.user.department;
        if (req.query.department) q.department = req.query.department;
        if (req.query.status) q.status = req.query.status;
        if (req.query.year)  q.year  = Number(req.query.year);
        if (req.query.month != null) q.month = Number(req.query.month);

        const items = await populated(Newsletter.find(q).sort({ year: -1, month: -1, updatedAt: -1 }));
        res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching newsletters', error: error.message });
    }
};

// GET /api/newsletters/:id
exports.getNewsletter = async (req, res) => {
    try {
        const n = await populated(Newsletter.findById(req.params.id));
        if (!n) return res.status(404).json({ success: false, message: 'Newsletter not found' });
        if (isHOD(req.user) && n.department._id.toString() !== req.user.department.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        res.status(200).json({ success: true, data: n });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching newsletter', error: error.message });
    }
};

// PUT /api/newsletters/:id
exports.updateNewsletter = async (req, res) => {
    try {
        const n = await Newsletter.findById(req.params.id);
        if (!n) return res.status(404).json({ success: false, message: 'Newsletter not found' });
        if (isHOD(req.user) && n.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (n.status === 'published' && !isAdmin(req.user)) {
            return res.status(400).json({ success: false, message: 'Published newsletters cannot be edited' });
        }

        const fields = ['title', 'summary', 'sections', 'coverImage', 'teacherEventIds', 'eventIds', 'month', 'year', 'scheduledFor'];
        fields.forEach(f => {
            if (req.body[f] !== undefined) {
                if (f === 'scheduledFor') n[f] = req.body[f] ? new Date(req.body[f]) : null;
                else n[f] = req.body[f];
            }
        });
        await n.save();
        const out = await populated(Newsletter.findById(n._id));
        res.status(200).json({ success: true, data: out });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false, message: 'Validation failed',
                errors: Object.values(error.errors).map(e => ({ msg: e.message, path: e.path, type: 'field' }))
            });
        }
        res.status(500).json({ success: false, message: 'Error updating newsletter', error: error.message });
    }
};

// PUT /api/newsletters/:id/publish
exports.publishNewsletter = async (req, res) => {
    try {
        const n = await Newsletter.findById(req.params.id);
        if (!n) return res.status(404).json({ success: false, message: 'Newsletter not found' });
        if (isHOD(req.user) && n.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        n.status = 'published';
        n.publishedBy = req.user._id;
        n.publishedAt = new Date();
        await n.save();
        const out = await populated(Newsletter.findById(n._id));
        res.status(200).json({ success: true, message: 'Newsletter published', data: out });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error publishing newsletter', error: error.message });
    }
};

// POST /api/newsletters/:id/cover  (multer single 'coverImage')
exports.uploadCover = async (req, res) => {
    try {
        const n = await Newsletter.findById(req.params.id);
        if (!n) return res.status(404).json({ success: false, message: 'Newsletter not found' });
        if (isHOD(req.user) && n.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded (field name "coverImage")' });

        n.coverImage = `/uploads/newsletters/${req.file.filename}`;
        await n.save();
        const out = await populated(Newsletter.findById(n._id));
        res.status(200).json({ success: true, message: 'Cover image uploaded', data: out });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error uploading cover', error: error.message });
    }
};

// DELETE /api/newsletters/:id
exports.deleteNewsletter = async (req, res) => {
    try {
        const n = await Newsletter.findById(req.params.id);
        if (!n) return res.status(404).json({ success: false, message: 'Newsletter not found' });
        if (isHOD(req.user) && n.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        await n.deleteOne();
        res.status(200).json({ success: true, message: 'Newsletter deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting newsletter', error: error.message });
    }
};

/**
 * Aggregate everything that happened in the given department + month + year window.
 * Used by:
 *   - GET /api/newsletters/published/:deptId/:year/:month (the auto-generated fallback)
 *   - GET /api/newsletters/draft-preview/:deptId/:year/:month (HOD auto-fill button)
 *
 * Returns:
 *   {
 *     department: { _id, name, code },
 *     range:      { startDate, endDate },
 *     teacherEvents, events, projects, clubs, certificates, internships, newFaculty
 *   }
 */
async function aggregateMonth(deptId, year, month) {
    const department = await Department.findById(deptId);
    if (!department) return null;

    const startDate = new Date(Number(year), Number(month), 1);
    const endDate   = new Date(Number(year), Number(month) + 1, 0, 23, 59, 59);

    const [teacherEvents, events, projects, clubs, certificates, internships, newFaculty] = await Promise.all([
        TeacherEvent.find({
            department: deptId,
            eventDate: { $gte: startDate, $lte: endDate },
            status: 'published'
        })
            .populate('createdBy', 'name email designation')
            .populate('studentsInvolved', 'name email usn rollNumber')
            .populate('teachersInvolved', 'name email')
            .sort({ eventDate: -1 }),

        Event.find({
            department: deptId,
            eventDate: { $gte: startDate, $lte: endDate },
            status: 'approved'
        })
            .populate('createdBy', 'name email')
            .populate('club', 'name')
            .sort({ eventDate: -1 }),

        // Approved projects whose approval (preferred) or creation date falls in this month.
        Project.find({
            department: deptId,
            approvalStatus: 'approved',
            $or: [
                { approvedAt: { $gte: startDate, $lte: endDate } },
                {
                    approvedAt: { $exists: false },
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            ]
        })
            .populate('createdBy', 'name usn rollNumber')
            .populate('primaryMentor', 'name')
            .select('title description studentProjectType domain createdBy primaryMentor approvedAt createdAt')
            .sort({ createdAt: -1 }),

        Club.find({
            department: deptId,
            status: 'approved',
            approvalDate: { $gte: startDate, $lte: endDate }
        })
            .populate({ path: 'mentors.teacher', select: 'name' })
            .select('name purpose mentors approvalDate')
            .sort({ approvalDate: -1 }),

        // Approved certificates in this month — student spotlight.
        Certificate.find({
            department: deptId,
            status: 'approved',
            $or: [
                { approvedAt: { $gte: startDate, $lte: endDate } },
                { issueDate: { $gte: startDate, $lte: endDate } }
            ]
        })
            .populate('owner', 'name usn rollNumber')
            .select('title issuer organization issueDate owner')
            .sort({ issueDate: -1 })
            .limit(20),

        Internship.find({
            department: deptId,
            startDate: { $gte: startDate, $lte: endDate }
        })
            .populate('owner', 'name usn rollNumber')
            .select('companyName position startDate endDate location owner')
            .sort({ startDate: -1 })
            .limit(20),

        // Faculty joined this month.
        User.find({
            department: deptId,
            role: 'teacher',
            createdAt: { $gte: startDate, $lte: endDate }
        })
            .select('name email designation createdAt')
            .populate('designation', 'name')
            .sort({ createdAt: -1 })
    ]);

    return {
        department: { _id: department._id, name: department.name, code: department.code },
        range: { startDate, endDate },
        teacherEvents,
        events,
        projects,
        clubs,
        certificates,
        internships,
        newFaculty
    };
}

// PUBLIC: GET /api/newsletters/published/:deptId/:year/:month
exports.getPublishedNewsletter = async (req, res) => {
    try {
        const { deptId, year, month } = req.params;
        const n = await populated(Newsletter.findOne({
            department: deptId,
            year: Number(year),
            month: Number(month),
            status: 'published'
        }).sort({ publishedAt: -1 }));

        if (n) {
            return res.status(200).json({ success: true, source: 'curated', data: n });
        }

        const agg = await aggregateMonth(deptId, year, month);
        if (!agg) return res.status(404).json({ success: false, message: 'Department not found' });

        res.status(200).json({
            success: true,
            source: 'auto-generated',
            data: {
                title: `${agg.department.name} — ${agg.range.startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                month: Number(month),
                year: Number(year),
                department: agg.department,
                summary: '',
                sections: [],
                teacherEvents: agg.teacherEvents,
                events:        agg.events,
                projects:      agg.projects,
                clubs:         agg.clubs,
                certificates:  agg.certificates,
                internships:   agg.internships,
                newFaculty:    agg.newFaculty,
                status: 'auto'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching newsletter', error: error.message });
    }
};

// HOD-only: GET /api/newsletters/draft-preview/:deptId/:year/:month
// Returns ready-to-drop section payloads built from this month's aggregated activity.
exports.draftPreview = async (req, res) => {
    try {
        const { deptId, year, month } = req.params;

        // HOD scope check.
        if (isHOD(req.user) && req.user.department.toString() !== deptId) {
            return res.status(403).json({ success: false, message: 'Not authorized for this department' });
        }

        const agg = await aggregateMonth(deptId, year, month);
        if (!agg) return res.status(404).json({ success: false, message: 'Department not found' });

        const sections = [];
        const escape = (s) => String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const monthLabel = agg.range.startDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        if (agg.events.length || agg.teacherEvents.length) {
            const items = [
                ...agg.events.map(e => `<li><strong>${escape(e.title)}</strong> — ${escape(new Date(e.eventDate).toLocaleDateString())}${e.venue ? ` · ${escape(e.venue)}` : ''}${e.description ? `<br><em>${escape(e.description)}</em>` : ''}</li>`),
                ...agg.teacherEvents.map(e => `<li><strong>${escape(e.title)}</strong> — ${escape(new Date(e.eventDate).toLocaleDateString())} · faculty event by ${escape(e.createdBy?.name || '—')}</li>`)
            ];
            sections.push({ heading: `Events — ${monthLabel}`, body: `<ul>${items.join('')}</ul>`, order: sections.length });
        }

        if (agg.projects.length) {
            const grouped = {};
            agg.projects.forEach(p => {
                const type = p.studentProjectType || 'project';
                (grouped[type] = grouped[type] || []).push(p);
            });
            const body = Object.entries(grouped).map(([type, list]) => `
                <p><strong>${escape(type.charAt(0).toUpperCase() + type.slice(1))} projects (${list.length})</strong></p>
                <ul>${list.map(p => `<li><strong>${escape(p.title)}</strong> by ${escape(p.createdBy?.name || '—')}${p.primaryMentor?.name ? ` · mentor ${escape(p.primaryMentor.name)}` : ''}${p.domain ? ` · ${escape(p.domain)}` : ''}</li>`).join('')}</ul>
            `).join('');
            sections.push({ heading: 'Approved projects', body, order: sections.length });
        }

        if (agg.clubs.length) {
            const items = agg.clubs.map(c => {
                const lead = (c.mentors || []).find(m => m.isPrimaryMentor) || c.mentors?.[0];
                return `<li><strong>${escape(c.name)}</strong>${lead?.teacher?.name ? ` — mentored by ${escape(lead.teacher.name)}` : ''}${c.purpose ? `<br><em>${escape(c.purpose)}</em>` : ''}</li>`;
            }).join('');
            sections.push({ heading: 'New clubs approved', body: `<ul>${items}</ul>`, order: sections.length });
        }

        if (agg.certificates.length) {
            const grouped = {};
            agg.certificates.forEach(c => {
                const iss = c.issuer || 'Other';
                (grouped[iss] = grouped[iss] || []).push(c);
            });
            const body = Object.entries(grouped).map(([iss, list]) => `
                <p><strong>${escape(iss)} (${list.length})</strong></p>
                <ul>${list.map(c => `<li>${escape(c.owner?.name || '—')}${c.owner?.usn ? ` (${escape(c.owner.usn)})` : ''} — ${escape(c.title)}</li>`).join('')}</ul>
            `).join('');
            sections.push({ heading: 'Student certificates', body, order: sections.length });
        }

        if (agg.internships.length) {
            const items = agg.internships.map(i => `<li>${escape(i.owner?.name || '—')} — ${escape(i.position || 'Intern')} at <strong>${escape(i.companyName)}</strong>${i.location ? ` · ${escape(i.location)}` : ''}</li>`).join('');
            sections.push({ heading: 'Internships', body: `<ul>${items}</ul>`, order: sections.length });
        }

        if (agg.newFaculty.length) {
            const items = agg.newFaculty.map(t => `<li><strong>${escape(t.name)}</strong>${t.designation?.name ? ` · ${escape(t.designation.name)}` : ''}</li>`).join('');
            sections.push({ heading: 'Welcome aboard', body: `<ul>${items}</ul>`, order: sections.length });
        }

        res.status(200).json({
            success: true,
            data: {
                department: agg.department,
                month: Number(month),
                year: Number(year),
                suggestedTitle: `${agg.department.name} Newsletter — ${monthLabel}`,
                sections
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error building draft preview', error: error.message });
    }
};

// PUBLIC: GET /api/newsletters/published?deptId=...
// Returns a list of all published newsletters for a department (archive).
exports.listPublishedForDept = async (req, res) => {
    try {
        const { deptId } = req.query;
        if (!deptId) return res.status(400).json({ success: false, message: 'deptId is required' });

        const items = await Newsletter.find({ department: deptId, status: 'published' })
            .select('title month year publishedAt coverImage summary department')
            .populate('department', 'name code')
            .populate('publishedBy', 'name')
            .sort({ year: -1, month: -1, publishedAt: -1 });

        res.status(200).json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error listing newsletters', error: error.message });
    }
};

// PUBLIC: POST /api/newsletters/subscribe  { email, department, name? }
exports.subscribe = async (req, res) => {
    try {
        const { email, department, name } = req.body;
        if (!email || !department) return res.status(400).json({ success: false, message: 'email and department are required' });

        const dept = await Department.findById(department);
        if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

        // Upsert.
        const existing = await NewsletterSubscriber.findOne({ email: email.toLowerCase(), department });
        if (existing) {
            if (!existing.isActive) {
                existing.isActive = true;
                await existing.save();
            }
            return res.status(200).json({ success: true, message: 'You are subscribed.', data: { _id: existing._id } });
        }
        const sub = await NewsletterSubscriber.create({ email: email.toLowerCase(), name, department });

        // Confirmation email (best-effort; mailer no-ops if SMTP not configured).
        const base = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
        await sendMail({
            to: sub.email,
            subject: `Subscribed to ${dept.name} newsletter`,
            html: `<p>Hi${sub.name ? ' ' + sub.name : ''},</p>
                   <p>You're subscribed to the <strong>${dept.name}</strong> newsletter. We'll email you each issue when it's published.</p>
                   <p><a href="${base}/newsletter/archive?deptId=${dept._id}">Browse past issues</a></p>
                   <p style="color:#666;font-size:.9em;">Don't want these? <a href="${base}/api/newsletters/unsubscribe?token=${sub.unsubscribeToken}">Unsubscribe</a>.</p>`
        }).catch(() => {});

        res.status(201).json({ success: true, message: 'Subscribed', data: { _id: sub._id } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error subscribing', error: error.message });
    }
};

// PUBLIC: GET /api/newsletters/unsubscribe?token=...
exports.unsubscribe = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).send('Invalid unsubscribe link.');

        const sub = await NewsletterSubscriber.findOne({ unsubscribeToken: token });
        if (!sub) return res.status(404).send('Subscription not found or already removed.');

        sub.isActive = false;
        await sub.save();

        res.set('Content-Type', 'text/html').send(`
            <!doctype html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
            <style>body{font-family:system-ui,sans-serif;max-width:560px;margin:8vh auto;padding:0 1rem;color:#222;}</style>
            </head><body>
                <h2>You're unsubscribed</h2>
                <p>${sub.email} will no longer receive newsletter emails for this department.</p>
                <p><a href="/newsletter">Back to newsletters</a></p>
            </body></html>
        `);
    } catch (error) {
        res.status(500).send('Error unsubscribing: ' + error.message);
    }
};

// HOD/admin: POST /api/newsletters/:id/send  — emails the published newsletter to all subscribers.
exports.sendToSubscribers = async (req, res) => {
    try {
        const n = await populated(Newsletter.findById(req.params.id));
        if (!n) return res.status(404).json({ success: false, message: 'Newsletter not found' });
        if (isHOD(req.user) && n.department._id.toString() !== req.user.department.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (n.status !== 'published') return res.status(400).json({ success: false, message: 'Newsletter must be published before sending' });

        // Recipients: explicit subscribers + active department users (deduplicated by email).
        const [subs, members] = await Promise.all([
            NewsletterSubscriber.find({ department: n.department._id, isActive: true }).select('email unsubscribeToken'),
            User.find({ department: n.department._id, isActive: true, email: { $exists: true, $ne: '' } }).select('email')
        ]);

        const recipients = new Map();
        members.forEach(u => recipients.set(u.email.toLowerCase(), { email: u.email, token: null }));
        subs.forEach(s    => recipients.set(s.email.toLowerCase(), { email: s.email, token: s.unsubscribeToken }));

        const recipientList = [...recipients.values()];
        if (!recipientList.length) {
            return res.status(400).json({ success: false, message: 'No recipients in this department' });
        }

        const base = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
        const readOnlineUrl = `${base}/newsletter?dept=${n.department._id}&month=${n.month}&year=${n.year}`;
        const monthLabel = new Date(n.year, n.month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
        const sectionsHtml = (n.sections || [])
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(s => `<section style="margin:1.5rem 0;"><h2 style="border-bottom:1px solid #ccc;padding-bottom:.25rem;text-transform:uppercase;letter-spacing:.03em;">${escapeForEmail(s.heading)}</h2><div>${s.body || ''}</div></section>`)
            .join('');
        const baseHtml = `
            <div style="font-family:Georgia,serif;color:#222;max-width:680px;margin:0 auto;padding:1rem;background:#fffaf3;">
                ${n.coverImage ? `<img src="${base}${escapeForEmail(n.coverImage)}" alt="" style="width:100%;max-height:240px;object-fit:cover;border-radius:6px;">` : ''}
                <h1 style="text-align:center;margin:1rem 0 .25rem;">${escapeForEmail(n.title)}</h1>
                <p style="text-align:center;color:#666;font-style:italic;margin:0;">${escapeForEmail(n.department?.name || '')} · ${monthLabel}</p>
                ${n.summary ? `<p style="text-align:center;margin:1rem 0;">${escapeForEmail(n.summary)}</p>` : ''}
                ${sectionsHtml || '<p style="text-align:center;color:#666;">(No sections)</p>'}
                <hr style="margin-top:2rem;">
                <p style="font-size:.85em;color:#666;text-align:center;">
                    <a href="${readOnlineUrl}">Read online</a>
                </p>
            </div>
        `;

        // Send each recipient individually so each gets a personal unsubscribe link.
        // For very large lists this would batch via bcc — kept simple here.
        let sent = 0, failed = 0;
        for (const r of recipientList) {
            const unsubLink = r.token
                ? `<p style="text-align:center;font-size:.8em;color:#888;"><a href="${base}/api/newsletters/unsubscribe?token=${r.token}">Unsubscribe</a></p>`
                : '';
            try {
                const result = await sendMail({
                    to: r.email,
                    subject: `${n.title} — ${monthLabel}`,
                    html: baseHtml + unsubLink
                });
                if (!result.skipped) sent++;
            } catch {
                failed++;
            }
        }

        n.lastSentAt = new Date();
        n.sentCount = (n.sentCount || 0) + sent;
        await n.save();

        const skippedDueToNoSMTP = recipientList.length - sent - failed > 0;
        res.status(200).json({
            success: true,
            message: skippedDueToNoSMTP
                ? `SMTP not configured — would have emailed ${recipientList.length} recipient${recipientList.length === 1 ? '' : 's'}. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env to actually send.`
                : `Sent to ${sent} recipient${sent === 1 ? '' : 's'}${failed ? ` (${failed} failed)` : ''}.`,
            data: { recipients: recipientList.length, sent, failed }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error sending newsletter', error: error.message });
    }
};

function escapeForEmail(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
