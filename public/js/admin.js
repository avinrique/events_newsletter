let currentUser = null;

// Initialize Admin Dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is authenticated and has admin role
    if (!api.token) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await api.getMe();
        currentUser = response.data;
        
        if (currentUser.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = '/';
            return;
        }
        
        initializeAdminDashboard();
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/';
    }
});

function initializeAdminDashboard() {
    // Display admin info
    document.getElementById('adminInfo').textContent = `Welcome, ${currentUser.name}`;
    
    // Load dashboard data
    loadDashboardStats();
    
    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Quick action buttons
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', handleQuickAction);
    });
    
    // Modal handlers
    document.getElementById('closeUserModal').addEventListener('click', closeUserModal);
    document.getElementById('closeHODModal').addEventListener('click', closeHODModal);
    
    // Form handlers
    document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);
    document.getElementById('assignHODForm').addEventListener('submit', handleAssignHOD);
    
    // Button handlers
    document.getElementById('addUserBtn').addEventListener('click', showUserModal);
    
    // Cancel buttons
    document.getElementById('cancelUserBtn').addEventListener('click', closeUserModal);
    document.getElementById('cancelHODBtn').addEventListener('click', closeHODModal);
    
    // Role change handler
    document.getElementById('userRole').addEventListener('change', handleRoleChange);
    
    // Filter handlers
    document.getElementById('roleFilter').addEventListener('change', loadUsers);
    document.getElementById('deptFilter').addEventListener('change', loadUsers);
    document.getElementById('userSearch').addEventListener('keyup', searchUsers);
    
    // User action handlers (event delegation for CSP compliance)
    document.getElementById('usersList').addEventListener('click', handleUserAction);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

function handleNavigation(e) {
    e.preventDefault();
    const target = e.target.getAttribute('href').substring(1);
    
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    e.target.classList.add('active');
    
    // Show corresponding section
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.getElementById(target + 'Section').classList.add('active');
    
    // Load section data
    if (target === 'users') loadUsers();
    else if (target === 'reports') loadReports();
    else if (target === 'budgets') loadBudgets();
}

function handleQuickAction(e) {
    const action = e.currentTarget.getAttribute('data-action');
    
    if (action === 'createTeacher') showUserModal('teacher');
    else if (action === 'createStudent') showUserModal('student');
    else if (action === 'assignHOD') showAssignHODModal();
}

function handleUserAction(e) {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    
    e.preventDefault();
    const action = button.getAttribute('data-action');
    const userId = button.getAttribute('data-user-id');
    
    if (action === 'edit') {
        editUser(userId);
    } else if (action === 'toggle-status') {
        const isActive = button.getAttribute('data-is-active') === 'true';
        toggleUserStatus(userId, isActive);
    } else if (action === 'reset-password') {
        resetUserPassword(userId);
    }
}

// Dashboard Statistics
async function loadDashboardStats() {
    try {
        const [hodsResponse, teachersResponse, studentsResponse, deptsResponse] = await Promise.all([
            api.getUsers({ role: 'teacher', position: 'HOD' }),
            api.getUsers({ role: 'teacher' }),
            api.getUsers({ role: 'student' }),
            api.getDepartments()
        ]);
        
        document.getElementById('totalHODs').textContent = hodsResponse.data?.length || 0;
        document.getElementById('totalTeachers').textContent = teachersResponse.data?.length || 0;
        document.getElementById('totalStudents').textContent = studentsResponse.data?.length || 0;
        document.getElementById('activeDepartments').textContent = deptsResponse.data?.length || 0;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// User Management
function showUserModal(preSelectedRole = '') {
    if (preSelectedRole) {
        document.getElementById('userRole').value = preSelectedRole;
        handleRoleChange();
    }
    loadDropdownData();
    document.getElementById('createUserModal').style.display = 'block';
}

function closeUserModal() {
    const form = document.getElementById('createUserForm');
    const modal = document.getElementById('createUserModal');
    
    modal.style.display = 'none';
    form.reset();
    form.removeAttribute('data-edit-id');
    
    // Reset form to create mode
    document.querySelector('#createUserModal h3').textContent = 'Create User';
    document.getElementById('userPassword').required = true;
    document.getElementById('userPassword').placeholder = '';
    
    document.getElementById('designationGroup').style.display = 'none';
    document.getElementById('studentFields').style.display = 'none';
}

function handleRoleChange() {
    const role = document.getElementById('userRole').value;
    const designationGroup = document.getElementById('designationGroup');
    const studentFields = document.getElementById('studentFields');

    if (role === 'hod' || role === 'teacher') {
        designationGroup.style.display = 'block';
        studentFields.style.display = 'none';
    } else if (role === 'student') {
        designationGroup.style.display = 'none';
        studentFields.style.display = 'block';
    } else {
        designationGroup.style.display = 'none';
        studentFields.style.display = 'none';
    }
}

async function loadDropdownData() {
    try {
        const [deptResponse, designationResponse] = await Promise.all([
            api.getDepartments(),
            api.getDesignations()
        ]);

        // Load departments
        const deptSelects = document.querySelectorAll('#userDepartment, #deptFilter, #hodDepartment');
        deptSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = select.id === 'deptFilter' ? '<option value="">All Departments</option>' : '<option value="">Select Department</option>';
            
            if (deptResponse.data) {
                deptResponse.data.forEach(dept => {
                    select.innerHTML += `<option value="${dept._id}">${dept.name}</option>`;
                });
            }
            select.value = currentValue;
        });

        // Load designations
        const designationSelect = document.getElementById('userDesignation');
        designationSelect.innerHTML = '<option value="">Select Designation</option>';
        if (designationResponse.data) {
            designationResponse.data.forEach(designation => {
                designationSelect.innerHTML += `<option value="${designation._id}">${designation.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading dropdown data:', error);
    }
}

async function handleCreateUser(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const editId = form.getAttribute('data-edit-id');
    
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        role: formData.get('role'),
        department: formData.get('department') || undefined,
        designation: formData.get('designation') || undefined,
        usn: formData.get('usn') || undefined,
        tempUSN: formData.get('tempUSN') || undefined,
        rollNumber: formData.get('rollNumber') || undefined,
        semester: formData.get('semester') ? parseInt(formData.get('semester')) : undefined
    };

    // Remove undefined values to avoid sending empty strings
    Object.keys(userData).forEach(key => {
        if (userData[key] === undefined || userData[key] === '') {
            delete userData[key];
        }
    });

    // Validate email format
    if (userData.email) {
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/;
        if (!emailRegex.test(userData.email)) {
            showNotification('Please provide a valid email address', 'error');
            return;
        }
    }

    // Only include password if provided (for create) or if editing and password changed
    const password = formData.get('password');
    if (password && password.trim() !== '') {
        userData.password = password;
    }

    try {
        if (editId) {
            // Edit mode
            await api.updateUser(editId, userData);
            showNotification('User updated successfully!', 'success');
        } else {
            // Create mode
            if (!userData.password) {
                showNotification('Password is required when creating a user', 'error');
                return;
            }
            await api.createUser(userData);
            showNotification('User created successfully!', 'success');
        }
        
        closeUserModal();
        loadUsers();
        loadDashboardStats();
    } catch (error) {
        let errorMessage = error.message;
        
        // Handle duplicate key errors with user-friendly messages
        if (error.message.includes('E11000 duplicate key error')) {
            if (error.message.includes('usn_1')) {
                errorMessage = 'USN already exists. Please use a different USN.';
            } else if (error.message.includes('tempUSN_1')) {
                errorMessage = 'Temporary USN already exists. Please use a different temporary USN.';
            } else if (error.message.includes('email_1')) {
                errorMessage = 'Email address already exists. Please use a different email.';
            } else {
                errorMessage = 'A user with these details already exists.';
            }
        }
        
        showNotification(`Error ${editId ? 'updating' : 'creating'} user: ` + errorMessage, 'error');
    }
}

async function loadUsers() {
    try {
        const roleFilter = document.getElementById('roleFilter').value;
        const deptFilter = document.getElementById('deptFilter').value;
        
        const params = {};
        if (roleFilter) params.role = roleFilter;
        if (deptFilter) params.department = deptFilter;
        
        const response = await api.getUsers(params);
        const usersList = document.getElementById('usersList');
        
        if (response.data && response.data.length > 0) {
            // Filter out superadmin users from display
            const filteredUsers = response.data.filter(user => user.role !== 'superadmin');
            
            if (filteredUsers.length > 0) {
                usersList.innerHTML = filteredUsers.map(user => `
                    <div class="data-card">
                        <h4>${user.name}</h4>
                        <div class="card-meta">
                            Role: ${user.role}${user.position ? ` (${user.position})` : ''} | Email: ${user.email}
                            ${user.department ? ` | Dept: ${user.department.name}` : ''}
                            ${user.usn ? ` | USN: ${user.usn}` : ''}
                            ${user.tempUSN ? ` | Temp USN: ${user.tempUSN}` : ''}
                        </div>
                        <p><strong>Status:</strong> ${user.isActive ? 'Active' : 'Inactive'}</p>
                        ${user.designation ? `<p><strong>Designation:</strong> ${user.designation.name}</p>` : ''}
                        ${user.position === 'HOD' ? `<p><strong>Position:</strong> Head of Department</p>` : ''}
                        <div class="card-actions">
                            <button class="btn btn-secondary" data-action="edit" data-user-id="${user._id}">Edit</button>
                            <button class="btn btn-secondary" data-action="toggle-status" data-user-id="${user._id}" data-is-active="${user.isActive}">
                                ${user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="btn btn-secondary" data-action="reset-password" data-user-id="${user._id}">Reset Password</button>
                        </div>
                    </div>
                `).join('');
            } else {
                usersList.innerHTML = '<p>No users found.</p>';
            }
        } else {
            usersList.innerHTML = '<p>No users found.</p>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
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

// HOD Assignment
function showAssignHODModal() {
    loadHODAssignmentData();
    document.getElementById('assignHODModal').style.display = 'block';
}

function closeHODModal() {
    document.getElementById('assignHODModal').style.display = 'none';
    document.getElementById('assignHODForm').reset();
}

async function loadHODAssignmentData() {
    try {
        const [deptResponse, teacherResponse] = await Promise.all([
            api.getDepartments(),
            api.getUsers({ role: 'teacher', position: null }) // Only teachers who aren't already HODs
        ]);

        // Load departments
        const deptSelect = document.getElementById('hodDepartment');
        deptSelect.innerHTML = '<option value="">Select Department</option>';
        if (deptResponse.data) {
            deptResponse.data.forEach(dept => {
                deptSelect.innerHTML += `<option value="${dept._id}">${dept.name}</option>`;
            });
        }

        // Load teachers
        const teacherSelect = document.getElementById('hodTeacher');
        teacherSelect.innerHTML = '<option value="">Select Teacher</option>';
        if (teacherResponse.data) {
            teacherResponse.data.forEach(teacher => {
                teacherSelect.innerHTML += `<option value="${teacher._id}">${teacher.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading HOD assignment data:', error);
    }
}

async function handleAssignHOD(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const userId = formData.get('userId');
    const departmentId = formData.get('departmentId');
    
    try {
        await api.assignHOD({
            userId: userId,
            departmentId: departmentId
        });
        
        closeHODModal();
        loadUsers();
        loadDashboardStats();
        showNotification('HOD assigned successfully!', 'success');
    } catch (error) {
        showNotification('Error assigning HOD: ' + error.message, 'error');
    }
}

// Reports Management
async function loadReports() {
    try {
        // This would load department reports
        const reportsList = document.getElementById('reportsList');
        reportsList.innerHTML = '<p>Department reports will be displayed here...</p>';
        
        // TODO: Implement actual report loading
        showNotification('Reports functionality - To be implemented', 'info');
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

// Budget Management
async function loadBudgets() {
    try {
        // Load departments into filter dropdown
        await loadBudgetFilters();
        
        // This would load budget data
        document.getElementById('totalRequested').textContent = '₹0';
        document.getElementById('totalApproved').textContent = '₹0';
        document.getElementById('totalUtilized').textContent = '₹0';
        
        const budgetsList = document.getElementById('budgetsList');
        budgetsList.innerHTML = '<p>Budget information will be displayed here...</p>';
        
        // TODO: Implement actual budget loading
        showNotification('Budget functionality - To be implemented', 'info');
    } catch (error) {
        console.error('Error loading budgets:', error);
    }
}

async function loadBudgetFilters() {
    try {
        const deptResponse = await api.getDepartments();
        
        // Load departments into budget filter dropdown
        const budgetDeptFilter = document.getElementById('budgetDeptFilter');
        budgetDeptFilter.innerHTML = '<option value="">All Departments</option>';
        
        if (deptResponse.data) {
            deptResponse.data.forEach(dept => {
                budgetDeptFilter.innerHTML += `<option value="${dept._id}">${dept.name}</option>`;
            });
        }
        
        // Load years into year filter (you can customize this range)
        const budgetYearFilter = document.getElementById('budgetYearFilter');
        budgetYearFilter.innerHTML = '<option value="">All Years</option>';
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= currentYear - 5; year--) {
            budgetYearFilter.innerHTML += `<option value="${year}">${year}-${(year + 1).toString().slice(-2)}</option>`;
        }
    } catch (error) {
        console.error('Error loading budget filters:', error);
    }
}

// Utility Functions
async function editUser(id) {
    try {
        const response = await api.getUser(id);
        const user = response.data;
        
        // Populate edit form with user data
        document.getElementById('userRole').value = user.role;
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userDepartment').value = user.department?._id || '';
        document.getElementById('userDesignation').value = user.designation?._id || '';
        
        if (user.role === 'student') {
            document.getElementById('userUSN').value = user.usn || '';
            document.getElementById('tempUSN').value = user.tempUSN || '';
            document.getElementById('userRoll').value = user.rollNumber || '';
            document.getElementById('userSemester').value = user.semester || '';
        }
        
        // Show role-specific fields
        handleRoleChange();
        
        // Change form to edit mode
        const form = document.getElementById('createUserForm');
        form.setAttribute('data-edit-id', id);
        document.querySelector('#createUserModal h3').textContent = 'Edit User';
        document.getElementById('userPassword').required = false;
        document.getElementById('userPassword').placeholder = 'Leave blank to keep current password';
        
        showUserModal();
    } catch (error) {
        showNotification('Error loading user data: ' + error.message, 'error');
    }
}

async function toggleUserStatus(id, isActive) {
    if (confirm(`Are you sure you want to ${isActive ? 'deactivate' : 'activate'} this user?`)) {
        try {
            await api.toggleUserStatus(id);
            loadUsers();
            loadDashboardStats();
            showNotification(`User ${isActive ? 'deactivated' : 'activated'} successfully!`, 'success');
        } catch (error) {
            showNotification('Error updating user status: ' + error.message, 'error');
        }
    }
}

async function resetUserPassword(id) {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (newPassword && newPassword.length >= 6) {
        try {
            await api.resetUserPassword(id, newPassword);
            showNotification('Password reset successfully!', 'success');
        } catch (error) {
            showNotification('Error resetting password: ' + error.message, 'error');
        }
    } else if (newPassword !== null) {
        showNotification('Password must be at least 6 characters long', 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const colors = {
        success: '#48bb78',
        error: '#f56565',
        info: '#4299e1'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        background: ${colors[type] || '#718096'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        api.clearToken();
        window.location.href = '/';
    }
}

// Load dropdown data when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load departments and other dropdown data after a short delay
    setTimeout(loadDropdownData, 1000);
});