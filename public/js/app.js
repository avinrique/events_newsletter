let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    if (api.token) {
        try {
            const response = await api.getMe();
            currentUser = response.data;

            // Redirect to appropriate role dashboard
            redirectToRoleDashboard(currentUser.role, currentUser.position);
            return; // Don't continue with main page setup
        } catch (error) {
            // Token is invalid/expired — clear it so we don't loop with /hod etc.
            console.warn('Stale token, clearing:', error?.message);
            api.clearToken();
            showLogin();
        }
    } else {
        showLogin();
    }

    setupEventListeners();
});

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Initialize admin form
    document.getElementById('initAdminForm').addEventListener('submit', handleInitAdmin);
    
    // Create user form
    document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);
    
    // Navigation
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Button event listeners
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('initAdminLink').addEventListener('click', showInitAdmin);
    document.getElementById('backToLoginBtn').addEventListener('click', showLogin);
    document.getElementById('createUserBtn').addEventListener('click', showCreateUserForm);
    document.getElementById('closeCreateUserModal').addEventListener('click', closeCreateUserForm);
    document.getElementById('createDeptBtn').addEventListener('click', showCreateDeptForm);
    
    // Search functionality
    document.getElementById('userSearch').addEventListener('keyup', searchUsers);
    
    // Role change handler
    document.getElementById('userRole').addEventListener('change', handleRoleChange);
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
        const response = await api.login(email, password);
        currentUser = response.user;
        hideError('loginError');
        
        // Redirect to role-specific dashboard
        redirectToRoleDashboard(currentUser.role, currentUser.position);
    } catch (error) {
        showError('loginError', error.message);
    }
}

async function handleInitAdmin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await api.initSuperAdmin(userData);
        currentUser = response.user;
        hideError('initError');
        
        // Redirect to SuperAdmin dashboard
        redirectToRoleDashboard('superadmin');
    } catch (error) {
        showError('initError', error.message);
    }
}

async function handleCreateUser(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        department: formData.get('department') || undefined,
        designation: formData.get('designation') || undefined,
        usn: formData.get('usn') || undefined,
        rollNumber: formData.get('rollNumber') || undefined,
        semester: formData.get('semester') ? parseInt(formData.get('semester')) : undefined
    };

    try {
        await api.createUser(userData);
        closeCreateUserForm();
        loadUsers();
        UI.toast('User created successfully!', 'success');
    } catch (error) {
        UI.toast('Error creating user: ' + error.message, 'error');
    }
}

function handleNavigation(e) {
    e.preventDefault();
    const target = e.target.getAttribute('href');
    
    if (target === '#dashboard') showDashboard();
    else if (target === '#users') showUsers();
    else if (target === '#departments') showDepartments();
    else if (target === '#clubs') showClubs();
    else if (target === '#events') showEvents();
    else if (target === '#projects') showProjects();
    else if (target === '#profile') showProfile();
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
}

function showLogin() {
    document.getElementById('mainNav').style.display = 'none';
    showSection('loginSection');
}

function showInitAdmin() {
    showSection('initAdminSection');
}

function showDashboard() {
    document.getElementById('mainNav').style.display = 'block';
    updateNavigation();
    showSection('dashboardSection');
    loadDashboard();
}

function showUsers() {
    showSection('usersSection');
    loadUsers();
    loadRolesAndDepartments();
}

function showDepartments() {
    showSection('departmentsSection');
    loadDepartments();
}

// Legacy stubs — kept as no-ops because the / page redirects to role-specific
// dashboards immediately after login. These should never be reached in practice.
function showDesignations() { redirectToRoleDashboard(currentUser?.role, currentUser?.position); }
function showAdmins()       { redirectToRoleDashboard(currentUser?.role, currentUser?.position); }
function showClubs()        { redirectToRoleDashboard(currentUser?.role, currentUser?.position); }
function showEvents()       { redirectToRoleDashboard(currentUser?.role, currentUser?.position); }
function showProjects()     { redirectToRoleDashboard(currentUser?.role, currentUser?.position); }
function showProfile()      { redirectToRoleDashboard(currentUser?.role, currentUser?.position); }
function showReports()      { redirectToRoleDashboard(currentUser?.role, currentUser?.position); }
function showBudgets()      { redirectToRoleDashboard(currentUser?.role, currentUser?.position); }

function updateNavigation() {
    const navList = document.querySelector('#mainNav ul');
    let navItems = '<li><a href="#dashboard">Dashboard</a></li>';
    
    // Role-based navigation
    if (currentUser.role === 'superadmin') {
        navItems += `
            <li><a href="#departments">Departments</a></li>
            <li><a href="#designations">Designations</a></li>
            <li><a href="#admins">Admins</a></li>
        `;
    } else if (currentUser.role === 'admin') {
        navItems += `
            <li><a href="#users">Users</a></li>
            <li><a href="#reports">Reports</a></li>
            <li><a href="#budgets">Budgets</a></li>
        `;
    } else if (currentUser.role === 'hod') {
        navItems += `
            <li><a href="#users">Users</a></li>
            <li><a href="#clubs">Clubs</a></li>
            <li><a href="#events">Events</a></li>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#budgets">Budgets</a></li>
            <li><a href="#reports">Reports</a></li>
        `;
    } else if (currentUser.role === 'teacher') {
        navItems += `
            <li><a href="#clubs">Clubs</a></li>
            <li><a href="#events">Events</a></li>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#certificates">Certificates</a></li>
            <li><a href="#internships">Internships</a></li>
        `;
    } else if (currentUser.role === 'student') {
        navItems += `
            <li><a href="#clubs">Clubs</a></li>
            <li><a href="#events">Events</a></li>
            <li><a href="#projects">My Projects</a></li>
            <li><a href="#certificates">My Certificates</a></li>
            <li><a href="#internships">My Internships</a></li>
        `;
    }
    
    navItems += `
        <li><a href="#profile">Profile</a></li>
        <li><a href="#" id="logoutBtn">Logout</a></li>
    `;
    
    navList.innerHTML = navItems;
    
    // Re-add event listeners for navigation
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Re-add logout listener
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

async function loadDashboard() {
    const userInfo = document.getElementById('userInfo');
    userInfo.innerHTML = `
        <h3>Welcome, ${currentUser.name}!</h3>
        <p>Role: ${currentUser.role}</p>
        <p>Email: ${currentUser.email}</p>
    `;

    const quickActions = document.getElementById('quickActions');
    let actions = '';

    if (currentUser.role === 'superadmin') {
        actions = `
            <button class="btn btn-primary" data-action="showDepartments">Manage Departments</button>
            <button class="btn btn-primary" data-action="showDesignations">Manage Designations</button>
            <button class="btn btn-primary" data-action="showAdmins">Manage Admins</button>
        `;
    } else if (currentUser.role === 'admin') {
        actions = `
            <button class="btn btn-primary" data-action="showUsers">Manage Users</button>
            <button class="btn btn-primary" data-action="showReports">View Department Reports</button>
            <button class="btn btn-primary" data-action="showBudgets">View Budgets</button>
        `;
    } else if (currentUser.role === 'hod') {
        actions = `
            <button class="btn btn-primary" data-action="showClubs">Manage Clubs</button>
            <button class="btn btn-primary" data-action="showEvents">Approve Events</button>
        `;
    } else if (currentUser.role === 'teacher') {
        actions = `
            <button class="btn btn-primary" data-action="showClubs">Create Club</button>
            <button class="btn btn-primary" data-action="showEvents">Create Event</button>
            <button class="btn btn-primary" data-action="showProjects">Manage Projects</button>
        `;
    } else if (currentUser.role === 'student') {
        actions = `
            <button class="btn btn-primary" data-action="showClubs">Join Clubs</button>
            <button class="btn btn-primary" data-action="showProjects">My Projects</button>
        `;
    }

    quickActions.innerHTML = actions;
    
    // Add event listeners to quick action buttons
    quickActions.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            if (action === 'showDepartments') showDepartments();
            else if (action === 'showDesignations') showDesignations();
            else if (action === 'showAdmins') showAdmins();
            else if (action === 'showUsers') showUsers();
            else if (action === 'showReports') showReports();
            else if (action === 'showBudgets') showBudgets();
            else if (action === 'showClubs') showClubs();
            else if (action === 'showEvents') showEvents();
            else if (action === 'showProjects') showProjects();
        });
    });
}

async function loadUsers() {
    try {
        const response = await api.getUsers();
        const usersList = document.getElementById('usersList');
        
        if (response.data && response.data.length > 0) {
            usersList.innerHTML = response.data.map(user => `
                <div class="data-card">
                    <h4>${user.name}</h4>
                    <p>Email: ${user.email}</p>
                    <p>Role: ${user.role}</p>
                    ${user.department ? `<p>Department: ${user.department.name}</p>` : ''}
                    ${user.usn ? `<p>USN: ${user.usn}</p>` : ''}
                    <div>
                        <button class="btn btn-secondary" data-action="editUser" data-id="${user._id}">Edit</button>
                        <button class="btn btn-secondary" data-action="deleteUser" data-id="${user._id}">Delete</button>
                    </div>
                </div>
            `).join('');
        } else {
            usersList.innerHTML = '<p>No users found.</p>';
        }
        
        // Add event listeners to user action buttons
        usersList.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                const id = e.target.getAttribute('data-id');
                if (action === 'editUser') editUser(id);
                else if (action === 'deleteUser') deleteUser(id);
            });
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadDepartments() {
    try {
        const response = await api.getDepartments();
        const deptList = document.getElementById('departmentsList');
        
        if (response.data && response.data.length > 0) {
            deptList.innerHTML = response.data.map(dept => `
                <div class="data-card">
                    <h4>${dept.name} (${dept.code})</h4>
                    <p>${dept.description}</p>
                    ${dept.hod ? `<p>HOD: ${dept.hod.name}</p>` : '<p>No HOD assigned</p>'}
                    <div>
                        <button class="btn btn-secondary" data-action="editDept" data-id="${dept._id}">Edit</button>
                        <button class="btn btn-secondary" data-action="deleteDept" data-id="${dept._id}">Delete</button>
                    </div>
                </div>
            `).join('');
        } else {
            deptList.innerHTML = '<p>No departments found.</p>';
        }
        
        // Add event listeners to department action buttons
        deptList.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                const id = e.target.getAttribute('data-id');
                if (action === 'editDept') editDepartment(id);
                else if (action === 'deleteDept') deleteDepartment(id);
            });
        });
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

async function loadRolesAndDepartments() {
    try {
        // Load departments for dropdown
        const deptResponse = await api.getDepartments();
        const deptSelect = document.getElementById('userDepartment');
        deptSelect.innerHTML = '<option value="">Select Department</option>';
        if (deptResponse.data) {
            deptResponse.data.forEach(dept => {
                deptSelect.innerHTML += `<option value="${dept._id}">${dept.name}</option>`;
            });
        }

        // Load designations for dropdown
        const designationResponse = await api.getDesignations();
        const designationSelect = document.getElementById('userDesignation');
        designationSelect.innerHTML = '<option value="">Select Designation</option>';
        if (designationResponse.data) {
            designationResponse.data.forEach(designation => {
                designationSelect.innerHTML += `<option value="${designation._id}">${designation.name}</option>`;
            });
        }

        // Set available roles based on current user
        const roleSelect = document.getElementById('userRole');
        roleSelect.innerHTML = '<option value="">Select Role</option>';
        
        if (currentUser.role === 'superadmin') {
            roleSelect.innerHTML += '<option value="admin">Admin</option>';
        } else if (currentUser.role === 'admin') {
            roleSelect.innerHTML += `
                <option value="hod">HOD</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
            `;
        }
    } catch (error) {
        console.error('Error loading roles and departments:', error);
    }
}

function showCreateUserForm() {
    document.getElementById('createUserModal').style.display = 'block';
}

function closeCreateUserForm() {
    document.getElementById('createUserModal').style.display = 'none';
    document.getElementById('createUserForm').reset();
}

function handleRoleChange() {
    const role = document.getElementById('userRole').value;
    const deptGroup = document.getElementById('departmentGroup');
    const designationGroup = document.getElementById('designationGroup');
    const studentFields = document.getElementById('studentFields');

    if (role === 'admin') {
        deptGroup.style.display = 'none';
        designationGroup.style.display = 'none';
        studentFields.style.display = 'none';
    } else if (role === 'hod' || role === 'teacher') {
        deptGroup.style.display = 'block';
        designationGroup.style.display = 'block';
        studentFields.style.display = 'none';
    } else if (role === 'student') {
        deptGroup.style.display = 'block';
        designationGroup.style.display = 'none';
        studentFields.style.display = 'block';
    } else {
        deptGroup.style.display = 'none';
        designationGroup.style.display = 'none';
        studentFields.style.display = 'none';
    }
}

async function showCreateDeptForm() {
    const result = await UI.prompt({
        title: 'Create department',
        submitText: 'Create',
        fields: [
            { name: 'name', label: 'Name', required: true },
            { name: 'code', label: 'Code', required: true, hint: 'Will be upper-cased' },
            { name: 'description', label: 'Description', type: 'textarea' }
        ]
    });
    if (!result) return;
    if (result.name && result.code) {
        createDepartment({
            name: result.name.trim(),
            code: result.code.trim().toUpperCase(),
            description: (result.description || '').trim()
        });
    }
}

async function createDepartment(deptData) {
    try {
        await api.createDepartment(deptData);
        loadDepartments();
        UI.toast('Department created successfully!', 'success');
    } catch (error) {
        UI.toast('Error creating department: ' + error.message, 'error');
    }
}

function editUser(id) {
    UI.toast('Edit user functionality - To be implemented', 'info');
}

async function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await api.deleteUser(id);
            loadUsers();
            UI.toast('User deleted successfully!', 'success');
        } catch (error) {
            UI.toast('Error deleting user: ' + error.message, 'error');
        }
    }
}

function editDepartment(id) {
    UI.toast('Edit department functionality - To be implemented', 'info');
}

async function deleteDepartment(id) {
    if (confirm('Are you sure you want to delete this department?')) {
        try {
            await api.deleteDepartment(id);
            loadDepartments();
            UI.toast('Department deleted successfully!', 'success');
        } catch (error) {
            UI.toast('Error deleting department: ' + error.message, 'error');
        }
    }
}

function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const userCards = document.querySelectorAll('#usersList .data-card');
    
    userCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function logout() {
    api.clearToken();
    currentUser = null;
    showLogin();
}

function redirectToRoleDashboard(role, position) {
    // Check if user is HOD (teacher with HOD position)
    if (role === 'teacher' && position === 'HOD') {
        window.location.href = '/hod';
        return;
    }
    
    const dashboardUrls = {
        'superadmin': '/superadmin',
        'admin': '/admin',
        'hod': '/hod',
        'teacher': '/teacher',
        'student': '/student'
    };
    
    const url = dashboardUrls[role];
    if (url) {
        window.location.href = url;
    } else {
        console.error('Unknown role:', role);
        showLogin();
    }
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    errorElement.classList.remove('show');
}