const User = require('../models/User');
const Project = require('../models/Project');
const Certificate = require('../models/Certificate');
const Internship = require('../models/Internship');
const Event = require('../models/Event');
const Club = require('../models/Club');
const Department = require('../models/Department');

function isHODOrAdmin(user) {
    if (user.role === 'admin' || user.role === 'superadmin') return true;
    if (user.role === 'hod') return true;
    if (user.role === 'teacher' && user.position === 'HOD') return true;
    return false;
}

function isHOD(user) {
    return user.role === 'hod' || (user.role === 'teacher' && user.position === 'HOD');
}

function sameDept(user, deptId) {
    return user.department && user.department.toString() === deptId.toString();
}

// @desc    Generate teacher activity report (HOD access)
// @route   GET /api/reports/teachers/:teacherId
// @access  Private (HOD only)
exports.getTeacherReport = async (req, res) => {
    try {
        // Check if user is HOD
        if (req.user.role !== 'teacher' || req.user.position !== 'HOD') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only HODs can view teacher reports.'
            });
        }

        const { teacherId } = req.params;
        const { startDate, endDate } = req.query;

        // Find the teacher
        const teacher = await User.findById(teacherId)
            .populate('department', 'name code')
            .populate('designation', 'name level');

        if (!teacher || teacher.role !== 'teacher') {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }

        // Ensure teacher is in HOD's department
        if (teacher.department._id.toString() !== req.user.department.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only view reports for teachers in your department'
            });
        }

        // Date range for filtering
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }

        // Get teacher's mentored projects
        const mentoredProjects = await Project.find({
            primaryMentor: teacherId,
            ...dateFilter
        }).populate('createdBy', 'name usn')
          .populate('teamMembers.user', 'name usn');

        // Get teacher's supervised certificates
        const supervisedCertificates = await Certificate.find({
            supervisedBy: teacherId,
            ...dateFilter
        }).populate('student', 'name usn');

        // Get teacher's supervised internships
        const supervisedInternships = await Internship.find({
            supervisedBy: teacherId,
            ...dateFilter
        }).populate('student', 'name usn');

        // Get teacher's created events
        const createdEvents = await Event.find({
            createdBy: teacherId,
            ...dateFilter
        });

        // Get students assigned to this teacher (proctor/class teacher)
        const assignedStudents = await User.find({
            $or: [
                { proctor: teacherId },
                { classTeacher: teacherId }
            ],
            role: 'student',
            department: teacher.department._id
        }).select('name usn semester');

        // Calculate statistics
        const statistics = {
            totalMentoredProjects: mentoredProjects.length,
            projectsByType: {
                major: mentoredProjects.filter(p => p.studentProjectType === 'major').length,
                mini: mentoredProjects.filter(p => p.studentProjectType === 'mini').length,
                personal: mentoredProjects.filter(p => p.studentProjectType === 'personal').length
            },
            projectsByStatus: {
                approved: mentoredProjects.filter(p => p.approvalStatus === 'approved').length,
                pending: mentoredProjects.filter(p => p.approvalStatus === 'pending-approval').length,
                rejected: mentoredProjects.filter(p => p.approvalStatus === 'rejected').length
            },
            totalSupervisedCertificates: supervisedCertificates.length,
            certificatesByStatus: {
                approved: supervisedCertificates.filter(c => c.status === 'approved').length,
                pending: supervisedCertificates.filter(c => c.status === 'pending').length,
                rejected: supervisedCertificates.filter(c => c.status === 'rejected').length
            },
            totalSupervisedInternships: supervisedInternships.length,
            internshipsByStatus: {
                approved: supervisedInternships.filter(i => i.status === 'approved').length,
                pending: supervisedInternships.filter(i => i.status === 'pending').length,
                rejected: supervisedInternships.filter(i => i.status === 'rejected').length
            },
            totalCreatedEvents: createdEvents.length,
            eventsByStatus: {
                published: createdEvents.filter(e => e.status === 'published').length,
                draft: createdEvents.filter(e => e.status === 'draft').length,
                completed: createdEvents.filter(e => e.status === 'completed').length
            },
            totalAssignedStudents: assignedStudents.length,
            assignedStudentsBySemester: {
                semester2: assignedStudents.filter(s => s.semester === 2).length,
                semester4: assignedStudents.filter(s => s.semester === 4).length,
                semester6: assignedStudents.filter(s => s.semester === 6).length,
                semester8: assignedStudents.filter(s => s.semester === 8).length
            }
        };

        const reportData = {
            teacher: {
                _id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                designation: teacher.designation?.name,
                department: teacher.department?.name,
                contactNumber: teacher.contactNumber,
                joinDate: teacher.createdAt
            },
            reportPeriod: {
                startDate: startDate || 'All time',
                endDate: endDate || 'Present'
            },
            statistics,
            mentoredProjects: mentoredProjects.map(project => ({
                _id: project._id,
                title: project.title,
                type: project.studentProjectType,
                status: project.approvalStatus,
                createdBy: project.createdBy?.name,
                studentUSN: project.createdBy?.usn,
                teamSize: project.teamMembers.length,
                createdAt: project.createdAt
            })),
            supervisedCertificates: supervisedCertificates.map(cert => ({
                _id: cert._id,
                title: cert.title,
                platform: cert.platform,
                status: cert.status,
                student: cert.student?.name,
                studentUSN: cert.student?.usn,
                issuedDate: cert.issuedDate,
                createdAt: cert.createdAt
            })),
            supervisedInternships: supervisedInternships.map(internship => ({
                _id: internship._id,
                company: internship.company,
                position: internship.position,
                status: internship.status,
                student: internship.student?.name,
                studentUSN: internship.student?.usn,
                startDate: internship.startDate,
                endDate: internship.endDate,
                createdAt: internship.createdAt
            })),
            createdEvents: createdEvents.map(event => ({
                _id: event._id,
                title: event.title,
                type: event.eventType,
                status: event.status,
                date: event.eventDate,
                attendees: event.participants?.length || 0,
                createdAt: event.createdAt
            })),
            assignedStudents: assignedStudents.map(student => ({
                _id: student._id,
                name: student.name,
                usn: student.usn,
                semester: student.semester
            }))
        };

        res.status(200).json({
            success: true,
            data: reportData
        });

    } catch (error) {
        console.error('Error generating teacher report:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating teacher report',
            error: error.message
        });
    }
};

// @desc    Generate department teachers summary report (HOD access)
// @route   GET /api/reports/department/teachers
// @access  Private (HOD only)
exports.getDepartmentTeachersReport = async (req, res) => {
    try {
        // Check if user is HOD
        if (req.user.role !== 'teacher' || req.user.position !== 'HOD') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only HODs can view department reports.'
            });
        }

        const { startDate, endDate } = req.query;

        // Date range for filtering
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }

        // Get all teachers in department
        const teachers = await User.find({
            department: req.user.department,
            role: 'teacher'
        }).populate('designation', 'name level');

        const teacherReports = [];

        for (const teacher of teachers) {
            // Get counts for each teacher
            const mentoredProjectsCount = await Project.countDocuments({
                primaryMentor: teacher._id,
                ...dateFilter
            });

            const supervisedCertificatesCount = await Certificate.countDocuments({
                supervisedBy: teacher._id,
                ...dateFilter
            });

            const supervisedInternshipsCount = await Internship.countDocuments({
                supervisedBy: teacher._id,
                ...dateFilter
            });

            const createdEventsCount = await Event.countDocuments({
                createdBy: teacher._id,
                ...dateFilter
            });

            const assignedStudentsCount = await User.countDocuments({
                $or: [
                    { proctor: teacher._id },
                    { classTeacher: teacher._id }
                ],
                role: 'student'
            });

            teacherReports.push({
                teacher: {
                    _id: teacher._id,
                    name: teacher.name,
                    email: teacher.email,
                    designation: teacher.designation?.name,
                    position: teacher.position
                },
                activityCounts: {
                    mentoredProjects: mentoredProjectsCount,
                    supervisedCertificates: supervisedCertificatesCount,
                    supervisedInternships: supervisedInternshipsCount,
                    createdEvents: createdEventsCount,
                    assignedStudents: assignedStudentsCount
                }
            });
        }

        // Calculate department totals
        const departmentTotals = teacherReports.reduce((totals, report) => {
            totals.totalTeachers += 1;
            totals.totalMentoredProjects += report.activityCounts.mentoredProjects;
            totals.totalSupervisedCertificates += report.activityCounts.supervisedCertificates;
            totals.totalSupervisedInternships += report.activityCounts.supervisedInternships;
            totals.totalCreatedEvents += report.activityCounts.createdEvents;
            totals.totalAssignedStudents += report.activityCounts.assignedStudents;
            return totals;
        }, {
            totalTeachers: 0,
            totalMentoredProjects: 0,
            totalSupervisedCertificates: 0,
            totalSupervisedInternships: 0,
            totalCreatedEvents: 0,
            totalAssignedStudents: 0
        });

        res.status(200).json({
            success: true,
            data: {
                reportPeriod: {
                    startDate: startDate || 'All time',
                    endDate: endDate || 'Present'
                },
                departmentTotals,
                teacherReports
            }
        });

    } catch (error) {
        console.error('Error generating department teachers report:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating department teachers report',
            error: error.message
        });
    }
};

// @desc    Download teacher report as PDF/Excel (HOD access)
// @route   GET /api/reports/teachers/:teacherId/download
// @access  Private (HOD only)
exports.downloadTeacherReport = async (req, res) => {
    try {
        // Check if user is HOD
        if (req.user.role !== 'teacher' || req.user.position !== 'HOD') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only HODs can download teacher reports.'
            });
        }

        const { teacherId } = req.params;
        const { format = 'json', startDate, endDate } = req.query;

        // Get the report data (reuse the logic from getTeacherReport)
        const reportResponse = await this.getTeacherReport({
            user: req.user,
            params: { teacherId },
            query: { startDate, endDate }
        }, {
            status: () => ({ json: (data) => data }),
            json: (data) => data
        });

        if (!reportResponse.success) {
            return res.status(400).json(reportResponse);
        }

        const reportData = reportResponse.data;

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="teacher-report-${reportData.teacher.name.replace(/\s+/g, '-')}-${Date.now()}.json"`);
            return res.json(reportData);
        }

        // For now, return JSON with appropriate headers for download
        // In the future, this can be extended to support PDF/Excel generation
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="teacher-report-${reportData.teacher.name.replace(/\s+/g, '-')}-${Date.now()}.json"`);
        res.json(reportData);

    } catch (error) {
        console.error('Error downloading teacher report:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading teacher report',
            error: error.message
        });
    }
};

// @desc    Consolidated department report
// @route   GET /api/reports/department/:deptId
// @access  Private (HOD/Admin)
exports.getDepartmentReport = async (req, res) => {
    try {
        const { deptId } = req.params;
        if (!isHODOrAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (isHOD(req.user) && !sameDept(req.user, deptId)) {
            return res.status(403).json({ success: false, message: 'You can only view your own department' });
        }

        const department = await Department.findById(deptId);
        if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

        const [students, teachers, projects, clubs, events, certs, interns] = await Promise.all([
            User.countDocuments({ department: deptId, role: 'student', isActive: true }),
            User.countDocuments({ department: deptId, role: 'teacher', isActive: true }),
            Project.find({ department: deptId }),
            Club.find({ department: deptId }),
            Event.find({ department: deptId }),
            Certificate.find({ department: deptId }),
            Internship.find({ department: deptId })
        ]);

        const countBy = (arr, field) => arr.reduce((acc, x) => {
            const k = x[field] || 'unknown';
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {});

        const eventBudget = events.reduce((sum, e) => ({
            requested: sum.requested + (e.budget?.totalRequested || 0),
            approved:  sum.approved  + (e.budget?.totalApproved  || 0),
            utilized:  sum.utilized  + (e.budget?.totalUtilized  || 0)
        }), { requested: 0, approved: 0, utilized: 0 });

        const projectBudget = projects.reduce((sum, p) => ({
            requested: sum.requested + (p.budget?.totalRequested || 0),
            approved:  sum.approved  + (p.budget?.totalApproved  || 0),
            utilized:  sum.utilized  + (p.budget?.totalUtilized  || 0)
        }), { requested: 0, approved: 0, utilized: 0 });

        const certCount = certs.length;
        const internCount = interns.length;

        res.status(200).json({
            success: true,
            data: {
                department: { _id: department._id, name: department.name, code: department.code },
                generatedAt: new Date(),
                counts: {
                    students, teachers,
                    projects: projects.length,
                    clubs: clubs.length,
                    events: events.length,
                    certificates: certCount,
                    internships: internCount
                },
                projectsByStatus: countBy(projects, 'approvalStatus'),
                clubsByStatus: countBy(clubs, 'status'),
                eventsByStatus: countBy(events, 'status'),
                budget: {
                    events: eventBudget,
                    projects: projectBudget,
                    total: {
                        requested: eventBudget.requested + projectBudget.requested,
                        approved:  eventBudget.approved  + projectBudget.approved,
                        utilized:  eventBudget.utilized  + projectBudget.utilized
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error generating department report:', error);
        res.status(500).json({ success: false, message: 'Error generating department report', error: error.message });
    }
};

// @desc    Per-student rollup
// @route   GET /api/reports/student/:studentId
// @access  Private (Teacher / HOD / Admin / self)
exports.getStudentReport = async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await User.findById(studentId)
            .populate('department', 'name code')
            .populate('proctor', 'name email')
            .populate('classTeacher', 'name email')
            .select('-password');
        if (!student || student.role !== 'student') {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if ((req.user.role === 'teacher' || req.user.role === 'hod') &&
            !sameDept(req.user, student.department._id)) {
            return res.status(403).json({ success: false, message: 'Student is in another department' });
        }

        const [projects, certificates, internships, events] = await Promise.all([
            Project.find({
                $or: [{ createdBy: studentId }, { 'teamMembers.user': studentId }]
            }).populate('primaryMentor', 'name'),
            Certificate.find({ student: studentId }),
            Internship.find({ student: studentId }),
            Event.find({ 'participants.user': studentId, status: 'approved' }).select('title eventDate status')
        ]);

        res.status(200).json({
            success: true,
            data: {
                student,
                counts: {
                    projects: projects.length,
                    certificates: certificates.length,
                    internships: internships.length,
                    eventParticipations: events.length
                },
                projects,
                certificates,
                internships,
                events
            }
        });
    } catch (error) {
        console.error('Error generating student report:', error);
        res.status(500).json({ success: false, message: 'Error generating student report', error: error.message });
    }
};

// @desc    Budget aggregation for a department
// @route   GET /api/reports/budgets/department/:deptId
// @access  Private (HOD/Admin)
exports.getDepartmentBudgets = async (req, res) => {
    try {
        const { deptId } = req.params;
        if (!isHODOrAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (isHOD(req.user) && !sameDept(req.user, deptId)) {
            return res.status(403).json({ success: false, message: 'You can only view your own department' });
        }

        const yearFilter = req.query.year ? {
            $expr: { $eq: [{ $year: '$createdAt' }, Number(req.query.year)] }
        } : {};

        const [events, projects] = await Promise.all([
            Event.find({ department: deptId, ...yearFilter })
                .populate('createdBy', 'name email')
                .sort({ eventDate: -1 }),
            Project.find({ department: deptId, ...yearFilter })
                .populate('createdBy', 'name email')
                .populate('primaryMentor', 'name')
                .sort({ createdAt: -1 })
        ]);

        const sumBudgets = (arr) => arr.reduce((acc, item) => ({
            requested: acc.requested + (item.budget?.totalRequested || 0),
            approved:  acc.approved  + (item.budget?.totalApproved  || 0),
            utilized:  acc.utilized  + (item.budget?.totalUtilized  || 0)
        }), { requested: 0, approved: 0, utilized: 0 });

        const eventTotal   = sumBudgets(events.filter(e => e.budget));
        const projectTotal = sumBudgets(projects.filter(p => p.budget));

        res.status(200).json({
            success: true,
            data: {
                events: events.filter(e => e.budget && e.budget.totalRequested > 0).map(e => ({
                    _id: e._id,
                    title: e.title,
                    type: 'event',
                    status: e.status,
                    creator: e.createdBy,
                    date: e.eventDate,
                    budget: e.budget
                })),
                projects: projects.filter(p => p.budget && p.budget.totalRequested > 0).map(p => ({
                    _id: p._id,
                    title: p.title,
                    type: 'project',
                    status: p.approvalStatus,
                    creator: p.createdBy,
                    mentor: p.primaryMentor,
                    budget: p.budget
                })),
                totals: {
                    events: eventTotal,
                    projects: projectTotal,
                    combined: {
                        requested: eventTotal.requested + projectTotal.requested,
                        approved:  eventTotal.approved  + projectTotal.approved,
                        utilized:  eventTotal.utilized  + projectTotal.utilized
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error generating department budgets:', error);
        res.status(500).json({ success: false, message: 'Error generating department budgets', error: error.message });
    }
};