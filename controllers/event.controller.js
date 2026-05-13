const Event = require('../models/Event');
const Club = require('../models/Club');
const { validationResult } = require('express-validator');

function isHOD(user) {
    return user.role === 'hod' || (user.role === 'teacher' && user.position === 'HOD');
}

function populated(query) {
    return query
        .populate('createdBy', 'name email designation')
        .populate('organizers', 'name email')
        .populate('department', 'name code')
        .populate('club', 'name purpose')
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email')
        .populate('participants.user', 'name email usn rollNumber');
}

// POST /api/events
exports.createEvent = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const {
            title, description, eventType, eventCategory, venue,
            eventDate, startTime, endTime, expectedParticipants,
            registrationRequired, registrationDeadline, club, budget
        } = req.body;

        if (eventType === 'club-event' && !club) {
            return res.status(400).json({
                success: false,
                message: 'Club events require a club reference'
            });
        }

        if (club) {
            const c = await Club.findById(club);
            if (!c) return res.status(404).json({ success: false, message: 'Club not found' });
            if (c.department.toString() !== req.user.department.toString()) {
                return res.status(403).json({ success: false, message: 'Club is in another department' });
            }
        }

        const eventData = {
            title: title.trim(),
            description: description.trim(),
            eventType,
            eventCategory,
            venue: venue.trim(),
            eventDate,
            startTime,
            endTime,
            expectedParticipants: expectedParticipants || undefined,
            registrationRequired: !!registrationRequired,
            registrationDeadline: registrationDeadline || undefined,
            club: club || undefined,
            department: req.user.department,
            createdBy: req.user._id,
            organizers: [req.user._id],
            status: 'pending'
        };

        if (budget && (budget.categories || budget.totalRequested)) {
            const categories = Array.isArray(budget.categories) ? budget.categories : [];
            const totalRequested = budget.totalRequested != null
                ? Number(budget.totalRequested)
                : categories.reduce((sum, c) => sum + (Number(c.requested) || 0), 0);
            eventData.budget = {
                totalRequested,
                totalApproved: 0,
                totalUtilized: 0,
                categories
            };
        }

        const event = await Event.create(eventData);
        await populated(Event.findById(event._id));

        const populatedEvent = await populated(Event.findById(event._id));
        res.status(201).json({
            success: true,
            message: 'Event created and sent for HOD approval',
            data: populatedEvent
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.values(error.errors).map(e => ({
                    msg: e.message, path: e.path, type: 'field'
                }))
            });
        }
        res.status(500).json({ success: false, message: 'Error creating event', error: error.message });
    }
};

// GET /api/events
exports.getEvents = async (req, res) => {
    try {
        const query = {};

        // Role scoping
        if (req.user.role === 'student') {
            query.department = req.user.department;
            query.status = 'approved';
        } else if (isHOD(req.user)) {
            query.department = req.user.department;
        } else if (req.user.role === 'teacher') {
            query.department = req.user.department;
            // teachers see their own + club events whose mentor list includes them
            query.$or = [
                { createdBy: req.user._id },
                { organizers: req.user._id }
            ];
        }
        // admin/superadmin: no scoping by default

        if (req.query.department) query.department = req.query.department;
        if (req.query.status) query.status = req.query.status;
        if (req.query.eventType) query.eventType = req.query.eventType;
        if (req.query.club) query.club = req.query.club;

        const events = await populated(Event.find(query).sort({ eventDate: -1 }));

        res.status(200).json({
            success: true,
            count: events.length,
            data: events
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching events', error: error.message });
    }
};

// GET /api/events/my-participations  (student helper used by api.js)
exports.getMyParticipations = async (req, res) => {
    try {
        const events = await populated(
            Event.find({
                department: req.user.department,
                status: 'approved',
                'participants.user': req.user._id
            }).sort({ eventDate: -1 })
        );
        res.status(200).json({ success: true, count: events.length, data: events });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching participations', error: error.message });
    }
};

// GET /api/events/:id
exports.getEvent = async (req, res) => {
    try {
        const event = await populated(Event.findById(req.params.id));
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        if (req.user.role !== 'admin' && req.user.role !== 'superadmin' &&
            event.department._id.toString() !== req.user.department?.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (req.user.role === 'student' && event.status !== 'approved') {
            return res.status(403).json({ success: false, message: 'Event is not approved yet' });
        }
        res.status(200).json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching event', error: error.message });
    }
};

// PUT /api/events/:id
exports.updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const isOwner = event.createdBy.toString() === req.user._id.toString();
        if (!isOwner && !isHOD(req.user) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update this event' });
        }

        if (event.status !== 'pending' && !isHOD(req.user) && req.user.role !== 'admin') {
            return res.status(400).json({ success: false, message: 'Only pending events can be edited' });
        }

        const allowed = [
            'title', 'description', 'eventType', 'eventCategory', 'venue', 'eventDate',
            'startTime', 'endTime', 'expectedParticipants', 'registrationRequired',
            'registrationDeadline'
        ];
        allowed.forEach(k => { if (req.body[k] !== undefined) event[k] = req.body[k]; });

        if (req.body.budget) {
            event.budget = event.budget || {};
            if (req.body.budget.totalRequested != null) {
                event.budget.totalRequested = Number(req.body.budget.totalRequested);
            }
            if (Array.isArray(req.body.budget.categories)) {
                event.budget.categories = req.body.budget.categories;
            }
        }

        await event.save();
        const updated = await populated(Event.findById(event._id));
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.values(error.errors).map(e => ({ msg: e.message, path: e.path, type: 'field' }))
            });
        }
        res.status(500).json({ success: false, message: 'Error updating event', error: error.message });
    }
};

// DELETE /api/events/:id
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const isOwner = event.createdBy.toString() === req.user._id.toString();
        if (!isOwner && !isHOD(req.user) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this event' });
        }

        if (event.status === 'approved' || event.status === 'completed') {
            event.status = 'cancelled';
            await event.save();
            return res.status(200).json({ success: true, message: 'Event cancelled', data: event });
        }

        await event.deleteOne();
        res.status(200).json({ success: true, message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting event', error: error.message });
    }
};

// PUT /api/events/:id/approve
exports.approveEvent = async (req, res) => {
    try {
        if (!isHOD(req.user)) {
            return res.status(403).json({ success: false, message: 'Only HOD can approve events' });
        }
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({ success: false, message: 'Event is in another department' });
        }
        if (event.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Event is already ${event.status}` });
        }

        event.status = 'approved';
        event.approvedBy = req.user._id;
        event.approvalDate = new Date();

        // Budget approval — accept override amount, else mirror request
        if (event.budget) {
            const override = req.body && req.body.approvedAmount;
            event.budget.totalApproved = override != null
                ? Math.max(0, Number(override))
                : (event.budget.totalRequested || 0);
        }

        await event.save();
        const updated = await populated(Event.findById(event._id));
        res.status(200).json({ success: true, message: 'Event approved', data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error approving event', error: error.message });
    }
};

// PUT /api/events/:id/reject
exports.rejectEvent = async (req, res) => {
    try {
        if (!isHOD(req.user)) {
            return res.status(403).json({ success: false, message: 'Only HOD can reject events' });
        }
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({ success: false, message: 'Event is in another department' });
        }
        if (event.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Event is already ${event.status}` });
        }

        event.status = 'rejected';
        event.rejectedBy = req.user._id;
        event.rejectionDate = new Date();
        event.rejectionReason = (req.body && req.body.reason) || (req.body && req.body.comments) || '';

        await event.save();
        const updated = await populated(Event.findById(event._id));
        res.status(200).json({ success: true, message: 'Event rejected', data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error rejecting event', error: error.message });
    }
};

// PUT /api/events/:id/budget — HOD adjusts approved budget
exports.updateBudget = async (req, res) => {
    try {
        if (!isHOD(req.user) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (req.user.role !== 'admin' && event.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({ success: false, message: 'Event is in another department' });
        }
        event.budget = event.budget || {};
        if (req.body.totalApproved != null) event.budget.totalApproved = Math.max(0, Number(req.body.totalApproved));
        if (req.body.totalRequested != null) event.budget.totalRequested = Math.max(0, Number(req.body.totalRequested));
        if (Array.isArray(req.body.categories)) event.budget.categories = req.body.categories;
        await event.save();
        const updated = await populated(Event.findById(event._id));
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating budget', error: error.message });
    }
};

// PUT /api/events/:id/budget/utilize — organizer logs utilization
exports.utilizeBudget = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        const isOrganizer = event.organizers.some(o => o.toString() === req.user._id.toString())
            || event.createdBy.toString() === req.user._id.toString();
        if (!isOrganizer && !isHOD(req.user) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only organizers can record utilization' });
        }
        const amount = Number(req.body.amount);
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
        }
        event.budget = event.budget || {};
        const newTotal = (event.budget.totalUtilized || 0) + amount;
        const approved = event.budget.totalApproved || 0;
        if (newTotal > approved) {
            return res.status(400).json({
                success: false,
                message: `Utilization exceeds approved budget (₹${approved})`
            });
        }
        event.budget.totalUtilized = newTotal;
        await event.save();
        res.status(200).json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error recording utilization', error: error.message });
    }
};
