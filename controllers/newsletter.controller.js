const Newsletter = require('../models/Newsletter');
const TeacherEvent = require('../models/TeacherEvent');
const Event = require('../models/Event');
const Department = require('../models/Department');

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
        const { title, month, year, department, summary, sections = [], coverImage, teacherEventIds, eventIds } = req.body;

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
            status: 'draft'
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

        const fields = ['title', 'summary', 'sections', 'coverImage', 'teacherEventIds', 'eventIds', 'month', 'year'];
        fields.forEach(f => { if (req.body[f] !== undefined) n[f] = req.body[f]; });
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

// PUBLIC: GET /api/newsletters/published/:deptId/:year/:month
exports.getPublishedNewsletter = async (req, res) => {
    try {
        const { deptId, year, month } = req.params;
        const n = await populated(Newsletter.findOne({
            department: deptId,
            year: Number(year),
            month: Number(month),
            status: 'published'
        }));

        if (n) {
            return res.status(200).json({ success: true, source: 'curated', data: n });
        }

        // Fallback: aggregate teacher events for that month (matches the old public newsletter behavior).
        const department = await Department.findById(deptId);
        if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

        const startDate = new Date(Number(year), Number(month), 1);
        const endDate = new Date(Number(year), Number(month) + 1, 0, 23, 59, 59);

        const events = await TeacherEvent.find({
            department: deptId,
            eventDate: { $gte: startDate, $lte: endDate },
            status: 'published'
        })
            .populate('createdBy', 'name email designation')
            .populate('studentsInvolved', 'name email usn rollNumber')
            .populate('teachersInvolved', 'name email')
            .sort({ eventDate: -1 });

        res.status(200).json({
            success: true,
            source: 'auto-generated',
            data: {
                title: `${department.name} — ${startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                month: Number(month),
                year: Number(year),
                department: { _id: department._id, name: department.name, code: department.code },
                summary: '',
                sections: [],
                teacherEvents: events,
                status: 'auto'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching newsletter', error: error.message });
    }
};
