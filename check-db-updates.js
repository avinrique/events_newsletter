// Quick script to check database updates
const mongoose = require('mongoose');
require('dotenv').config();

const teacherEventSchema = new mongoose.Schema({}, { strict: false });
const TeacherEvent = mongoose.model('TeacherEvent', teacherEventSchema);

async function checkUpdates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/department_management');
        console.log('Connected to MongoDB');

        const eventId = '68c2c4d3dd2359d52c239b9f'; // The ID from your logs
        const event = await TeacherEvent.findById(eventId);
        
        if (event) {
            console.log('📊 Current event data:');
            console.log('Title:', event.title);
            console.log('Description:', event.description?.substring(0, 100) + '...');
            console.log('Document Content:', event.documentContent ? 'EXISTS' : 'NOT EXISTS');
            console.log('Images count:', event.images?.length || 0);
            console.log('Updated at:', event.updatedAt);
        } else {
            console.log('❌ Event not found');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUpdates();