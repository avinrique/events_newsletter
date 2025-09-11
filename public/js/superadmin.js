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
            alert('Access denied. SuperAdmin privileges required.');
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
        
        const name = prompt('Edit Department Name:', dept.name);
        const code = prompt('Edit Department Code:', dept.code);
        const description = prompt('Edit Description:', dept.description || '');
        
        if (name && code) {
            await api.updateDepartment(id, {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                description: description.trim()
            });
            
            loadDepartments();
            loadDashboardStats();
            showNotification('Department updated successfully!', 'success');
        }
    } catch (error) {
        showNotification('Error updating department: ' + error.message, 'error');
    }
}

async function deleteDepartment(id) {
    if (confirm('Are you sure you want to deactivate this department? You can reactivate it later.')) {
        try {
            await api.deleteDepartment(id);
            loadDepartments();
            loadDashboardStats();
            showNotification('Department deactivated successfully!', 'success');
        } catch (error) {
            showNotification('Error deactivating department: ' + error.message, 'error');
        }
    }
}

async function reactivateDepartment(id) {
    if (confirm('Are you sure you want to reactivate this department?')) {
        try {
            await api.reactivateDepartment(id);
            loadDepartments();
            loadDashboardStats();
            showNotification('Department reactivated successfully!', 'success');
        } catch (error) {
            showNotification('Error reactivating department: ' + error.message, 'error');
        }
    }
}

async function editDesignation(id) {
    try {
        // First get the designation details
        const designations = await api.getDesignations();
        const designation = designations.data.find(d => d._id === id);
        
        if (!designation) {
            showNotification('Designation not found', 'error');
            return;
        }
        
        const name = prompt('Edit Designation Name:', designation.name);
        const level = prompt('Edit Level (1-10):', designation.level);
        const description = prompt('Edit Description:', designation.description || '');
        
        if (name && level && !isNaN(level)) {
            await api.updateDesignation(id, {
                name: name.trim(),
                level: parseInt(level),
                description: description.trim()
            });
            
            loadDesignations();
            loadDashboardStats();
            showNotification('Designation updated successfully!', 'success');
        }
    } catch (error) {
        showNotification('Error updating designation: ' + error.message, 'error');
    }
}

async function deleteDesignation(id) {
    if (confirm('Are you sure you want to deactivate this designation? You can reactivate it later.')) {
        try {
            await api.deleteDesignation(id);
            loadDesignations();
            loadDashboardStats();
            showNotification('Designation deactivated successfully!', 'success');
        } catch (error) {
            showNotification('Error deactivating designation: ' + error.message, 'error');
        }
    }
}

async function reactivateDesignation(id) {
    if (confirm('Are you sure you want to reactivate this designation?')) {
        try {
            await api.updateDesignation(id, { isActive: true });
            loadDesignations();
            loadDashboardStats();
            showNotification('Designation reactivated successfully!', 'success');
        } catch (error) {
            showNotification('Error reactivating designation: ' + error.message, 'error');
        }
    }
}

async function toggleAdminStatus(id, isActive) {
    if (confirm(`Are you sure you want to ${isActive ? 'deactivate' : 'activate'} this admin?`)) {
        try {
            await api.toggleUserStatus(id);
            loadAdmins();
            loadDashboardStats();
            showNotification(`Admin ${isActive ? 'deactivated' : 'activated'} successfully!`, 'success');
        } catch (error) {
            showNotification('Error updating admin status: ' + error.message, 'error');
        }
    }
}

async function resetAdminPassword(id) {
    if (confirm('Are you sure you want to reset this admin\'s password?')) {
        const newPassword = prompt('Enter new password:');
        if (newPassword && newPassword.length >= 6) {
            try {
                await api.resetUserPassword(id, newPassword);
                showNotification('Admin password reset successfully!', 'success');
            } catch (error) {
                showNotification('Error resetting password: ' + error.message, 'error');
            }
        } else if (newPassword) {
            showNotification('Password must be at least 6 characters long', 'error');
        }
    }
}

function showNotification(message, type) {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
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
        background: ${type === 'success' ? '#48bb78' : '#f56565'};
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