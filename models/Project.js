const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['leader', 'member', 'mentor', 'guide', 'supervisor'],
        default: 'member'
    },
    contribution: String,
    joinDate: {
        type: Date,
        default: Date.now
    }
});

const budgetCategorySchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ['equipment', 'software', 'materials', 'services', 'travel', 'publication', 'other'],
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

const outcomeSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['prototype', 'paper', 'product', 'patent', 'thesis', 'presentation', 'other'],
        required: true
    },
    title: String,
    description: String,
    url: String,
    dateAchieved: Date,
    impact: String
});

const projectSchema = new mongoose.Schema({
    // BASIC PROJECT INFORMATION
    title: {
        type: String,
        required: [true, 'Please provide project title'],
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: [true, 'Please provide project description'],
        maxlength: 2000
    },
    
    // PROJECT CATEGORY - Determines workflow and requirements
    projectCategory: {
        type: String,
        enum: ['student-project', 'teacher-project', 'teacher-student-project'],
        required: true
    },
    
    // STUDENT PROJECT SPECIFIC
    studentProjectType: {
        type: String,
        enum: ['mini', 'major', 'personal', 'internship', 'final-year'],
        required: function() {
            return this.projectCategory === 'student-project' || this.projectCategory === 'teacher-student-project';
        }
    },
    
    // TEACHER PROJECT SPECIFIC
    teacherProjectType: {
        type: String,
        enum: ['research', 'consultancy', 'funded', 'collaborative', 'innovation'],
        required: function() {
            return this.projectCategory === 'teacher-project' || this.projectCategory === 'teacher-student-project';
        }
    },
    
    domain: {
        type: String,
        required: true
    },
    subDomain: String,
    abstract: {
        type: String,
        maxlength: 2000
    },
    objectives: [String],
    methodology: String,
    expectedOutcome: String,
    
    // TEAM COMPOSITION
    teamMembers: [teamMemberSchema],
    
    // Primary mentor/supervisor (optional for all projects)
    primaryMentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Co-mentors/guides
    coMentors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // External collaborators (industry/other institutions)
    externalCollaborators: [{
        name: String,
        organization: String,
        role: String,
        contactInfo: String
    }],
    
    // PROJECT TIMELINE
    timeline: {
        proposalDate: Date,
        approvalDate: Date,
        startDate: {
            type: Date,
            required: true
        },
        expectedEndDate: Date,
        actualEndDate: Date,
        milestones: [{
            title: String,
            description: String,
            targetDate: Date,
            completionDate: Date,
            status: {
                type: String,
                enum: ['pending', 'in-progress', 'completed', 'delayed'],
                default: 'pending'
            }
        }]
    },
    
    // PROJECT STATUS AND PROGRESS
    currentStatus: {
        type: String,
        enum: ['proposal', 'approved', 'in-progress', 'completed', 'suspended', 'cancelled'],
        default: 'proposal'
    },
    
    // Approval workflow status
    approvalStatus: {
        type: String,
        enum: ['pending-approval', 'approved', 'rejected', 'revision-required'],
        default: 'pending-approval'
    },
    
    // Progress tracking
    progress: {
        completionPercentage: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        },
        progressReports: [{
            reportDate: Date,
            summary: String,
            achievements: String,
            challenges: String,
            nextSteps: String,
            reportedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }]
    },
    
    // TECHNICAL DETAILS
    technicalDetails: {
        technologies: [String],
        platforms: [String],
        programmingLanguages: [String],
        frameworks: [String],
        databases: [String],
        tools: [String]
    },
    
    // PROJECT RESOURCES
    resources: {
        references: [String],
        datasets: [String],
        equipmentUsed: [String],
        softwareLicenses: [String]
    },
    
    // METADATA
    keywords: [String],
    tags: [String],
    visibility: {
        type: String,
        enum: ['public', 'department', 'private'],
        default: 'department'
    },
    
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    
    // BUDGET AND FUNDING
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
        categories: [budgetCategorySchema]
    },
    
    // Funding sources
    fundingSources: [{
        source: {
            type: String,
            enum: ['institution', 'government', 'industry', 'research-grant', 'self-funded']
        },
        amount: Number,
        grantNumber: String,
        agency: String
    }],
    
    // PROJECT DELIVERABLES AND OUTCOMES
    deliverables: [{
        title: String,
        description: String,
        type: {
            type: String,
            enum: ['report', 'prototype', 'software', 'hardware', 'documentation', 'presentation']
        },
        status: {
            type: String,
            enum: ['planned', 'in-progress', 'completed', 'delivered'],
            default: 'planned'
        },
        dueDate: Date,
        completionDate: Date,
        fileUrl: String
    }],
    
    outcomes: [outcomeSchema],
    
    // PROJECT FILES AND DOCUMENTATION
    files: {
        proposal: {
            fileName: String,
            fileUrl: String,
            uploadDate: Date
        },
        reports: [{
            fileName: String,
            fileUrl: String,
            type: String, // interim, final, progress
            uploadDate: Date
        }],
        presentations: [{
            fileName: String,
            fileUrl: String,
            uploadDate: Date
        }],
        codeRepository: {
            url: String,
            platform: String // github, gitlab, bitbucket
        },
        documentation: [{
            fileName: String,
            fileUrl: String,
            type: String,
            uploadDate: Date
        }]
    },
    
    // EVALUATION AND FEEDBACK
    evaluation: {
        midtermGrade: Number,
        finalGrade: Number,
        feedbackFromMentor: String,
        feedbackFromIndustry: String,
        selfAssessment: String,
        peersEvaluation: String
    },
    
    // PUBLICATION AND DISSEMINATION
    publications: [{
        title: String,
        authors: [String],
        venue: String, // conference/journal name
        type: {
            type: String,
            enum: ['conference', 'journal', 'workshop', 'poster']
        },
        status: {
            type: String,
            enum: ['submitted', 'accepted', 'published', 'rejected']
        },
        publicationDate: Date,
        doi: String,
        url: String
    }],
    
    // INTELLECTUAL PROPERTY
    intellectualProperty: {
        hasIP: {
            type: Boolean,
            default: false
        },
        patents: [{
            title: String,
            applicationNumber: String,
            status: String,
            filingDate: Date
        }],
        copyrights: [String],
        trademarks: [String]
    },
    
    // INDUSTRY COLLABORATION
    industryPartnership: {
        hasPartnership: {
            type: Boolean,
            default: false
        },
        partners: [{
            companyName: String,
            contactPerson: String,
            role: String,
            contribution: String
        }]
    },
    
    // SYSTEM FIELDS
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Approval chain
    approvedBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: String, // mentor, hod, dean
        approvalDate: Date,
        comments: String
    }],
    
    rejectedBy: {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rejectionDate: Date,
        reason: String
    }
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
    if (this.timeline.startDate && this.timeline.actualEndDate) {
        const diffTime = Math.abs(this.timeline.actualEndDate - this.timeline.startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    return null;
});

// Virtual for budget utilization percentage
projectSchema.virtual('budgetUtilizationPercentage').get(function() {
    if (this.budget.totalApproved > 0) {
        return (this.budget.totalUtilized / this.budget.totalApproved) * 100;
    }
    return 0;
});

// Indexes for performance
projectSchema.index({ createdBy: 1, currentStatus: 1 });
projectSchema.index({ department: 1, currentStatus: 1 });
projectSchema.index({ projectCategory: 1, studentProjectType: 1 });
projectSchema.index({ 'timeline.startDate': 1, 'timeline.expectedEndDate': 1 });
projectSchema.index({ approvalStatus: 1 });

// Text search index
projectSchema.index({
    title: 'text',
    description: 'text',
    keywords: 'text',
    domain: 'text'
});

module.exports = mongoose.model('Project', projectSchema);