const mongoose = require('mongoose');

const eventParticipationSchema = new mongoose.Schema({
    // BASIC EVENT INFORMATION
    eventName: {
        type: String,
        required: [true, 'Please provide event name'],
        trim: true
    },
    eventType: {
        type: String,
        enum: [
            'hackathon', 'coding-competition', 'technical-competition', 
            'conference', 'workshop', 'seminar', 'webinar',
            'bootcamp', 'certification-program', 'online-course',
            'innovation-contest', 'startup-competition', 'pitch-competition',
            'research-conference', 'symposium', 'summit',
            'networking-event', 'career-fair', 'industry-meetup',
            'open-source-contribution', 'community-event', 'other'
        ],
        required: true
    },
    description: {
        type: String,
        maxlength: 1000
    },
    
    // EVENT ORGANIZER
    organizer: {
        name: {
            type: String,
            required: [true, 'Please provide organizer name']
        },
        organization: String,
        website: String,
        email: String,
        type: {
            type: String,
            enum: ['company', 'university', 'startup', 'community', 'government', 'ngo', 'platform', 'other'],
            default: 'other'
        }
    },
    
    // EVENT TIMING
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    durationDays: {
        type: Number,
        required: true,
        min: 1,
        max: 365
    },
    durationHours: {
        type: Number,
        min: 1
    },
    timezone: {
        type: String,
        default: 'IST'
    },
    
    // LOCATION
    location: {
        type: {
            type: String,
            enum: ['online', 'offline', 'hybrid'],
            default: 'online'
        },
        venue: String,
        city: String,
        state: String,
        country: String,
        platform: String, // For online events: Zoom, Teams, etc.
        address: String
    },
    
    // PARTICIPATION DETAILS
    participationType: {
        type: String,
        enum: ['individual', 'team'],
        required: true
    },
    teamDetails: {
        teamName: String,
        teamSize: Number,
        teammates: [String], // Names of team members
        teamRole: String // Leader, Member, etc.
    },
    
    // REGISTRATION AND FEES
    registrationDetails: {
        registrationDate: Date,
        registrationFee: {
            amount: {
                type: Number,
                default: 0,
                min: 0
            },
            currency: {
                type: String,
                default: 'INR'
            },
            wasPaid: {
                type: Boolean,
                default: false
            }
        },
        registrationId: String,
        confirmationCode: String
    },
    
    // PARTICIPATION OUTCOME
    outcome: {
        participated: {
            type: Boolean,
            default: true
        },
        completionStatus: {
            type: String,
            enum: ['completed', 'partially-completed', 'did-not-attend', 'dropped-out'],
            default: 'completed'
        },
        achievement: {
            type: String,
            enum: [
                'winner', 'first-place', 'second-place', 'third-place',
                'runner-up', 'finalist', 'semi-finalist', 'quarter-finalist',
                'honorable-mention', 'special-recognition', 'best-innovation',
                'best-technical', 'best-presentation', 'peoples-choice',
                'participant', 'completion-certificate', 'attendance-certificate'
            ]
        },
        rank: Number,
        score: Number,
        totalParticipants: Number,
        prizeAmount: {
            amount: Number,
            currency: {
                type: String,
                default: 'INR'
            }
        }
    },
    
    // SKILLS AND LEARNING
    skillsGained: [String],
    technologiesUsed: [String],
    toolsUsed: [String],
    domainAreas: [String],
    learningOutcomes: [String],
    
    // PROJECT/SUBMISSION DETAILS (for hackathons/competitions)
    submissionDetails: {
        projectTitle: String,
        projectDescription: String,
        githubUrl: String,
        liveUrl: String,
        presentationUrl: String,
        videoUrl: String,
        documentUrl: String,
        technologies: [String],
        features: [String]
    },
    
    // CERTIFICATES AND DOCUMENTS
    certificates: [{
        type: {
            type: String,
            enum: ['participation', 'completion', 'achievement', 'winner', 'merit'],
            required: true
        },
        issuer: String,
        certificateNumber: String,
        issueDate: Date,
        verificationUrl: String,
        files: [{
            fileName: String,
            fileUrl: String,
            fileType: String,
            uploadDate: {
                type: Date,
                default: Date.now
            }
        }]
    }],
    
    // NETWORKING AND CONTACTS
    networking: {
        connectionsMode: Number,
        mentorsConnected: [String],
        industrialContacts: [String],
        peerConnections: [String],
        followUpOpportunities: [String]
    },
    
    // FEEDBACK AND EXPERIENCE
    feedback: {
        overallRating: {
            type: Number,
            min: 1,
            max: 5
        },
        organizationRating: {
            type: Number,
            min: 1,
            max: 5
        },
        contentQuality: {
            type: Number,
            min: 1,
            max: 5
        },
        learningValue: {
            type: Number,
            min: 1,
            max: 5
        },
        wouldRecommend: Boolean,
        detailedFeedback: String,
        suggestions: [String],
        bestAspects: [String],
        improvementAreas: [String]
    },
    
    // FOLLOW-UP OPPORTUNITIES
    opportunities: {
        jobOffers: [{
            company: String,
            role: String,
            offered: Boolean,
            accepted: Boolean,
            details: String
        }],
        internshipOffers: [{
            company: String,
            role: String,
            offered: Boolean,
            accepted: Boolean,
            details: String
        }],
        mentorshipOffers: [String],
        collaborationOffers: [String],
        futureEventInvitations: [String]
    },
    
    // APPROVAL WORKFLOW
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'requires-proof'],
        default: 'pending'
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
    rejectionReason: String,

    // VERIFICATION AND APPROVAL
    verification: {
        isVerified: {
            type: Boolean,
            default: false
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        verificationDate: Date,
        verificationNotes: String,
        requiresProof: {
            type: Boolean,
            default: false
        }
    },
    
    // SOCIAL MEDIA AND PUBLICITY
    socialMedia: {
        linkedInPost: String,
        twitterPost: String,
        instagramPost: String,
        blogPost: String,
        mediaLinks: [String]
    },
    
    // STUDENT INFORMATION
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // ACADEMIC INTEGRATION
    academicRelevance: {
        relatedCourses: [String],
        applicableSemesters: [Number],
        skillsRelevantToCurriculum: [String],
        canBeUsedForCredit: Boolean,
        facultyMentorAware: Boolean
    },
    
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    
    // METADATA
    tags: [String],
    isPublic: {
        type: Boolean,
        default: true
    },
    inspirationSource: String, // How student found about this event
    preparationTime: Number, // Days spent preparing
    preparationDetails: String,
    
    // IMPACT TRACKING
    impact: {
        careerImpact: String,
        academicImpact: String,
        skillDevelopmentImpact: String,
        networkingImpact: String,
        confidenceBoost: {
            type: Number,
            min: 1,
            max: 5
        },
        futureGoalsInfluence: String
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
eventParticipationSchema.index({ student: 1, eventType: 1 });
eventParticipationSchema.index({ department: 1 });
eventParticipationSchema.index({ startDate: 1, endDate: 1 });
eventParticipationSchema.index({ 'organizer.name': 1 });
eventParticipationSchema.index({ 'outcome.achievement': 1 });

// Virtual for calculating event duration
eventParticipationSchema.virtual('calculatedDuration').get(function() {
    if (this.endDate && this.startDate) {
        const diffTime = Math.abs(this.endDate - this.startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return this.durationDays;
});

// Pre-save middleware
eventParticipationSchema.pre('save', function(next) {
    // Auto-calculate duration if not provided
    if (this.startDate && this.endDate && !this.durationDays) {
        const diffTime = Math.abs(this.endDate - this.startDate);
        this.durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start day
    }
    
    // Set default end date if not provided
    if (this.startDate && !this.endDate && this.durationDays === 1) {
        this.endDate = this.startDate;
    }
    
    next();
});

module.exports = mongoose.model('EventParticipation', eventParticipationSchema);