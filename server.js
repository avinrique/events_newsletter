const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

// Database connection — the test suite manages its own in-memory MongoDB,
// so skip this call under NODE_ENV=test.
const connectDB = require('./config/database');
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Disable caching for development
app.use(express.static('public', {
    etag: false,
    maxAge: 0,
    setHeaders: function (res, path, stat) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
}));
app.use('/uploads', express.static('uploads'));

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const studentRoutes = require('./routes/student.routes');
const departmentRoutes = require('./routes/department.routes');
const clubRoutes = require('./routes/club.routes');
const eventRoutes = require('./routes/event.routes');
const projectRoutes = require('./routes/project.routes');
const certificateRoutes = require('./routes/certificate.routes');
const internshipRoutes = require('./routes/internship.routes');
const teacherEventRoutes = require('./routes/teacherEvents');
const eventParticipationRoutes = require('./routes/eventParticipation.routes');
const reportRoutes = require('./routes/report.routes');
const newsletterRoutes = require('./routes/newsletter.routes');
const newsletterApiRoutes = require('./routes/newsletterApi.routes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/teacher-events', teacherEventRoutes);
app.use('/api/event-participations', eventParticipationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/newsletters', newsletterApiRoutes);

// Newsletter HTML page + legacy public APIs
app.use('/newsletter', newsletterRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Role-specific dashboard routes
app.get('/superadmin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'superadmin.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/hod', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'hod.html'));
});

app.get('/teacher', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'teacher.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'student.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});
const PORT = process.env.PORT || 3000;

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;