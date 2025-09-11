// Script to inspect teacher event data structure
const mongoose = require('mongoose');
require('dotenv').config();

// Use the actual TeacherEvent model
const TeacherEvent = require('./models/TeacherEvent');

async function inspectData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/department_management');
        console.log('🔍 Connected to MongoDB\n');

        // Get the most recent teacher event (without populate to avoid schema issues)
        const event = await TeacherEvent.findOne().sort({ updatedAt: -1 });
        
        if (event) {
            console.log('📋 TEACHER EVENT DATA STRUCTURE:');
            console.log('=====================================\n');
            
            console.log('📌 BASIC INFO:');
            console.log('  Title:', event.title);
            console.log('  Description:', event.description?.substring(0, 100) + '...');
            console.log('  Event Date:', event.eventDate);
            console.log('  Status:', event.status);
            console.log('  Outcome:', event.outcome || 'Not set');
            console.log('  Created At:', event.createdAt);
            console.log('  Updated At:', event.updatedAt);
            console.log();
            
            console.log('👤 CREATED BY (ObjectId):');
            console.log('  ID:', event.createdBy);
            console.log();
            
            console.log('🏢 DEPARTMENT (ObjectId):');
            console.log('  ID:', event.department);
            console.log();
            
            console.log('👨‍🏫 TEACHERS INVOLVED (' + (event.teachersInvolved?.length || 0) + ' ObjectIds):');
            if (event.teachersInvolved?.length > 0) {
                event.teachersInvolved.forEach((teacherId, i) => {
                    console.log(`  ${i + 1}. ${teacherId}`);
                });
            } else {
                console.log('  None');
            }
            console.log();
            
            console.log('👨‍🎓 STUDENTS INVOLVED (' + (event.studentsInvolved?.length || 0) + ' ObjectIds):');
            if (event.studentsInvolved?.length > 0) {
                event.studentsInvolved.forEach((studentId, i) => {
                    console.log(`  ${i + 1}. ${studentId}`);
                });
            } else {
                console.log('  None');
            }
            console.log();
            
            console.log('🖼️ IMAGES (' + (event.images?.length || 0) + '):');
            if (event.images?.length > 0) {
                event.images.forEach((image, i) => {
                    console.log(`  ${i + 1}. ${image.fileName}`);
                    console.log(`     URL: ${image.fileUrl}`);
                    console.log(`     Type: ${image.fileType}`);
                    console.log(`     Size: ${(image.fileSize / 1024).toFixed(1)} KB`);
                    console.log(`     Uploaded: ${image.uploadDate}`);
                    console.log();
                });
            } else {
                console.log('  None');
            }
            
            console.log('📄 DOCUMENT CONTENT (' + (event.documentContent?.length || 0) + ' items):');
            if (event.documentContent?.length > 0) {
                event.documentContent.forEach((item, i) => {
                    console.log(`  ${i + 1}. Type: ${item.type.toUpperCase()}`);
                    if (item.content) {
                        const preview = item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content;
                        console.log(`     Content: ${preview}`);
                    }
                    if (item.imageUrl) {
                        console.log(`     Image URL: ${item.imageUrl}`);
                    }
                    console.log(`     Order: ${item.order || 'Not set'}`);
                    console.log();
                });
            } else {
                console.log('  None - using legacy format');
            }
            
            console.log('🔧 RAW MONGODB DOCUMENT:');
            console.log('========================');
            console.log(JSON.stringify({
                _id: event._id,
                title: event.title,
                description: event.description?.substring(0, 100) + '...',
                eventDate: event.eventDate,
                studentsInvolved: event.studentsInvolved,
                teachersInvolved: event.teachersInvolved,
                outcome: event.outcome,
                documentContent: event.documentContent,
                images: event.images,
                createdBy: event.createdBy,
                department: event.department,
                status: event.status,
                createdAt: event.createdAt,
                updatedAt: event.updatedAt
            }, null, 2));
            
        } else {
            console.log('❌ No teacher events found in database');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

inspectData();