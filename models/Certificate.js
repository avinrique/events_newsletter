const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    // STUDENT INPUT FIELDS (matching student form exactly)
    title: {
        type: String,
        required: [true, 'Please provide certificate title'],
        trim: true
    },
    issuer: {
        type: String,
        required: [true, 'Please provide issuer name'],
        trim: true
    },
    organization: {
        type: String,
        trim: true
    },
    startDate: {
        type: Date
    },
    completionDate: {
        type: Date,
        required: true
    },
    issueDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date
    },
    description: {
        type: String,
        maxlength: 500
    },
    certificateUrl: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                // Either certificateUrl or files must be provided
                return v || (this.files && this.files.length > 0);
            },
            message: 'Either certificate URL or uploaded file is required'
        }
    },
    
    // FILE ATTACHMENTS (for file uploads)
    files: [{
        fileName: String,
        fileUrl: String,
        fileType: {
            type: String,
            enum: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'other']
        },
        fileSize: Number,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],
    
    // SYSTEM FIELDS (required for the application to work)
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ownerType: {
        type: String,
        enum: ['student', 'teacher'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    approvals: [{
        approver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        approverRole: String,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        comments: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    rejectionReason: String
}, {
    timestamps: true
});

// Indexes for performance
certificateSchema.index({ owner: 1, status: 1 });
certificateSchema.index({ department: 1, status: 1 });
certificateSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Certificate', certificateSchema);