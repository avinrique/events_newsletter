// Debug script to identify form submission issues
console.log('🔍 Form Debug Script Starting...');

// Test the API request structure
const testEventData = {
    eventName: "Test Hackathon",
    eventType: "hackathon", 
    startDate: "2024-03-15",
    durationDays: 2,
    participationType: "individual",
    organizer: {
        name: "Test Organization"
    },
    location: {
        venue: "Online"
    },
    description: "Test event description"
};

console.log('📤 Test Data Structure:', JSON.stringify(testEventData, null, 2));

// Check if the API class request method properly handles the data
async function debugAPIRequest() {
    console.log('🔧 Testing API request method...');
    
    // Simulate the API request method
    const mockRequest = (endpoint, options) => {
        console.log('📍 Endpoint:', endpoint);
        console.log('🔧 Options:', options);
        
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            console.log('📝 JSON Body:', JSON.stringify(options.body, null, 2));
            console.log('✅ Body will be JSON.stringify\'d');
        } else {
            console.log('❌ Body is not a plain object');
        }
        
        if (options.headers && options.headers['Content-Type']) {
            console.log('📋 Content-Type:', options.headers['Content-Type']);
        } else {
            console.log('📋 Content-Type: application/json (default)');
        }
    };
    
    // Test the request
    mockRequest('/event-participations', {
        method: 'POST',
        body: testEventData
    });
}

// Check form data extraction
function debugFormData() {
    console.log('🔍 Debugging FormData extraction...');
    
    // Create a mock form with test data
    const formData = new FormData();
    formData.append('eventName', 'Test Hackathon');
    formData.append('eventType', 'hackathon');
    formData.append('startDate', '2024-03-15');
    formData.append('durationDays', '2');
    formData.append('participationType', 'individual');
    formData.append('organizer[name]', 'Test Organization');
    formData.append('location[venue]', 'Online');
    formData.append('description', 'Test description');
    
    console.log('📝 FormData entries:');
    for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
    }
    
    // Test the conversion logic from handleEventAdd
    const eventData = {};
    
    eventData.eventName = formData.get('eventName');
    eventData.eventType = formData.get('eventType'); 
    eventData.startDate = formData.get('startDate');
    eventData.durationDays = parseInt(formData.get('durationDays'));
    eventData.participationType = formData.get('participationType');
    eventData.description = formData.get('description');
    
    eventData.organizer = {
        name: formData.get('organizer[name]')
    };
    
    eventData.location = {
        venue: formData.get('location[venue]')
    };
    
    console.log('🔄 Converted eventData:', JSON.stringify(eventData, null, 2));
    
    // Validate against backend expectations
    const validationChecks = {
        'eventName': eventData.eventName && eventData.eventName.length >= 2 && eventData.eventName.length <= 200,
        'eventType': ['hackathon', 'coding-competition', 'technical-competition', 'conference', 'workshop', 'seminar', 'webinar', 'bootcamp', 'certification-program', 'online-course', 'innovation-contest', 'startup-competition', 'pitch-competition', 'research-conference', 'symposium', 'summit', 'networking-event', 'career-fair', 'industry-meetup', 'open-source-contribution', 'community-event', 'other'].includes(eventData.eventType),
        'startDate': eventData.startDate && !isNaN(new Date(eventData.startDate)),
        'durationDays': eventData.durationDays && eventData.durationDays >= 1 && eventData.durationDays <= 365,
        'organizer.name': eventData.organizer && eventData.organizer.name && eventData.organizer.name.length >= 2 && eventData.organizer.name.length <= 100,
        'participationType': ['individual', 'team'].includes(eventData.participationType)
    };
    
    console.log('✅ Validation Results:');
    Object.entries(validationChecks).forEach(([field, isValid]) => {
        console.log(`  ${field}: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    return eventData;
}

// Run debug functions
debugAPIRequest();
const testData = debugFormData();

// Check server-side route validation
console.log('🔍 Checking if data matches server expectations...');
console.log('Expected by server validation:');
console.log('- eventName: string, 2-200 chars');
console.log('- eventType: enum from allowed values'); 
console.log('- startDate: ISO8601 date string');
console.log('- durationDays: integer, 1-365');
console.log('- organizer.name: string, 2-100 chars');
console.log('- participationType: "individual" or "team"');

console.log('🔍 Debug Script Complete!');

export { testEventData, debugFormData, debugAPIRequest };