const request = require('supertest');
const User = require('../../models/User');
const Department = require('../../models/Department');
const Designation = require('../../models/Designation');

// Create test users with different roles
const createTestUsers = async () => {
    // Create test department
    const department = await Department.create({
        name: 'Computer Science',
        code: 'CSE',
        description: 'Computer Science and Engineering Department'
    });

    // Create test designation
    const designation = await Designation.create({
        name: 'Professor',
        level: 1
    });

    // Create SuperAdmin
    const superAdmin = await User.create({
        name: 'Super Admin',
        email: 'superadmin@test.com',
        password: 'password123',
        role: 'superadmin'
    });

    // Create Admin
    const admin = await User.create({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        createdBy: superAdmin._id
    });

    // Create HOD (Teacher with HOD position)
    const hod = await User.create({
        name: 'HOD User',
        email: 'hod@test.com',
        password: 'password123',
        role: 'teacher',
        position: 'HOD',
        department: department._id,
        designation: designation._id,
        createdBy: admin._id
    });

    // Update department with HOD
    await Department.findByIdAndUpdate(department._id, { hod: hod._id });

    // Create Teacher
    const teacher = await User.create({
        name: 'Teacher User',
        email: 'teacher@test.com',
        password: 'password123',
        role: 'teacher',
        department: department._id,
        designation: designation._id,
        createdBy: admin._id
    });

    // Create Student
    const student = await User.create({
        name: 'Student User',
        email: 'student@test.com',
        password: 'password123',
        role: 'student',
        department: department._id,
        usn: 'CSE21001',
        rollNumber: '21CS001',
        semester: 6,
        proctor: teacher._id,
        classTeacher: teacher._id,
        createdBy: admin._id
    });

    return {
        department,
        designation,
        users: {
            superAdmin,
            admin,
            hod,
            teacher,
            student
        }
    };
};

// Login helper function
const loginUser = async (app, email, password = 'password123') => {
    const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
    
    if (response.status !== 200) {
        throw new Error(`Login failed for ${email}: ${response.body.message}`);
    }
    
    return {
        token: response.body.token,
        user: response.body.user
    };
};

// Get auth headers with token
const getAuthHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
});

// Create authenticated request helper
const authenticatedRequest = (app, method, url, token) => {
    return request(app)[method](url)
        .set('Authorization', `Bearer ${token}`);
};

// Test all role permissions for an endpoint
const testRolePermissions = async (app, tokens, method, url, expectedPermissions) => {
    const results = {};
    
    for (const [role, token] of Object.entries(tokens)) {
        const response = await request(app)[method](url)
            .set('Authorization', `Bearer ${token}`);
        
        results[role] = {
            status: response.status,
            allowed: expectedPermissions.includes(role) ? response.status < 400 : response.status >= 400
        };
    }
    
    return results;
};

// Initialize test data and get tokens for all roles
const setupTestAuth = async (app) => {
    const testData = await createTestUsers();
    
    // Login all users to get tokens
    const tokens = {};
    for (const [role, user] of Object.entries(testData.users)) {
        const loginData = await loginUser(app, user.email);
        tokens[role] = loginData.token;
    }
    
    return {
        ...testData,
        tokens
    };
};

// Clean up test data
const cleanupTestData = async () => {
    await User.deleteMany({});
    await Department.deleteMany({});
    await Designation.deleteMany({});
};

module.exports = {
    createTestUsers,
    loginUser,
    getAuthHeaders,
    authenticatedRequest,
    testRolePermissions,
    setupTestAuth,
    cleanupTestData
};