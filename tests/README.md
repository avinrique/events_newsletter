# Test Suite Documentation

## Overview

This directory contains comprehensive test suites for the Academic Department Management System API. The tests cover all endpoints with proper authentication, authorization, and business logic validation.

## Test Structure

### Test Files

1. **auth.test.js** - Authentication endpoints (login, profile, password updates)
2. **users.test.js** - User management (CRUD, role assignments, permissions)
3. **departments.test.js** - Department and designation management
4. **clubs.test.js** - Club creation, approval, and membership
5. **projects.test.js** - Project management and approval workflows
6. **certificates.test.js** - Certificate upload and approval
7. **internships.test.js** - Internship record management
8. **students.test.js** - Student-specific routes (teacher/student selection)
9. **eventParticipations.test.js** - External event participation tracking

### Test Helpers

- **setup.js** - Jest configuration and database setup
- **helpers/auth.js** - Authentication utilities and test data creation

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test auth.test.js
npm test users.test.js
# etc.
```

## Test Database

- Uses **MongoDB Memory Server** for isolated testing
- Each test gets a fresh database instance
- No impact on development/production data
- Automatic cleanup after each test

## Test Data

### Default Test Users Created:
- **SuperAdmin**: superadmin@test.com / password123
- **Admin**: admin@test.com / password123
- **HOD**: hod@test.com / password123 (Teacher with HOD position)
- **Teacher**: teacher@test.com / password123
- **Student**: student@test.com / password123

### Test Department:
- **Name**: Computer Science
- **Code**: CSE
- **HOD**: Assigned to test HOD user

### Test Designation:
- **Name**: Professor
- **Level**: 1

## Authentication Testing

Each test file includes comprehensive authentication and authorization testing:

### Authentication Tests
- ✅ Valid login with correct credentials
- ✅ Login rejection for invalid credentials
- ✅ Token validation and refresh
- ✅ Password updates and validation
- ✅ Profile updates

### Authorization Tests
- ✅ Role-based access control
- ✅ Department isolation enforcement
- ✅ Resource ownership validation
- ✅ Special permissions (HOD dual role)

## Business Logic Testing

### User Management
- ✅ Role creation restrictions (SuperAdmin → Admin, Admin → Teacher/Student)
- ✅ HOD assignment and department linking
- ✅ Proctor/Class Teacher relationships
- ✅ User activation/deactivation

### Club Management
- ✅ Club creation and approval workflow
- ✅ Student membership management
- ✅ Role assignments (President, Secretary, etc.)
- ✅ Department-scoped access

### Project Management
- ✅ Project types (personal, mini, major)
- ✅ Team member management
- ✅ Mentor assignment
- ✅ Approval workflows

### Certificate Management
- ✅ Student certificates require approval
- ✅ Teacher certificates auto-approved
- ✅ File upload validation
- ✅ Expiry date validation

### Internship Management
- ✅ Company and position tracking
- ✅ Stipend and duration validation
- ✅ Document upload (offer/joining letters)
- ✅ Approval workflows

## Validation Testing

### Field Validation
- ✅ Required field checking
- ✅ Email format validation
- ✅ Password strength requirements
- ✅ Date format and range validation
- ✅ Enum value validation

### File Upload Validation
- ✅ File type restrictions
- ✅ File size limits
- ✅ Multiple file handling

### Business Rule Validation
- ✅ Unique constraints (email, club names)
- ✅ Date range validation (start < end)
- ✅ Numeric range validation (team size, duration)

## Error Handling Testing

- ✅ 400 Bad Request (validation errors)
- ✅ 401 Unauthorized (missing/invalid tokens)
- ✅ 403 Forbidden (insufficient permissions)
- ✅ 404 Not Found (missing resources)
- ✅ 500 Internal Server Error (server errors)

## Coverage Goals

The test suite aims for:
- **90%+ Line Coverage** - Most code paths tested
- **85%+ Branch Coverage** - Most conditional logic tested
- **100% Route Coverage** - All endpoints tested
- **100% Authentication Coverage** - All auth scenarios tested

## Best Practices Used

### Test Organization
- Clear test descriptions
- Proper setup/teardown
- Isolated test cases
- Grouped related tests

### Data Management
- Fresh data for each test
- Proper cleanup after tests
- Realistic test data
- Edge case coverage

### Assertion Quality
- Specific assertions
- Error message validation
- Response structure validation
- Business logic verification

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- Fast execution (in-memory database)
- No external dependencies
- Deterministic results
- Comprehensive coverage

## Troubleshooting

### Common Issues

1. **MongoDB Connection Errors**
   - Ensure MongoDB Memory Server is installed
   - Check Node.js version compatibility

2. **Test Timeouts**
   - Increase Jest timeout if needed
   - Check for unhandled promises

3. **Authentication Failures**
   - Verify test user creation
   - Check JWT token generation

4. **Port Conflicts**
   - Tests use in-memory database (no port conflicts)
   - Server doesn't start in test mode

### Debug Mode
```bash
# Run with debug output
DEBUG=* npm test

# Run specific test with console output
npm test -- --verbose auth.test.js
```

## Contributing

When adding new features:

1. **Add corresponding tests**
2. **Test all user roles**
3. **Include validation tests**
4. **Test error scenarios**
5. **Update documentation**

### Test Template
```javascript
describe('New Feature Endpoints', () => {
    let testData;

    beforeEach(async () => {
        await cleanupTestData();
        testData = await setupTestAuth(app);
    });

    describe('POST /api/new-feature', () => {
        it('should allow authorized users', async () => {
            // Test implementation
        });

        it('should prevent unauthorized access', async () => {
            // Test implementation
        });

        it('should validate required fields', async () => {
            // Test implementation
        });
    });
});
```