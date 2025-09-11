// Script to export teacher event data in clean JSON format
const mongoose = require('mongoose');
require('dotenv').config();

const TeacherEvent = require('./models/TeacherEvent');

async function exportJSON() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/department_management');
        console.log('Connected to MongoDB\n');

        // Get all teacher events
        const events = await TeacherEvent.find().sort({ updatedAt: -1 });
        
        console.log(`Found ${events.length} teacher events\n`);
        console.log('='.repeat(80));
        console.log('TEACHER EVENTS JSON DATA');
        console.log('='.repeat(80));
        
        // Export as clean JSON
        console.log(JSON.stringify(events, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

exportJSON();