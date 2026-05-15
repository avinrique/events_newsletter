const express = require('express');
const router = express.Router();
const TeacherEvent = require('../models/TeacherEvent');
const Department = require('../models/Department');

// Public route to serve newsletter page
router.get('/', (req, res) => {
    res.sendFile('newsletter.html', { root: './views' });
});

// Public archive — lists every published newsletter for a department.
router.get('/archive', (req, res) => {
    res.sendFile('newsletter-archive.html', { root: './views' });
});

// RSS feed of published newsletters for a department.
const Newsletter = require('../models/Newsletter');
router.get('/rss/:deptId', async (req, res) => {
    try {
        const items = await Newsletter.find({
            department: req.params.deptId,
            status: 'published'
        })
            .populate('department', 'name code')
            .populate('publishedBy', 'name')
            .sort({ year: -1, month: -1, publishedAt: -1 })
            .limit(50);

        const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const dept = items[0]?.department;
        const channelTitle = dept ? `${dept.name} Newsletter` : 'Department Newsletter';
        const escape = (s) => String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        const xmlItems = items.map(n => {
            const url = `${base}/newsletter?dept=${n.department._id}&month=${n.month}&year=${n.year}`;
            const sectionsText = (n.sections || [])
                .map(s => `<h2>${escape(s.heading)}</h2>${s.body || ''}`)
                .join('');
            const pubDate = n.publishedAt ? new Date(n.publishedAt).toUTCString() : new Date(n.year, n.month, 1).toUTCString();
            const author = n.publishedBy?.name || 'Department';
            return `
    <item>
        <title>${escape(n.title)}</title>
        <link>${url}</link>
        <guid isPermaLink="true">${url}</guid>
        <pubDate>${pubDate}</pubDate>
        <author>${escape(author)}</author>
        <description>${escape(n.summary || '')}</description>
        <content:encoded><![CDATA[${sectionsText}]]></content:encoded>
    </item>`;
        }).join('');

        res.set('Content-Type', 'application/rss+xml; charset=utf-8');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
    <title>${escape(channelTitle)}</title>
    <link>${base}/newsletter/archive?deptId=${req.params.deptId}</link>
    <description>Published newsletters from ${escape(dept?.name || 'this department')}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${xmlItems}
</channel>
</rss>`);
    } catch (err) {
        res.status(500).set('Content-Type', 'application/xml').send(`<?xml version="1.0"?><error>${err.message}</error>`);
    }
});

// Public API to get departments for newsletter
router.get('/api/departments/public', async (req, res) => {
    try {
        const departments = await Department.find({}, 'name').sort({ name: 1 });
        
        res.json({
            success: true,
            data: departments
        });
        
    } catch (error) {
        console.error('Error fetching departments for newsletter:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching departments'
        });
    }
});

// Public API to get teacher events for newsletter
router.get('/api/teacher-events/public/:departmentId/:month/:year', async (req, res) => {
    try {
        const { departmentId, month, year } = req.params;
        
        // Validate parameters
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        
        if (monthNum < 0 || monthNum > 11 || yearNum < 2020 || yearNum > 2030) {
            return res.status(400).json({
                success: false,
                message: 'Invalid month or year'
            });
        }
        
        // Get department info
        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }
        
        // Calculate date range for the selected month
        const startDate = new Date(yearNum, monthNum, 1);
        const endDate = new Date(yearNum, monthNum + 1, 0, 23, 59, 59);
        
        // Fetch teacher events for the department and date range
        const events = await TeacherEvent.find({
            department: departmentId,
            eventDate: {
                $gte: startDate,
                $lte: endDate
            },
            status: 'published'
        })
        .populate('createdBy', 'name email designation')
        .populate('studentsInvolved', 'name email usn rollNumber')
        .populate('teachersInvolved', 'name email')
        .populate('department', 'name')
        .sort({ eventDate: -1 });

        res.json({
            success: true,
            data: events,
            departmentName: department.name,
            period: {
                month: monthNum,
                year: yearNum,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error fetching newsletter data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching newsletter data'
        });
    }
});

module.exports = router;