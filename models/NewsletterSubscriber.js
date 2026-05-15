const mongoose = require('mongoose');
const crypto = require('crypto');

const newsletterSubscriberSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email address']
    },
    name: { type: String, trim: true, maxlength: 200 },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    unsubscribeToken: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomBytes(20).toString('hex')
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// One row per (email, department) pair.
newsletterSubscriberSchema.index({ email: 1, department: 1 }, { unique: true });

module.exports = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);
