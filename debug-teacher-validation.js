// Debug teacher validation issue
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Department = require('./models/Department');

async function debugTeacherValidation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/department_management');
        console.log('Connected to MongoDB\n');

        // Get all teachers like the frontend does
        const allTeachers = await User.find({ 
            role: 'teacher',
            isActive: true
        }).select('name email department position')
          .populate('department', 'name code')
          .sort({ name: 1 });
          
        console.log('📋 ALL ACTIVE TEACHERS FROM getDepartmentUsers:');
        console.log('Count:', allTeachers.length);
        allTeachers.forEach((teacher, i) => {
            console.log(`  ${i + 1}. ${teacher.name} (${teacher._id}) - Dept: ${teacher.department?.name || 'No dept'} - Active: ${teacher.isActive !== false}`);
        });
        
        // Get ALL teachers (including inactive)
        const allTeachersIncInactive = await User.find({ 
            role: 'teacher'
        }).select('name email department position isActive')
          .populate('department', 'name code')
          .sort({ name: 1 });
          
        console.log('\n📋 ALL TEACHERS (INCLUDING INACTIVE):');
        console.log('Count:', allTeachersIncInactive.length);
        allTeachersIncInactive.forEach((teacher, i) => {
            const status = teacher.isActive === false ? '❌ INACTIVE' : '✅ ACTIVE';
            console.log(`  ${i + 1}. ${teacher.name} (${teacher._id}) - ${status} - Dept: ${teacher.department?.name || 'No dept'}`);
        });
        
        // Test the validation query that createTeacherEvent uses
        if (allTeachers.length > 0) {
            const sampleTeacherIds = allTeachers.slice(0, 3).map(t => t._id);
            console.log('\n🔍 TESTING VALIDATION QUERY:');
            console.log('Sample teacher IDs:', sampleTeacherIds);
            
            const validationResult = await User.find({ 
                _id: { $in: sampleTeacherIds }, 
                role: 'teacher',
                isActive: true
            });
            
            console.log('Validation query returned:', validationResult.length, 'teachers');
            console.log('Expected:', sampleTeacherIds.length, 'teachers');
            
            if (validationResult.length !== sampleTeacherIds.length) {
                console.log('❌ VALIDATION WOULD FAIL!');
                
                // Find which IDs failed
                const foundIds = validationResult.map(t => t._id.toString());
                const missingIds = sampleTeacherIds.filter(id => !foundIds.includes(id.toString()));
                console.log('Missing teacher IDs:', missingIds);
                
                // Check what's wrong with missing IDs
                for (const missingId of missingIds) {
                    const teacher = await User.findById(missingId);
                    if (teacher) {
                        console.log(`Missing teacher ${missingId}: role=${teacher.role}, isActive=${teacher.isActive}`);
                    } else {
                        console.log(`Missing teacher ${missingId}: NOT FOUND IN DATABASE`);
                    }
                }
            } else {
                console.log('✅ Validation would PASS');
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

debugTeacherValidation();