// Test script to verify teacher permissions
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const TeacherEvent = require('./models/TeacherEvent');
const Department = require('./models/Department');

async function testPermissions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/department_management');
        console.log('Connected to MongoDB\n');

        // Get first regular teacher (not HOD) and department  
        const teacher = await User.findOne({ 
            role: 'teacher', 
            $or: [
                { position: { $ne: 'HOD' } },
                { position: { $exists: false } }
            ]
        }).populate('department');
        const department = await Department.findOne();
        
        if (!teacher || !department) {
            console.log('❌ No teacher or department found in database');
            process.exit(1);
        }
        
        console.log('📋 Found Teacher:');
        console.log('  Name:', teacher.name);
        console.log('  Role:', teacher.role);
        console.log('  Position:', teacher.position);
        console.log('  Department ID:', teacher.department);
        console.log('  Department Name:', teacher.department?.name);
        
        // Create a test event
        const testEvent = await TeacherEvent.create({
            title: 'Test Teacher Event',
            description: 'Testing teacher permissions',
            eventDate: new Date(),
            createdBy: teacher._id,
            department: teacher.department._id
        });
        
        console.log('\n✅ Created test event:', testEvent._id);
        
        // Test the query that getAllTeacherEvents uses
        let query = { department: teacher.department._id };
        
        // If regular teacher, only show their own events
        if (teacher.role === 'teacher' && teacher.position !== 'HOD') {
            query.createdBy = teacher._id;
        }
        
        console.log('\n🔍 Query being used:', query);
        
        const events = await TeacherEvent.find(query)
            .populate('createdBy', 'name email')
            .populate('department', 'name');
            
        console.log('\n📊 Events found:', events.length);
        if (events.length > 0) {
            console.log('✅ Teacher CAN see their event');
            console.log('Event details:');
            console.log('  Title:', events[0].title);
            console.log('  Created by:', events[0].createdBy.name);
            console.log('  Department:', events[0].department.name);
        } else {
            console.log('❌ Teacher CANNOT see their event - Permission issue!');
        }
        
        // Clean up
        await TeacherEvent.findByIdAndDelete(testEvent._id);
        console.log('\n🧹 Cleaned up test event');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testPermissions();