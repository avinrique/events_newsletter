const mongoose = require('mongoose');

const teacherEventSchema = new mongoose.Schema({
    // BASIC EVENT INFORMATION
    title: {
        type: String,
        required: [true, 'Please provide event title'],
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: [true, 'Please provide event description'],
        maxlength: 5000
    },
    eventDate: {
        type: Date,
        required: [true, 'Please provide event date']
    },
    
    // EVENT IMAGES
    images: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],
    
    // PARTICIPANTS
    studentsInvolved: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    teachersInvolved: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'  
    }],
    
    // OUTCOME/RESULTS
    outcome: {
        type: String,
        maxlength: 3000
    },
    
    // STRUCTURED DOCUMENT CONTENT
    documentContent: [{
        id: String,
        type: {
            type: String,
            enum: ['title', 'description', 'date', 'teacher', 'student', 'image', 'small'],
            default: 'description'
        },
        content: String,
        imageUrl: String, // Keep for backward compatibility
        imageUrls: [String], // Support multiple image URLs
        order: Number
    }],
    
    // SYSTEM FIELDS
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'completed', 'cancelled'],
        default: 'published'
    }
}, {
    timestamps: true
});

// Index for performance
teacherEventSchema.index({ createdBy: 1, department: 1 });
teacherEventSchema.index({ department: 1, status: 1 });
teacherEventSchema.index({ eventDate: -1 });

module.exports = mongoose.model('TeacherEvent', teacherEventSchema);