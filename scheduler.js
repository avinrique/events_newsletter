/**
 * Lightweight cron-lite for newsletter scheduling.
 *
 * Polls every 60 s for draft newsletters whose `scheduledFor` is in the past
 * and flips them to published. Idempotent: only matches `status: 'draft'` so
 * a newsletter is published at most once.
 *
 * Started from server.js after the Mongo connection is open.
 */
const Newsletter = require('./models/Newsletter');

const TICK_MS = 60 * 1000;

async function tick() {
    try {
        const now = new Date();
        const due = await Newsletter.find({
            status: 'draft',
            scheduledFor: { $ne: null, $lte: now }
        });
        if (!due.length) return;

        for (const n of due) {
            n.status = 'published';
            n.publishedAt = now;
            n.publishedBy = n.createdBy; // the original drafter
            // Clear the schedule so a future edit doesn't double-publish if status is reset somehow.
            n.scheduledFor = null;
            await n.save();
            console.log(`[scheduler] published "${n.title}" (#${n._id}) scheduled for ${due[0].scheduledFor}`);
        }
    } catch (err) {
        console.error('[scheduler] tick error:', err.message);
    }
}

function start() {
    // First tick after 5 s so the server has fully booted, then steady cadence.
    setTimeout(tick, 5000);
    setInterval(tick, TICK_MS);
    console.log('[scheduler] newsletter auto-publish tick every 60 s');
}

module.exports = { start, tick };
