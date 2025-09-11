const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    participantType: {
        type: String,
        enum: ['student', 'teacher', 'external'],
        required: true
    },
    externalDetails: {
        name: String,
        organization: String,
        email: String,
        phone: String
    },
    role: {
        type: String,
        enum: ['organizer', 'speaker', 'participant', 'judge', 'coordinator'],
        default: 'participant'
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    attended: {
        type: Boolean,
        default: false
    }
});

const budgetSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ['venue', 'food', 'materials', 'prizes', 'speaker', 'transport', 'other'],
        required: true
    },
    description: String,
    requested: {
        type: Number,
        required: true,
        min: 0
    },
    approved: {
        type: Number,
        default: 0,
        min: 0
    },
    utilized: {
        type: Number,
        default: 0,
        min: 0
    }
});

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide event title'],
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: [true, 'Please provide event description'],
        maxlength: 2000
    },
    eventType: {
        type: String,
        enum: ['club-event', 'personal-teacher-event', 'joint-teacher-event'],
        required: true
    },
    eventCategory: {
        type: String,
        enum: ['academic', 'cultural', 'technical', 'sports', 'social', 'workshop', 'seminar', 'competition'],
        required: true
    },
    venue: {
        type: String,
        required: true,
        trim: true
    },
    eventDate: {
        type: Date,
        required: [true, 'Please provide event date']
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    expectedParticipants: {
        type: Number,
        min: 1
    },
    registrationRequired: {
        type: Boolean,
        default: false
    },
    registrationDeadline: Date,
    participants: [participantSchema],
    organizers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    club: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Club'
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvalDate: Date,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionDate: Date,
    rejectionReason: String,
    budget: {
        totalRequested: {
            type: Number,
            default: 0,
            min: 0
        },
        totalApproved: {
            type: Number,
            default: 0,
            min: 0
        },
        totalUtilized: {
            type: Number,
            default: 0,
            min: 0
        },
        categories: [budgetSchema]
    },
    images: [{
        fileName: String,
        fileUrl: String,
        uploadDate: Date
    }],
    documents: [{
        fileName: String,
        fileUrl: String,
        documentType: String,
        uploadDate: Date
    }],
    feedback: {
        overallRating: {
            type: Number,
            min: 1,
            max: 5
        },
        comments: [String],
        suggestions: [String]
    },
    outcome: {
        summary: String,
        achievements: [String],
        challenges: [String],
        lessonsLearned: [String],
        futureRecommendations: [String]
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
eventSchema.index({ createdBy: 1, status: 1 });
eventSchema.index({ department: 1, status: 1 });
eventSchema.index({ eventDate: -1 });
eventSchema.index({ club: 1, status: 1 });

module.exports = mongoose.model('Event', eventSchema);