const fs = require('fs');
const path = require('path');

// Ensure all multer destination directories exist before any route boots.
// Multer's diskStorage will 500 on first upload if these are missing on a
// fresh checkout. Idempotent thanks to { recursive: true }.
const UPLOAD_DIRS = [
    'uploads',
    'uploads/certificates',
    'uploads/internships',
    'uploads/profiles',
    'uploads/projects',
    'uploads/teacher-events'
];

UPLOAD_DIRS.forEach(dir => {
    fs.mkdirSync(path.join(__dirname, '..', dir), { recursive: true });
});

module.exports = { UPLOAD_DIRS };
