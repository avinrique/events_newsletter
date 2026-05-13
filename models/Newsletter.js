const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    heading: { type: String, required: true, trim: true, maxlength: 200 },
    body:    { type: String, required: true, maxlength: 8000 },
    order:   { type: Number, default: 0 }
}, { _id: false });

const newsletterSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide newsletter title'],
        trim: true,
        maxlength: 200
    },
    month: {
        type: Number,
        required: true,
        min: 0,
        max: 11
    },
    year: {
        type: Number,
        required: true,
        min: 2020,
        max: 2040
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    coverImage: { type: String },
    summary: { type: String, maxlength: 1000 },
    sections: [sectionSchema],
    teacherEventIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeacherEvent'
    }],
    eventIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedAt: Date
}, {
    timestamps: true
});

newsletterSchema.index({ department: 1, month: 1, year: 1 });
newsletterSchema.index({ department: 1, status: 1, year: -1, month: -1 });

module.exports = mongoose.model('Newsletter', newsletterSchema);
