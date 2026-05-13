let currentUser = null;

// Initialize SuperAdmin Dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is authenticated and has superadmin role
    if (!api.token) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await api.getMe();
        currentUser = response.data;
        
        if (currentUser.role !== 'superadmin') {
            UI.toast('Access denied. SuperAdmin privileges required.', 'error');
            window.location.href = '/';
            return;
        }
        
        initializeSuperAdminDashboard();
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/';
    }
});

function initializeSuperAdminDashboard() {
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
    
    // Event delegation for dynamic buttons in lists
    document.getElementById('departmentsList').addEventListener('click', handleDynamicActions);
    document.getElementById('designationsList').addEventListener('click', handleDynamicActions);
    document.getElementById('adminsList').addEventListener('click', handleDynamicActions);
    
    // Modal close buttons
    document.getElementById('closeDepartmentModal').addEventListener('click', closeDepartmentModal);
    document.getElementById('closeDesignationModal').addEventListener('click', closeDesignationModal);
    document.getElementById('closeAdminModal').addEventListener('click', closeAdminModal);
    
    // Form submit handlers
    document.getElementById('createDepartmentForm').addEventListener('submit', handleCreateDepartment);
    document.getElementById('createDesignationForm').addEventListener('submit', handleCreateDesignation);
    document.getElementById('createAdminForm').addEventListener('submit', handleCreateAdmin);
    
    // Button handlers
    document.getElementById('addDepartmentBtn').addEventListener('click', showDepartmentModal);
    document.getElementById('addDesignationBtn').addEventListener('click', showDesignationModal);
    document.getElementById('addAdminBtn').addEventListener('click', showAdminModal);
    
    // Checkbox handler for showing inactive departments
    document.getElementById('showInactiveDepts').addEventListener('change', loadDepartments);
    
    // Checkbox handler for showing inactive admins
    document.getElementById('showInactiveAdmins').addEventListener('change', loadAdmins);
    
    // Cancel buttons
    document.getElementById('cancelDepartmentBtn').addEventListener('click', closeDepartmentModal);
    document.getElementById('cancelDesignationBtn').addEventListener('click', closeDesignationModal);
    document.getElementById('cancelAdminBtn').addEventListener('click', closeAdminModal);
    
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
    if (target === 'departments') loadDepartments();
    else if (target === 'designations') loadDesignations();
    else if (target === 'admins') loadAdmins();
}

function handleQuickAction(e) {
    const action = e.currentTarget.getAttribute('data-action');
    
    if (action === 'createDepartment') showDepartmentModal();
    else if (action === 'createDesignation') showDesignationModal();
    else if (action === 'createAdmin') showAdminModal();
}

function handleDynamicActions(e) {
    if (!e.target.hasAttribute('data-action')) return;
    
    const action = e.target.getAttribute('data-action');
    const id = e.target.getAttribute('data-id');
    const isActive = e.target.getAttribute('data-active');
    
    switch (action) {
        case 'editDepartment':
            editDepartment(id);
            break;
        case 'deleteDepartment':
            deleteDepartment(id);
            break;
        case 'reactivateDepartment':
            reactivateDepartment(id);
            break;
        case 'editDesignation':
            editDesignation(id);
            break;
        case 'deleteDesignation':
            deleteDesignation(id);
            break;
        case 'reactivateDesignation':
            reactivateDesignation(id);
            break;
        case 'toggleAdminStatus':
            toggleAdminStatus(id, isActive === 'true');
            break;
        case 'resetAdminPassword':
            resetAdminPassword(id);
            break;
    }
}

// Dashboard Statistics
async function loadDashboardStats() {
    try {
        const [deptResponse, designationResponse, adminResponse] = await Promise.all([
            api.getDepartments(true), // Include inactive departments in count
            api.getDesignations(),
            api.getUsers({ role: 'admin' })
        ]);
        
        // Count active departments separately
        const activeDepts = deptResponse.data?.filter(d => d.isActive).length || 0;
        const totalDepts = deptResponse.data?.length || 0;
        
        // Show active/total format
        document.getElementById('totalDepts').textContent = totalDepts > activeDepts 
            ? `${activeDepts}/${totalDepts}` 
            : totalDepts;
            
        document.getElementById('totalDesignations').textContent = designationResponse.data?.length || 0;
        document.getElementById('totalAdmins').textContent = adminResponse.data?.length || 0;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Department Management
function showDepartmentModal() {
    document.getElementById('createDepartmentModal').style.display = 'block';
}

function closeDepartmentModal() {
    document.getElementById('createDepartmentModal').style.display = 'none';
    document.getElementById('createDepartmentForm').reset();
}

async function handleCreateDepartment(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        await api.createDepartment({
            name: formData.get('name'),
            code: formData.get('code').toUpperCase(),
            description: formData.get('description')
        });
        
        closeDepartmentModal();
        loadDepartments();
        loadDashboardStats();
        showNotification('Department created successfully!', 'success');
    } catch (error) {
        showNotification('Error creating department: ' + error.message, 'error');
    }
}

async function loadDepartments() {
    try {
        const includeInactive = document.getElementById('showInactiveDepts').checked;
        const response = await api.getDepartments(includeInactive);
        const departmentsList = document.getElementById('departmentsList');
        
        if (response.data && response.data.length > 0) {
            departmentsList.innerHTML = response.data.map(dept => `
                <div class="data-card${!dept.isActive ? ' inactive-card' : ''}">
                    <h4>${dept.name} (${dept.code}) ${!dept.isActive ? '<span class="badge-inactive">Inactive</span>' : ''}</h4>
                    <div class="card-meta">
                        Created: ${new Date(dept.createdAt).toLocaleDateString()}
                    </div>
                    <p>${dept.description || 'No description available'}</p>
                    ${dept.hod && dept.hod.name ? `<p><strong>HOD:</strong> ${dept.hod.name} (${dept.hod.email || ''})</p>` : '<p><em>No HOD assigned</em></p>'}
                    <div class="card-actions">
                        ${dept.isActive ? `
                            <button class="btn btn-secondary" data-action="editDepartment" data-id="${dept._id}">Edit</button>
                            <button class="btn btn-secondary" data-action="deleteDepartment" data-id="${dept._id}">Deactivate</button>
                        ` : `
                            <button class="btn btn-primary" data-action="reactivateDepartment" data-id="${dept._id}">Reactivate</button>
                        `}
                    </div>
                </div>
            `).join('');
        } else {
            departmentsList.innerHTML = '<p>No departments created yet.</p>';
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

// Designation Management
function showDesignationModal() {
    document.getElementById('createDesignationModal').style.display = 'block';
}

function closeDesignationModal() {
    document.getElementById('createDesignationModal').style.display = 'none';
    document.getElementById('createDesignationForm').reset();
}

async function handleCreateDesignation(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        await api.createDesignation({
            name: formData.get('name'),
            level: parseInt(formData.get('level')),
            description: formData.get('description')
        });
        
        closeDesignationModal();
        loadDesignations();
        loadDashboardStats();
        showNotification('Designation created successfully!', 'success');
    } catch (error) {
        showNotification('Error creating designation: ' + error.message, 'error');
    }
}

async function loadDesignations() {
    try {
        const response = await api.getDesignations();
        const designationsList = document.getElementById('designationsList');
        
        if (response.data && response.data.length > 0) {
            designationsList.innerHTML = response.data.map(designation => `
                <div class="data-card">
                    <h4>${designation.name}</h4>
                    <div class="card-meta">
                        Level: ${designation.level} | Created: ${new Date(designation.createdAt).toLocaleDateString()}
                    </div>
                    ${designation.description ? `<p>${designation.description}</p>` : ''}
                    <div class="card-actions">
                        <button class="btn btn-secondary" data-action="editDesignation" data-id="${designation._id}">Edit</button>
                        <button class="btn btn-secondary" data-action="deleteDesignation" data-id="${designation._id}">Delete</button>
                    </div>
                </div>
            `).join('');
        } else {
            designationsList.innerHTML = '<p>No designations created yet.</p>';
        }
    } catch (error) {
        console.error('Error loading designations:', error);
    }
}

// Admin Account Management
function showAdminModal() {
    document.getElementById('createAdminModal').style.display = 'block';
}

function closeAdminModal() {
    document.getElementById('createAdminModal').style.display = 'none';
    document.getElementById('createAdminForm').reset();
}

async function handleCreateAdmin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        await api.createUser({
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            role: 'admin'
        });
        
        closeAdminModal();
        loadAdmins();
        loadDashboardStats();
        showNotification('Admin account created successfully!', 'success');
    } catch (error) {
        showNotification('Error creating admin: ' + error.message, 'error');
    }
}

async function loadAdmins() {
    try {
        const response = await api.getUsers({ role: 'admin' });
        const adminsList = document.getElementById('adminsList');
        const showInactive = document.getElementById('showInactiveAdmins').checked;
        
        if (response.data && response.data.length > 0) {
            // Filter based on active status if needed
            let adminsToShow = response.data;
            if (!showInactive) {
                adminsToShow = response.data.filter(admin => admin.isActive !== false);
            }
            
            if (adminsToShow.length > 0) {
                adminsList.innerHTML = adminsToShow.map(admin => `
                    <div class="data-card${admin.isActive === false ? ' inactive-card' : ''}">
                        <h4>${admin.name} ${admin.isActive === false ? '<span class="badge-inactive">Inactive</span>' : ''}</h4>
                        <div class="card-meta">
                            Email: ${admin.email} | Created: ${new Date(admin.createdAt).toLocaleDateString()}
                        </div>
                        <p><strong>Status:</strong> ${admin.isActive !== false ? 'Active' : 'Inactive'}</p>
                        <div class="card-actions">
                            <button class="btn btn-${admin.isActive !== false ? 'secondary' : 'primary'}" data-action="toggleAdminStatus" data-id="${admin._id}" data-active="${admin.isActive !== false}">
                                ${admin.isActive !== false ? 'Deactivate' : 'Activate'}
                            </button>
                            ${admin.isActive !== false ? `<button class="btn btn-secondary" data-action="resetAdminPassword" data-id="${admin._id}">Reset Password</button>` : ''}
                        </div>
                    </div>
                `).join('');
            } else {
                adminsList.innerHTML = '<p>No admin accounts to display. Try checking "Show Inactive" to see all admins.</p>';
            }
        } else {
            adminsList.innerHTML = '<p>No admin accounts created yet.</p>';
        }
    } catch (error) {
        console.error('Error loading admins:', error);
        adminsList.innerHTML = '<p>Error loading admin accounts.</p>';
    }
}

// Utility Functions
async function editDepartment(id) {
    try {
        const response = await api.getDepartment(id);
        const dept = response.data;

        const result = await UI.prompt({
            title: 'Edit Department',
            submitText: 'Save changes',
            fields: [
                { name: 'name', label: 'Name', value: dept.name, required: true },
                { name: 'code', label: 'Code', value: dept.code, required: true, hint: 'Will be upper-cased' },
                { name: 'description', label: 'Description', type: 'textarea', value: dept.description || '' }
            ]
        });
        if (!result) return;

        if (result.name && result.code) {
            await api.updateDepartment(id, {
                name: result.name.trim(),
                code: result.code.trim().toUpperCase(),
                description: (result.description || '').trim()
            });
            loadDepartments();
            loadDashboardStats();
            UI.toast('Department updated successfully', 'success');
        }
    } catch (error) {
        UI.toast('Error updating department: ' + error.message, 'error');
    }
}

async function deleteDepartment(id) {
    const ok = await UI.confirm({
        title: 'Deactivate department?',
        message: 'You can reactivate it later from this same screen.',
        confirmText: 'Deactivate',
        danger: true
    });
    if (!ok) return;
    try {
        await api.deleteDepartment(id);
        loadDepartments();
        loadDashboardStats();
        UI.toast('Department deactivated', 'success');
    } catch (error) {
        UI.toast('Error deactivating department: ' + error.message, 'error');
    }
}

async function reactivateDepartment(id) {
    const ok = await UI.confirm({ title: 'Reactivate department?', confirmText: 'Reactivate' });
    if (!ok) return;
    try {
        await api.reactivateDepartment(id);
        loadDepartments();
        loadDashboardStats();
        UI.toast('Department reactivated', 'success');
    } catch (error) {
        UI.toast('Error reactivating department: ' + error.message, 'error');
    }
}

async function editDesignation(id) {
    try {
        const designations = await api.getDesignations();
        const designation = designations.data.find(d => d._id === id);

        if (!designation) {
            UI.toast('Designation not found', 'error');
            return;
        }

        const result = await UI.prompt({
            title: 'Edit Designation',
            submitText: 'Save changes',
            fields: [
                { name: 'name', label: 'Name', value: designation.name, required: true },
                { name: 'level', label: 'Level (1–5)', type: 'number', value: designation.level, min: 1, max: 5, required: true },
                { name: 'description', label: 'Description', type: 'textarea', value: designation.description || '' }
            ]
        });
        if (!result) return;

        if (result.name && result.level && !isNaN(result.level)) {
            await api.updateDesignation(id, {
                name: result.name.trim(),
                level: parseInt(result.level),
                description: (result.description || '').trim()
            });
            loadDesignations();
            loadDashboardStats();
            UI.toast('Designation updated successfully', 'success');
        }
    } catch (error) {
        UI.toast('Error updating designation: ' + error.message, 'error');
    }
}

async function deleteDesignation(id) {
    const ok = await UI.confirm({ title: 'Deactivate designation?', message: 'You can reactivate it later.', confirmText: 'Deactivate', danger: true });
    if (!ok) return;
    try {
        await api.deleteDesignation(id);
        loadDesignations();
        loadDashboardStats();
        UI.toast('Designation deactivated', 'success');
    } catch (error) {
        UI.toast('Error deactivating designation: ' + error.message, 'error');
    }
}

async function reactivateDesignation(id) {
    const ok = await UI.confirm({ title: 'Reactivate designation?', confirmText: 'Reactivate' });
    if (!ok) return;
    try {
        await api.updateDesignation(id, { isActive: true });
        loadDesignations();
        loadDashboardStats();
        UI.toast('Designation reactivated', 'success');
    } catch (error) {
        UI.toast('Error reactivating designation: ' + error.message, 'error');
    }
}

async function toggleAdminStatus(id, isActive) {
    const ok = await UI.confirm({
        title: `${isActive ? 'Deactivate' : 'Activate'} this admin?`,
        confirmText: isActive ? 'Deactivate' : 'Activate',
        danger: isActive
    });
    if (!ok) return;
    try {
        await api.toggleUserStatus(id);
        loadAdmins();
        loadDashboardStats();
        UI.toast(`Admin ${isActive ? 'deactivated' : 'activated'}`, 'success');
    } catch (error) {
        UI.toast('Error updating admin status: ' + error.message, 'error');
    }
}

async function resetAdminPassword(id) {
    const result = await UI.prompt({
        title: 'Reset admin password',
        description: 'Enter a new password (minimum 6 characters).',
        submitText: 'Reset password',
        fields: [
            { name: 'password', label: 'New password', type: 'password', minlength: 6, required: true }
        ]
    });
    if (!result) return;
    const newPassword = result.password;
    if (!newPassword || newPassword.length < 6) {
        UI.toast('Password must be at least 6 characters long', 'error');
        return;
    }
    try {
        await api.resetUserPassword(id, newPassword);
        UI.toast('Admin password reset', 'success');
    } catch (error) {
        UI.toast('Error resetting password: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'info') {
    if (window.UI && window.UI.toast) return UI.toast(message, type);
    const n = document.createElement('div');
    n.textContent = message;
    n.style.cssText = 'position:fixed;top:20px;right:20px;padding:1rem;background:#333;color:#fff;border-radius:8px;z-index:99999';
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        api.clearToken();
        window.location.href = '/';
    }
}