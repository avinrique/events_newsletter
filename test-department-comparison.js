// Test department comparison issue  
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const TeacherEvent = require('./models/TeacherEvent');

async function testDepartmentComparison() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/department_management');
        console.log('Connected to MongoDB\n');

        // Get a teacher
        const teacher = await User.findOne({ role: 'teacher' }).populate('department');
        
        if (!teacher) {
            console.log('❌ No teacher found');
            process.exit(1);
        }
        
        // Create a test event
        const testEvent = await TeacherEvent.create({
            title: 'Test Department Comparison',
            description: 'Testing department comparison',
            eventDate: new Date(),
            createdBy: teacher._id,
            department: teacher.department._id
        });
        
        console.log('✅ Created test event');
        
        // Fetch event WITH populate (like in getTeacherEvent)
        const eventWithPopulate = await TeacherEvent.findById(testEvent._id)
            .populate('department', 'name');
            
        console.log('\n🔍 Event WITH populate:');
        console.log('  event.department:', eventWithPopulate.department);
        console.log('  event.department type:', typeof eventWithPopulate.department);
        console.log('  event.department._id:', eventWithPopulate.department._id);
        console.log('  event.department._id type:', typeof eventWithPopulate.department._id);
        
        // Fetch event WITHOUT populate
        const eventWithoutPopulate = await TeacherEvent.findById(testEvent._id);
        
        console.log('\n🔍 Event WITHOUT populate:');
        console.log('  event.department:', eventWithoutPopulate.department);
        console.log('  event.department type:', typeof eventWithoutPopulate.department);
        
        console.log('\n👤 Teacher department:');
        console.log('  req.user.department:', teacher.department._id);
        console.log('  req.user.department type:', typeof teacher.department._id);
        
        // Test the comparison that might be failing
        console.log('\n🔧 Testing comparisons:');
        
        // This is what the current code does (MIGHT FAIL)
        try {
            const comparison1 = eventWithPopulate.department._id.toString() === teacher.department._id.toString();
            console.log('  ✅ eventWithPopulate.department._id.toString() === teacher.department._id.toString():', comparison1);
        } catch (error) {
            console.log('  ❌ eventWithPopulate.department._id comparison failed:', error.message);
        }
        
        // This is what it should be (SAFE)
        try {
            const eventDeptId = eventWithPopulate.department._id || eventWithPopulate.department;
            const comparison2 = eventDeptId.toString() === teacher.department._id.toString();
            console.log('  ✅ Safe comparison result:', comparison2);
        } catch (error) {
            console.log('  ❌ Safe comparison failed:', error.message);
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

testDepartmentComparison();