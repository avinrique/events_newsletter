// Teacher Dashboard JavaScript
class TeacherDashboard {
    constructor() {
        console.log('🔄 TeacherDashboard v2.1 - NEW VERSION WITH IMAGE UPLOAD FIXES LOADED!');
        this.api = new API();
        this.currentUser = null;
        this.clubs = [];
        this.events = [];
        this.projects = [];
        this.students = [];
        this.allStudents = [];  // Store all students for filtering
        this.currentViewingStudent = null;
        
        this.init();
    }

    async init() {
        // Skip teacher authentication if we're on HOD page
        if (window.location.pathname === '/hod' || window.location.pathname.includes('/hod')) {
            return; // Let HOD.js handle authentication
        }

        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        // Step 1: authenticate. Failures clear the token and redirect.
        try {
            const authResponse = await this.api.getMe();
            if (!authResponse.success) {
                localStorage.removeItem('token');
                window.location.href = '/';
                return;
            }

            if (authResponse.data.role !== 'teacher') {
                const roleRoutes = {
                    'student': '/student',
                    'hod': '/hod',
                    'admin': '/admin',
                    'superadmin': '/superadmin'
                };
                window.location.href = roleRoutes[authResponse.data.role] || '/';
                return;
            }

            this.currentUser = authResponse.data;
        } catch (error) {
            console.error('Authentication error:', error);
            localStorage.removeItem('token');
            window.location.href = '/';
            return;
        }

        // Step 2: initialize the dashboard. Errors here must NOT redirect,
        // or we get an infinite /teacher <-> / loop.
        try {
            this.setupEventListeners();
            this.updateUserInfo();
            await this.loadDashboardData();
        } catch (error) {
            console.error('Dashboard init error (staying on page):', error);
            if (window.UI) UI.toast('Dashboard failed to initialize — see console.', 'error');
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('.nav-link').dataset.section;
                this.showSection(section);
            });
        });

        // Create Club button
        document.getElementById('createClubBtn').addEventListener('click', () => {
            this.showCreateClubModal();
        });

        // Create Club form
        document.getElementById('createClubForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateClub(e);
        });

        // Modal handling
        this.setupModalHandlers();

        // Edit Profile button
        document.getElementById('editProfileBtn').addEventListener('click', () => {
            this.showEditProfileModal();
        });

        // Edit Profile form
        document.getElementById('editProfileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditProfile(e);
        });

        // Create Event button
        const createEventBtn = document.getElementById('createEventBtn');
        if (createEventBtn) {
            createEventBtn.addEventListener('click', () => {
                this.showCreateEventModal();
            });
        }

        // Event action buttons (using event delegation)
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-event-action]');
            if (target) {
                const action = target.dataset.eventAction;
                const eventId = target.dataset.eventId;
                
                if (action === 'view') {
                    this.viewEvent(eventId);
                } else if (action === 'edit') {
                    this.editEvent(eventId);
                } else if (action === 'download') {
                    this.downloadEvent(eventId);
                } else if (action === 'delete') {
                    this.deleteEvent(eventId);
                }
            }

            // Handle image preview clicks
            if (e.target.classList.contains('event-image-preview')) {
                const imageUrl = e.target.dataset.imageUrl;
                window.open(imageUrl, '_blank');
            }

            // Handle delete actions
            const deleteTarget = e.target.closest('[data-action]');
            if (deleteTarget) {
                const action = deleteTarget.dataset.action;
                const eventId = deleteTarget.dataset.eventId;
                
                if (action === 'delete-event') {
                    this.deleteEvent(eventId);
                } else if (action === 'delete-image') {
                    const imageId = deleteTarget.dataset.imageId;
                    this.deleteEventImage(eventId, imageId, deleteTarget);
                }
            }
        });

        // Student filter
        document.getElementById('studentFilter').addEventListener('change', (e) => {
            this.filterStudents(e.target.value);
        });

        // Edit Student form
        document.getElementById('editStudentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditStudent(e);
        });

        // Edit Student button in view modal
        document.getElementById('editStudentBtn').addEventListener('click', () => {
            this.showEditStudentModal();
        });

        // Additional form event listeners
        document.getElementById('editInternshipForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveInternshipEdits();
        });

        document.getElementById('editProjectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProjectEdits();
        });

        document.getElementById('addCertificateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNewCertificate();
        });

        document.getElementById('addInternshipForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNewInternship();
        });

        document.getElementById('addProjectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNewProject();
        });

        document.getElementById('editCertificateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCertificateEdits();
        });

        // Tab navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('.tab-btn')) {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Delegated event listeners for dynamic content
        document.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (!action) return;

            switch (action) {
                case 'create-club':
                    this.showCreateClubModal();
                    break;
                case 'view-club':
                    this.viewClub(e.target.closest('[data-club-id]').dataset.clubId);
                    break;
                case 'edit-club':
                    this.editClub(e.target.closest('[data-club-id]').dataset.clubId);
                    break;
                case 'view-student':
                    this.viewStudentProfile(e.target.closest('[data-student-id]').dataset.studentId);
                    break;
                case 'edit-student':
                    this.editStudentProfile(e.target.closest('[data-student-id]').dataset.studentId);
                    break;
                case 'view-projects':
                    this.viewStudentProjects(e.target.closest('[data-student-id]').dataset.studentId);
                    break;
                case 'edit-certificate':
                    this.editCertificate(e.target.closest('[data-cert-id]').dataset.certId, this.currentViewingStudent._id);
                    break;
                case 'approve-certificate':
                    this.approveCertificate(e.target.closest('[data-cert-id]').dataset.certId);
                    break;
                case 'reject-certificate':
                    this.rejectCertificate(e.target.closest('[data-cert-id]').dataset.certId);
                    break;
                case 'view-certificate-details':
                    this.viewCertificateDetails(e.target.closest('[data-cert-id]').dataset.certId);
                    break;
                case 'view-certificate-file':
                    this.viewCertificateFile(e.target.closest('[data-cert-id]').dataset.certId);
                    break;
                case 'edit-internship':
                    this.editInternship(e.target.closest('[data-internship-id]').dataset.internshipId, this.currentViewingStudent._id);
                    break;
                case 'approve-internship':
                    this.approveInternship(e.target.closest('[data-internship-id]').dataset.internshipId);
                    break;
                case 'reject-internship':
                    this.rejectInternship(e.target.closest('[data-internship-id]').dataset.internshipId);
                    break;
                case 'view-internship-file':
                    window.open(e.target.closest('[data-file-url]').dataset.fileUrl, '_blank');
                    break;
                case 'edit-project':
                    this.editProject(e.target.closest('[data-project-id]').dataset.projectId, this.currentViewingStudent._id);
                    break;
                case 'approve-project':
                    this.approveProject(e.target.closest('[data-project-id]').dataset.projectId);
                    break;
                case 'reject-project':
                    this.rejectProject(e.target.closest('[data-project-id]').dataset.projectId);
                    break;
                case 'view-certificate':
                    this.viewCertificateFile(e.target.dataset.file);
                    break;
                case 'view-internship-doc':
                    this.viewInternshipDoc(e.target.dataset.file);
                    break;
                case 'view-github':
                    window.open(e.target.dataset.url, '_blank');
                    break;
                case 'add-certificate':
                    this.showAddCertificateModal();
                    break;
                case 'add-internship':
                    this.showAddInternshipModal();
                    break;
                case 'add-project':
                    this.showAddProjectModal();
                    break;
            }
        });
    }

    setupModalHandlers() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            // Close button
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeModal(modal.id);
                });
            }

            // Cancel buttons
            const cancelBtns = modal.querySelectorAll('[data-close-modal]');
            cancelBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.closeModal(modal.id);
                });
            });

            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        // Update page title
        const titles = {
            dashboard: 'Teacher Dashboard',
            clubs: 'My Clubs',
            events: 'My Events',
            projects: 'My Projects',
            students: 'My Students',
            profile: 'Profile'
        };
        document.getElementById('pageTitle').textContent = titles[sectionName] || 'Teacher Dashboard';

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    async loadSectionData(section) {
        switch (section) {
            case 'clubs':
                await this.loadClubs();
                break;
            case 'events':
                await this.loadEvents();
                break;
            case 'projects':
                await this.loadProjects();
                break;
            case 'students':
                await this.loadStudents();
                break;
            case 'profile':
                this.loadProfile();
                break;
        }
    }

    updateUserInfo() {
        document.getElementById('userName').textContent = this.currentUser.name;
        document.getElementById('userDepartment').textContent = this.currentUser.department?.name || 'Unknown Department';
    }

    async loadDashboardData() {
        this.showLoading();
        
        try {
            // Load all data in parallel
            await Promise.all([
                this.loadClubs(),
                this.loadEvents(),
                this.loadProjects(),
                this.loadStudents()
            ]);

            this.updateDashboardStats();
            this.loadRecentActivities();
            this.loadPendingApprovals();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        } finally {
            this.hideLoading();
        }
    }

    async loadClubs() {
        try {
            const response = await this.api.getClubs();
            if (response.success) {
                this.clubs = response.data;
                this.renderClubs();
            }
        } catch (error) {
            console.error('Error loading clubs:', error);
        }
    }

    async loadEvents() {
        try {
            const response = await this.api.request('/teacher-events');
            if (response.success) {
                this.events = response.data;
                this.renderEvents();
            }
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    async loadProjects() {
        try {
            const response = await this.api.request('/projects');
            if (response.success) {
                const myId = String(this.currentUser._id || this.currentUser.id);
                this.projects = response.data.filter(project => {
                    if (!project.mentor) return false;
                    const mentorId = String(project.mentor._id || project.mentor);
                    return mentorId === myId;
                });
                this.renderProjects();
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    async loadStudents() {
        try {
            // Try to load all students using new endpoint
            const response = await this.api.request('/users/students/all');
            
            if (response.success) {
                this.allStudents = response.data;  // Store all students separately
                this.students = [...this.allStudents];  // Copy for filtering
                
                // Debug: Log the loaded student data
                console.log('Loaded students:', this.allStudents.length);
                console.log('First student structure:', this.allStudents[0]);
                
                // Check for students with this teacher as proctor/classTeacher
                const currentUserId = this.currentUser._id || this.currentUser.id;
                const myStudents = this.allStudents.filter(student => {
                    const isProctor = student.proctor && student.proctor._id === currentUserId;
                    const isClassTeacher = student.classTeacher && student.classTeacher._id === currentUserId;
                    return isProctor || isClassTeacher;
                });
                console.log(`Students assigned to me: ${myStudents.length}`, myStudents.map(s => s.name));
                
                // Apply current filter
                const currentFilter = document.getElementById('studentFilter')?.value || 'all';
                this.filterStudents(currentFilter);
            }
        } catch (error) {
            console.error('Error loading students:', error);
            // Fallback to old method if new endpoint doesn't exist
            try {
                const fallbackResponse = await this.api.getUsers({ 
                    department: this.currentUser.department._id, 
                    role: 'student' 
                });
                if (fallbackResponse.success) {
                    this.allStudents = fallbackResponse.data;
                    this.students = [...this.allStudents];
                    this.renderStudents();
                }
            } catch (fallbackError) {
                console.error('Fallback error:', fallbackError);
                this.allStudents = [];
                this.students = [];
                this.renderStudents();
            }
        }
    }

    updateDashboardStats() {
        document.getElementById('totalClubs').textContent = this.clubs.length;
        document.getElementById('totalEvents').textContent = this.events.length;
        document.getElementById('totalProjects').textContent = this.projects.length;
        
        // For dashboard stats, show students assigned to this teacher as proctor/classTeacher
        const currentUserId = this.currentUser._id || this.currentUser.id;
        const assignedStudents = (this.allStudents || []).filter(student => {
            const isProctor = student.proctor && student.proctor._id === currentUserId;
            const isClassTeacher = student.classTeacher && student.classTeacher._id === currentUserId;
            return isProctor || isClassTeacher;
        });
        document.getElementById('totalStudents').textContent = assignedStudents.length;
    }

    renderClubs() {
        const clubsGrid = document.getElementById('clubsGrid');
        
        if (this.clubs.length === 0) {
            clubsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users fa-3x"></i>
                    <h3>No Clubs Yet</h3>
                    <p>Create your first club to get started</p>
                    <button class="btn btn-primary" data-action="create-club">
                        <i class="fas fa-plus"></i> Create Club
                    </button>
                </div>
            `;
            return;
        }

        clubsGrid.innerHTML = this.clubs.map(club => `
            <div class="club-card">
                <div class="club-header">
                    <h3 class="club-title">${this.escapeHtml(club.name)}</h3>
                    <span class="club-status ${club.status}">${club.status}</span>
                </div>
                <p class="club-purpose">${this.escapeHtml(club.purpose)}</p>
                <div class="club-meta">
                    <div class="club-members">
                        <i class="fas fa-users"></i>
                        <span>${club.memberCount || 0} members</span>
                    </div>
                    <div class="club-actions">
                        <button class="btn btn-sm btn-outline-primary" data-action="view-club" data-club-id="${club._id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${club.canManage ? `
                            <button class="btn btn-sm btn-outline-secondary" data-action="edit-club" data-club-id="${club._id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderEvents() {
        const eventsList = document.getElementById('eventsList');
        
        if (this.events.length === 0) {
            eventsList.innerHTML = '<p>No events created yet.</p>';
            return;
        }

        eventsList.innerHTML = this.events.map(event => {
            // Get the title from document content or fallback to basic title
            let displayTitle = event.title || 'Untitled Event';
            if (event.documentContent && event.documentContent.length > 0) {
                const titleContent = event.documentContent.find(item => item.type === 'title');
                if (titleContent && titleContent.content) {
                    displayTitle = titleContent.content;
                }
            }
            
            // Get description from document content or fallback to basic description
            let displayDescription = 'No description';
            if (event.documentContent && event.documentContent.length > 0) {
                const descriptionContent = event.documentContent.find(item => item.type === 'description');
                if (descriptionContent && descriptionContent.content) {
                    displayDescription = descriptionContent.content;
                } else if (event.description) {
                    displayDescription = event.description;
                }
            } else if (event.description) {
                displayDescription = event.description;
            }
            
            // Count document images in addition to regular images
            let totalImages = (event.images && event.images.length) || 0;
            if (event.documentContent) {
                totalImages += event.documentContent.filter(item => item.type === 'image' && item.imageUrl).length;
            }
            
            return `
                <div class="event-card" style="border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div class="event-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <h4 style="margin: 0; color: #2c3e50; font-size: 18px; font-weight: 600;">${this.escapeHtml(displayTitle)}</h4>
                        <div class="event-actions" style="display: flex; gap: 6px;">
                            <button class="btn btn-sm btn-outline-primary" data-event-action="view" data-event-id="${event._id}" style="padding: 6px 10px; font-size: 12px;">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" data-event-action="edit" data-event-id="${event._id}" style="padding: 6px 10px; font-size: 12px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-success" data-event-action="download" data-event-id="${event._id}" style="padding: 6px 10px; font-size: 12px;">
                                <i class="fas fa-download"></i> Download
                            </button>
                            <button class="btn btn-sm btn-outline-danger" data-event-action="delete" data-event-id="${event._id}" style="padding: 6px 10px; font-size: 12px;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                    
                    <p style="margin: 8px 0 12px 0; color: #555; line-height: 1.5; font-size: 14px;">${this.escapeHtml(displayDescription.substring(0, 120))}${displayDescription.length > 120 ? '...' : ''}</p>
                    
                    <div class="event-meta" style="display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0; font-size: 13px; color: #666;">
                        <span style="display: flex; align-items: center; gap: 4px;">
                            <i class="fas fa-calendar" style="color: #007bff;"></i> ${this.formatDate(event.eventDate)}
                        </span>
                        <span style="display: flex; align-items: center; gap: 4px;">
                            <i class="fas fa-users" style="color: #28a745;"></i> Students: ${event.studentsInvolved?.length || 0}
                        </span>
                        <span style="display: flex; align-items: center; gap: 4px;">
                            <i class="fas fa-user-tie" style="color: #6f42c1;"></i> Teachers: ${event.teachersInvolved?.length || 0}
                        </span>
                        ${totalImages > 0 ? `
                            <span style="display: flex; align-items: center; gap: 4px;">
                                <i class="fas fa-images" style="color: #fd7e14;"></i> Images: ${totalImages}
                            </span>
                        ` : ''}
                        ${event.documentContent && event.documentContent.length > 0 ? `
                            <span style="display: flex; align-items: center; gap: 4px;">
                                <i class="fas fa-file-alt" style="color: #20c997;"></i> Document: ${event.documentContent.length} sections
                            </span>
                        ` : ''}
                    </div>
                    
                    <div class="event-status" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f8f9fa;">
                        <span class="badge" style="background: ${event.status === 'published' ? '#28a745' : event.status === 'draft' ? '#6c757d' : '#ffc107'}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; text-transform: capitalize;">
                            ${event.status || 'published'}
                        </span>
                        <small style="color: #6c757d; margin-left: 8px;">
                            Created ${this.formatDate(event.createdAt)}
                            ${event.createdBy && (event.createdBy.firstName || event.createdBy.name) ? ` by ${event.createdBy.firstName || event.createdBy.name} ${event.createdBy.lastName || ''}` : ''}
                        </small>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderProjects() {
        const projectsList = document.getElementById('projectsList');
        
        if (this.projects.length === 0) {
            projectsList.innerHTML = '<p>No projects under mentorship.</p>';
            return;
        }

        projectsList.innerHTML = this.projects.map(project => `
            <div class="project-card">
                <h4>${this.escapeHtml(project.title)}</h4>
                <p>${this.escapeHtml(project.description || 'No description')}</p>
                <div class="project-meta">
                    <span><i class="fas fa-code"></i> ${project.projectType}</span>
                    <span><i class="fas fa-calendar"></i> ${this.formatDate(project.createdAt)}</span>
                </div>
            </div>
        `).join('');
    }

    renderStudents() {
        const studentsGrid = document.getElementById('studentsGrid');
        
        if (this.students.length === 0) {
            studentsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-graduate fa-3x"></i>
                    <h3>No Students Assigned</h3>
                    <p>No students are assigned to you as proctor or class teacher</p>
                </div>
            `;
            return;
        }

        const currentUserId = this.currentUser._id || this.currentUser.id;
        studentsGrid.innerHTML = this.students.map(student => {
            const isProctor = student.proctor && student.proctor._id === currentUserId;
            const isClassTeacher = student.classTeacher && student.classTeacher._id === currentUserId;
            const relationship = isProctor && isClassTeacher ? 'Proctor & Class Teacher' :
                               isProctor ? 'Proctor' :
                               isClassTeacher ? 'Class Teacher' : 'Department Student';
            
            return `
                <div class="student-card enhanced">
                    <div class="student-header">
                        <div class="student-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="student-info">
                            <h4 class="student-name">${this.escapeHtml(student.name)}</h4>
                            <p class="student-id">${this.escapeHtml(student.usn || student.tempUSN || 'No USN')}</p>
                            <p class="student-roll">Roll: ${this.escapeHtml(student.rollNumber || 'N/A')}</p>
                        </div>
                    </div>
                    
                    <div class="student-details">
                        <div class="detail-item">
                            <i class="fas fa-graduation-cap"></i>
                            <span>Semester ${student.semester || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-user-tie"></i>
                            <span class="relationship ${isProctor || isClassTeacher ? 'assigned' : 'department'}">${relationship}</span>
                        </div>
                    </div>
                    
                    <div class="student-actions">
                        <button class="btn btn-sm btn-outline-primary" data-action="view-student" data-student-id="${student._id}">
                            <i class="fas fa-eye"></i> View Profile
                        </button>
                        ${(isProctor || isClassTeacher) ? `
                            <button class="btn btn-sm btn-outline-secondary" data-action="edit-student" data-student-id="${student._id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-outline-primary" data-action="view-projects" data-student-id="${student._id}">
                            <i class="fas fa-project-diagram"></i> Projects
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadProfile() {
        // Load basic profile info
        document.getElementById('profileName').textContent = this.currentUser.name;
        document.getElementById('profileDesignation').textContent = this.currentUser.designation?.title || 'Teacher';
        document.getElementById('profileDepartment').textContent = this.currentUser.department?.name || 'Unknown';
        document.getElementById('profileEmail').textContent = this.currentUser.email;
        document.getElementById('profileEmployeeId').textContent = this.currentUser.employeeId || 'N/A';
        document.getElementById('profilePhone').textContent = this.currentUser.contactNumber || 'N/A';
        document.getElementById('profileJoinDate').textContent = this.formatDate(this.currentUser.createdAt);
        
        // Load enhanced profile elements
        document.getElementById('profileFullName').textContent = this.currentUser.name;
        document.getElementById('profilePosition').textContent = this.currentUser.position || 'Teacher';
        document.getElementById('profileDept').textContent = this.currentUser.department?.name || 'Unknown';
        
        // Load profile image if exists
        if (this.currentUser.profileImage) {
            const img = document.getElementById('profileImageDisplay');
            const icon = document.getElementById('profileDefaultIcon');
            
            img.src = this.currentUser.profileImage;
            img.style.display = 'block';
            icon.style.display = 'none';
        }
        
        // Load statistics
        await this.loadProfileStats();
        
        // Setup image upload functionality
        this.setupImageUpload();
    }
    
    async loadProfileStats() {
        try {
            const myId = String(this.currentUser._id || this.currentUser.id);
            const sameId = (ref) => {
                if (!ref) return false;
                const id = typeof ref === 'object' ? (ref._id || ref.id) : ref;
                return String(id) === myId;
            };

            // Count projects mentored by this teacher
            const projectsResponse = await this.api.request('/projects');
            const myProjects = projectsResponse.success ?
                projectsResponse.data.filter(p => sameId(p.mentor) || sameId(p.primaryMentor)) : [];

            // Count students assigned to this teacher (use /users/students/all so we see all students)
            const studentsResponse = await this.api.request('/users/students/all');
            const myStudents = studentsResponse.success ?
                studentsResponse.data.filter(s => sameId(s.proctor) || sameId(s.classTeacher)) : [];

            // Count events created by this teacher
            const eventsResponse = await this.api.request('/teacher-events');
            const myEvents = eventsResponse.success ?
                eventsResponse.data.filter(e => sameId(e.createdBy)) : [];

            // Count clubs managed by this teacher
            const clubsResponse = await this.api.request('/clubs');
            const myClubs = clubsResponse.success ?
                clubsResponse.data.filter(c => sameId(c.mentor) || sameId(c.mentorId)) : [];
            
            // Update stats
            document.getElementById('profileProjectsCount').textContent = myProjects.length;
            document.getElementById('profileStudentsCount').textContent = myStudents.length;
            document.getElementById('profileEventsCount').textContent = myEvents.length;
            document.getElementById('profileClubsCount').textContent = myClubs.length;
            
        } catch (error) {
            console.error('Error loading profile stats:', error);
            // Set default values if error
            document.getElementById('profileProjectsCount').textContent = '0';
            document.getElementById('profileStudentsCount').textContent = '0';
            document.getElementById('profileEventsCount').textContent = '0';
            document.getElementById('profileClubsCount').textContent = '0';
        }
    }
    
    setupImageUpload() {
        const uploadBtn = document.getElementById('uploadProfileImageBtn');
        const fileInput = document.getElementById('profileImageInput');
        const avatarContainer = document.getElementById('profileAvatarContainer');
        
        // Upload button click
        uploadBtn?.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Avatar click
        avatarContainer?.addEventListener('click', () => {
            fileInput.click();
        });
        
        // File input change
        fileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageUpload(file);
            }
        });
    }
    
    async handleImageUpload(file) {
        // Validate file
        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showError('Image size should be less than 5MB');
            return;
        }
        
        try {
            this.showLoading();
            
            // Create FormData
            const formData = new FormData();
            formData.append('profileImage', file);
            
            // Upload image
            const response = await this.api.uploadProfileImage(formData);
            
            if (response.success) {
                // Update UI immediately
                const img = document.getElementById('profileImageDisplay');
                const icon = document.getElementById('profileDefaultIcon');
                
                // Create preview URL
                const previewUrl = URL.createObjectURL(file);
                img.src = previewUrl;
                img.style.display = 'block';
                icon.style.display = 'none';
                
                // Update current user data
                this.currentUser.profileImage = response.data.profileImage;
                
                this.showSuccess('Profile image updated successfully!');
            } else {
                this.showError(response.message || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            this.showError('Failed to upload image');
        } finally {
            this.hideLoading();
        }
    }

    showEditProfileModal() {
        // Pre-fill the form with current user data
        document.getElementById('editName').value = this.currentUser.name || '';
        document.getElementById('editEmail').value = this.currentUser.email || '';
        document.getElementById('editContactNumber').value = this.currentUser.contactNumber || '';
        
        // Show the modal
        document.getElementById('editProfileModal').style.display = 'flex';
    }

    async handleEditProfile(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const hasFile = formData.get('profileImage') && formData.get('profileImage').size > 0;
        
        try {
            this.showLoading();
            
            let response;
            if (hasFile) {
                // If there's a file, send as FormData
                const profileData = new FormData();
                profileData.append('name', formData.get('name'));
                profileData.append('email', formData.get('email'));
                profileData.append('contactNumber', formData.get('contactNumber'));
                profileData.append('profileImage', formData.get('profileImage'));
                
                response = await this.api.updateProfile(profileData);
            } else {
                // If no file, send as JSON
                const profileData = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    contactNumber: formData.get('contactNumber')
                };
                
                response = await this.api.updateProfile(profileData);
            }
            
            if (response.success) {
                this.currentUser = response.data;
                this.showSuccess('Profile updated successfully!');
                this.closeModal('editProfileModal');
                this.loadProfile();
                this.updateUserInfo();
            } else {
                this.showError(response.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showError('Failed to update profile');
        } finally {
            this.hideLoading();
        }
    }

    filterStudents(filterType) {
        if (!this.allStudents || this.allStudents.length === 0) {
            console.log('No students loaded yet');
            return;
        }

        let filteredStudents = [];
        console.log(`Filtering students by: ${filterType}`);
        console.log(`Total students available: ${this.allStudents.length}`);
        const currentUserId = this.currentUser._id || this.currentUser.id;
        console.log(`Current teacher ID: ${currentUserId}`);
        console.log('Current user object:', this.currentUser);

        // Debug: Log first few students to see their structure
        if (this.allStudents.length > 0) {
            console.log('Sample student data:', {
                student: this.allStudents[0],
                proctor: this.allStudents[0].proctor,
                classTeacher: this.allStudents[0].classTeacher
            });
        }

        switch (filterType) {
            case 'all':
                filteredStudents = [...this.allStudents];
                break;
            case 'assigned':
                filteredStudents = this.allStudents.filter(student => {
                    const isProctor = student.proctor && student.proctor._id === currentUserId;
                    const isClassTeacher = student.classTeacher && student.classTeacher._id === currentUserId;
                    console.log(`Student ${student.name}:`, {
                        proctorId: student.proctor?._id,
                        classTeacherId: student.classTeacher?._id,
                        currentUserId: currentUserId,
                        isProctor,
                        isClassTeacher
                    });
                    return isProctor || isClassTeacher;
                });
                break;
            case 'proctor':
                filteredStudents = this.allStudents.filter(student => {
                    const result = student.proctor && student.proctor._id === currentUserId;
                    console.log(`Student ${student.name} - Proctor check:`, {
                        hasProctor: !!student.proctor,
                        proctorId: student.proctor?._id,
                        currentUserId: currentUserId,
                        match: result
                    });
                    return result;
                });
                break;
            case 'classteacher':
                filteredStudents = this.allStudents.filter(student => {
                    const result = student.classTeacher && student.classTeacher._id === currentUserId;
                    console.log(`Student ${student.name} - Class Teacher check:`, {
                        hasClassTeacher: !!student.classTeacher,
                        classTeacherId: student.classTeacher?._id,
                        currentUserId: currentUserId,
                        match: result
                    });
                    return result;
                });
                break;
            case 'mentor':
                // This would filter students who have requested this teacher as mentor
                // For now, we'll show empty state as this requires additional API endpoints
                filteredStudents = [];
                break;
            default:
                filteredStudents = [...this.allStudents];
        }

        console.log(`Filtered students count: ${filteredStudents.length}`);
        console.log('Filtered students:', filteredStudents.map(s => s.name));
        this.students = filteredStudents; // Update the current students array
        this.renderFilteredStudents(filteredStudents, filterType);
    }

    renderFilteredStudents(students, filterType) {
        const studentsGrid = document.getElementById('studentsGrid');
        
        if (students.length === 0) {
            let emptyMessage = '';
            switch (filterType) {
                case 'assigned':
                    emptyMessage = 'No students are assigned to you as proctor or class teacher';
                    break;
                case 'proctor':
                    emptyMessage = 'No students have you as their proctor';
                    break;
                case 'classteacher':
                    emptyMessage = 'No students have you as their class teacher';
                    break;
                case 'mentor':
                    emptyMessage = 'No students have requested you as a project mentor';
                    break;
                default:
                    emptyMessage = 'No students found';
            }
            
            studentsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-graduate fa-3x"></i>
                    <h3>No Students Found</h3>
                    <p>${emptyMessage}</p>
                </div>
            `;
            return;
        }

        const currentUserId = this.currentUser._id || this.currentUser.id;
        studentsGrid.innerHTML = students.map(student => {
            const isProctor = student.proctor && student.proctor._id === currentUserId;
            const isClassTeacher = student.classTeacher && student.classTeacher._id === currentUserId;
            const relationship = isProctor && isClassTeacher ? 'Proctor & Class Teacher' :
                               isProctor ? 'Proctor' :
                               isClassTeacher ? 'Class Teacher' : 'Department Student';
            
            return `
                <div class="student-card enhanced">
                    <div class="student-header">
                        <div class="student-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="student-info">
                            <h4 class="student-name">${this.escapeHtml(student.name)}</h4>
                            <p class="student-id">${this.escapeHtml(student.usn || student.tempUSN || 'No USN')}</p>
                            <p class="student-roll">Roll: ${this.escapeHtml(student.rollNumber || 'N/A')}</p>
                        </div>
                    </div>
                    
                    <div class="student-details">
                        <div class="detail-item">
                            <i class="fas fa-graduation-cap"></i>
                            <span>Semester ${student.semester || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-user-tie"></i>
                            <span class="relationship ${isProctor || isClassTeacher ? 'assigned' : 'department'}">${relationship}</span>
                        </div>
                    </div>
                    
                    <div class="student-actions">
                        <button class="btn btn-sm btn-outline-primary" data-action="view-student" data-student-id="${student._id}">
                            <i class="fas fa-eye"></i> View Profile
                        </button>
                        ${(isProctor || isClassTeacher) ? `
                            <button class="btn btn-sm btn-outline-secondary" data-action="edit-student" data-student-id="${student._id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-outline-primary" data-action="view-projects" data-student-id="${student._id}">
                            <i class="fas fa-project-diagram"></i> Projects
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    loadRecentActivities() {
        const activities = document.getElementById('recentActivities');
        // This would typically load from an activities API endpoint
        activities.innerHTML = '<p>No recent activities.</p>';
    }

    loadPendingApprovals() {
        const approvals = document.getElementById('pendingApprovals');
        // Show pending student project approvals, club join requests, etc.
        approvals.innerHTML = '<p>No pending approvals.</p>';
    }

    showCreateClubModal() {
        document.getElementById('createClubModal').style.display = 'flex';
        document.getElementById('createClubForm').reset();
    }

    async handleCreateClub(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const clubData = {
            name: formData.get('name'),
            purpose: formData.get('purpose'),
            description: formData.get('description'),
            establishedDate: formData.get('establishedDate'),
            socialMedia: {
                website: formData.get('website'),
                email: formData.get('email'),
                instagram: formData.get('instagram'),
                linkedin: formData.get('linkedin')
            }
        };

        // Remove empty social media fields
        Object.keys(clubData.socialMedia).forEach(key => {
            if (!clubData.socialMedia[key]) {
                delete clubData.socialMedia[key];
            }
        });

        try {
            this.showLoading();
            const response = await this.api.createClub(clubData);
            
            if (response.success) {
                this.showSuccess('Club created successfully! Waiting for HOD approval.');
                this.closeModal('createClubModal');
                await this.loadClubs();
            } else {
                this.showError(response.message || 'Failed to create club');
            }
        } catch (error) {
            console.error('Error creating club:', error);
            this.showError('Failed to create club');
        } finally {
            this.hideLoading();
        }
    }

    viewClub(clubId) {
        // Implement club view functionality
        console.log('View club:', clubId);
    }

    editClub(clubId) {
        // Implement club edit functionality
        console.log('Edit club:', clubId);
    }

    // Student Management Methods
    async viewStudentProfile(studentId) {
        try {
            const student = this.students.find(s => s._id === studentId);
            if (!student) {
                this.showError('Student not found');
                return;
            }

            this.currentViewingStudent = student;

            // Populate the modal
            document.getElementById('modalStudentName').textContent = student.name;
            document.getElementById('modalStudentId').textContent = student.usn || student.tempUSN || 'No USN';
            document.getElementById('modalStudentDepartment').textContent = student.department?.name || 'Unknown Department';
            document.getElementById('modalStudentEmail').textContent = student.email;
            document.getElementById('modalStudentRoll').textContent = student.rollNumber || 'N/A';
            document.getElementById('modalStudentSemester').textContent = `Semester ${student.semester || 'N/A'}`;
            document.getElementById('modalStudentContact').textContent = student.contactNumber || 'N/A';
            document.getElementById('modalStudentJoined').textContent = this.formatDate(student.createdAt);
            document.getElementById('modalStudentProctor').textContent = student.proctor?.name || 'Not Assigned';
            document.getElementById('modalStudentClassTeacher').textContent = student.classTeacher?.name || 'Not Assigned';

            // Determine relationship
            const currentUserId = this.currentUser._id || this.currentUser.id;
            const isProctor = student.proctor && student.proctor._id === currentUserId;
            const isClassTeacher = student.classTeacher && student.classTeacher._id === currentUserId;
            const relationship = isProctor && isClassTeacher ? 'Proctor & Class Teacher' :
                               isProctor ? 'Proctor' :
                               isClassTeacher ? 'Class Teacher' : 'No Direct Relationship';
            
            document.getElementById('modalStudentRelationship').textContent = relationship;
            document.getElementById('modalStudentRelationship').className = `relationship-badge ${isProctor || isClassTeacher ? 'assigned' : 'department'}`;

            // Show edit button only if teacher is proctor or class teacher
            const editBtn = document.getElementById('editStudentBtn');
            const addCertBtn = document.getElementById('addCertificateBtn');
            const addInternBtn = document.getElementById('addInternshipBtn');
            const addProjBtn = document.getElementById('addProjectBtn');
            
            if (isProctor || isClassTeacher) {
                editBtn.style.display = 'inline-block';
                if (addCertBtn) addCertBtn.style.display = 'inline-block';
                if (addInternBtn) addInternBtn.style.display = 'inline-block';  
                if (addProjBtn) addProjBtn.style.display = 'inline-block';
            } else {
                editBtn.style.display = 'none';
                if (addCertBtn) addCertBtn.style.display = 'none';
                if (addInternBtn) addInternBtn.style.display = 'none';
                if (addProjBtn) addProjBtn.style.display = 'none';
            }

            // Show the modal
            document.getElementById('viewStudentModal').style.display = 'flex';
            
            // Switch to certificates tab by default and load data
            this.switchTab('certificates');
        } catch (error) {
            console.error('Error viewing student profile:', error);
            this.showError('Failed to view student profile');
        }
    }

    editStudentProfile(studentId) {
        // This method is kept for compatibility but redirects to viewStudentProfile
        this.viewStudentProfile(studentId);
    }

    showEditStudentModal() {
        if (!this.currentViewingStudent) return;

        const student = this.currentViewingStudent;
        
        // Pre-fill the form
        document.getElementById('editStudentId').value = student._id;
        document.getElementById('editStudentName').value = student.name || '';
        document.getElementById('editStudentEmail').value = student.email || '';
        document.getElementById('editStudentContact').value = student.contactNumber || '';
        document.getElementById('editStudentSemester').value = student.semester || '';

        // Close view modal and show edit modal
        this.closeModal('viewStudentModal');
        document.getElementById('editStudentModal').style.display = 'flex';
    }

    async handleEditStudent(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const studentId = formData.get('studentId');
        
        const updateData = {
            name: formData.get('name'),
            email: formData.get('email'),
            contactNumber: formData.get('contactNumber'),
            semester: parseInt(formData.get('semester'))
        };

        try {
            this.showLoading();
            
            const response = await this.api.request(`/users/${studentId}`, {
                method: 'PUT',
                body: updateData
            });
            
            if (response.success) {
                this.showSuccess('Student profile updated successfully!');
                this.closeModal('editStudentModal');
                
                // Reload students to get updated data
                await this.loadStudents();
                
                // Update current viewing student
                this.currentViewingStudent = this.students.find(s => s._id === studentId);
            } else {
                this.showError(response.message || 'Failed to update student profile');
            }
        } catch (error) {
            console.error('Error updating student:', error);
            this.showError('Failed to update student profile');
        } finally {
            this.hideLoading();
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`${tabName}Tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Load tab-specific data
        if (this.currentViewingStudent) {
            switch (tabName) {
                case 'certificates':
                    this.loadStudentCertificates(this.currentViewingStudent._id);
                    break;
                case 'internships':
                    this.loadStudentInternships(this.currentViewingStudent._id);
                    break;
                case 'projects':
                    this.loadStudentProjects(this.currentViewingStudent._id);
                    break;
            }
        }
    }

    async loadStudentCertificates(studentId) {
        try {
            const response = await this.api.request(`/certificates?student=${studentId}`);
            
            if (response.success) {
                this.renderStudentCertificates(response.data);
            } else {
                document.getElementById('studentCertificates').innerHTML = '<p>Failed to load certificates</p>';
            }
        } catch (error) {
            console.error('Error loading student certificates:', error);
            document.getElementById('studentCertificates').innerHTML = '<p>No certificates found</p>';
        }
    }

    async loadStudentInternships(studentId) {
        try {
            const response = await this.api.request(`/internships?student=${studentId}`);
            
            if (response.success) {
                this.renderStudentInternships(response.data);
            } else {
                document.getElementById('studentInternships').innerHTML = '<p>Failed to load internships</p>';
            }
        } catch (error) {
            console.error('Error loading student internships:', error);
            document.getElementById('studentInternships').innerHTML = '<p>No internships found</p>';
        }
    }

    async loadStudentProjects(studentId) {
        try {
            const response = await this.api.request(`/projects?student=${studentId}`);
            
            if (response.success) {
                this.renderStudentProjects(response.data);
            } else {
                document.getElementById('studentProjects').innerHTML = '<p>Failed to load projects</p>';
            }
        } catch (error) {
            console.error('Error loading student projects:', error);
            document.getElementById('studentProjects').innerHTML = '<p>No projects found</p>';
        }
    }

    renderStudentCertificates(certificates) {
        const container = document.getElementById('studentCertificates');
        
        if (!certificates || certificates.length === 0) {
            container.innerHTML = '<p>No certificates found for this student</p>';
            return;
        }

        const currentUserId = this.currentUser._id || this.currentUser.id;
        const canEdit = this.currentViewingStudent.proctor?._id === currentUserId || 
                       this.currentViewingStudent.classTeacher?._id === currentUserId;

        container.innerHTML = certificates.map(cert => `
            <div class="certificate-item">
                <div class="item-header">
                    <h5 class="item-title">${this.escapeHtml(cert.title || 'Untitled Certificate')}</h5>
                    <span class="item-status ${cert.status || 'pending'}">${cert.status || 'pending'}</span>
                </div>
                <div class="item-details">
                    <p><strong>Issuer:</strong> ${this.escapeHtml(cert.issuer || 'N/A')}</p>
                    <p><strong>Category:</strong> ${this.escapeHtml(cert.category || 'N/A')}</p>
                    <p><strong>Date:</strong> ${cert.dateIssued ? this.formatDate(cert.dateIssued) : 'N/A'}</p>
                    ${cert.certificateNumber ? `<p><strong>Certificate #:</strong> ${this.escapeHtml(cert.certificateNumber)}</p>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline-info" data-action="view-certificate-details" data-cert-id="${cert._id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${canEdit ? `
                        <button class="btn btn-sm btn-outline-primary" data-action="edit-certificate" data-cert-id="${cert._id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        ${cert.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" data-action="approve-certificate" data-cert-id="${cert._id}">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-sm btn-danger" data-action="reject-certificate" data-cert-id="${cert._id}">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        ` : ''}
                    ` : ''}
                    ${(cert.files && cert.files.length > 0) || cert.certificateUrl ? `
                        <button class="btn btn-sm btn-outline-success" data-action="view-certificate-file" data-cert-id="${cert._id}">
                            <i class="fas fa-download"></i> View File
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    renderStudentInternships(internships) {
        const container = document.getElementById('studentInternships');
        
        if (!internships || internships.length === 0) {
            container.innerHTML = '<p>No internships found for this student</p>';
            return;
        }

        const currentUserId = this.currentUser._id || this.currentUser.id;
        const canEdit = this.currentViewingStudent.proctor?._id === currentUserId || 
                       this.currentViewingStudent.classTeacher?._id === currentUserId;

        container.innerHTML = internships.map(internship => `
            <div class="internship-item">
                <div class="item-header">
                    <h5 class="item-title">${this.escapeHtml(internship.companyName || 'Untitled Internship')}</h5>
                    <span class="item-status ${internship.status || 'pending'}">${internship.status || 'pending'}</span>
                </div>
                <div class="item-details">
                    <p><strong>Position:</strong> ${this.escapeHtml(internship.position || 'N/A')}</p>
                    <p><strong>Duration:</strong> ${internship.startDate ? this.formatDate(internship.startDate) : 'N/A'} - ${internship.endDate ? this.formatDate(internship.endDate) : (internship.currentlyWorking ? 'Present' : 'N/A')}</p>
                    <p><strong>Location:</strong> ${this.escapeHtml(internship.location || 'N/A')}</p>
                    ${internship.description ? `<p><strong>Description:</strong> ${this.escapeHtml(internship.description).substring(0, 100)}${internship.description.length > 100 ? '...' : ''}</p>` : ''}
                </div>
                ${canEdit ? `
                    <div class="item-actions">
                        <button class="btn btn-sm btn-outline-primary" data-action="edit-internship" data-internship-id="${internship._id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        ${internship.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" data-action="approve-internship" data-internship-id="${internship._id}">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-sm btn-danger" data-action="reject-internship" data-internship-id="${internship._id}">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        ` : ''}
                        ${internship.files?.offerLetter ? `
                            <button class="btn btn-sm btn-outline-info" data-action="view-internship-file" data-file-url="${internship.files.offerLetter.fileUrl}">
                                <i class="fas fa-file"></i> Offer Letter
                            </button>
                        ` : ''}
                        ${internship.files?.joiningLetter ? `
                            <button class="btn btn-sm btn-outline-info" data-action="view-internship-file" data-file-url="${internship.files.joiningLetter.fileUrl}">
                                <i class="fas fa-file"></i> Joining Letter
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    renderStudentProjects(projects) {
        const container = document.getElementById('studentProjects');
        
        if (!projects || projects.length === 0) {
            container.innerHTML = '<p>No projects found for this student</p>';
            return;
        }

        const currentUserId = this.currentUser._id || this.currentUser.id;
        const canEdit = this.currentViewingStudent.proctor?._id === currentUserId || 
                       this.currentViewingStudent.classTeacher?._id === currentUserId;

        container.innerHTML = projects.map(project => `
            <div class="project-item">
                <div class="item-header">
                    <h5 class="item-title">${this.escapeHtml(project.title || 'Untitled Project')}</h5>
                    <span class="item-status ${project.approvalStatus || 'pending'}">${project.approvalStatus || 'pending'}</span>
                </div>
                <div class="item-details">
                    <p><strong>Type:</strong> ${this.escapeHtml(project.studentProjectType || project.teacherProjectType || 'N/A')}</p>
                    <p><strong>Domain:</strong> ${this.escapeHtml(project.domain || 'N/A')}</p>
                    <p><strong>Technologies:</strong> ${project.technicalDetails?.technologies ? project.technicalDetails.technologies.join(', ') : 'N/A'}</p>
                    <p><strong>Status:</strong> ${this.escapeHtml(project.currentStatus || 'N/A')}</p>
                    ${project.timeline?.startDate ? `<p><strong>Start Date:</strong> ${this.formatDate(project.timeline.startDate)}</p>` : ''}
                    ${project.description ? `<p><strong>Description:</strong> ${this.escapeHtml(project.description).substring(0, 100)}${project.description.length > 100 ? '...' : ''}</p>` : ''}
                </div>
                ${canEdit ? `
                    <div class="item-actions">
                        <button class="btn btn-sm btn-outline-primary" data-action="edit-project" data-project-id="${project._id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        ${project.approvalStatus === 'pending-approval' ? `
                            <button class="btn btn-sm btn-success" data-action="approve-project" data-project-id="${project._id}">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-sm btn-danger" data-action="reject-project" data-project-id="${project._id}">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        ` : ''}
                        ${project.files?.codeRepository?.url ? `
                            <button class="btn btn-sm btn-outline-info" data-action="view-github" data-url="${project.files.codeRepository.url}">
                                <i class="fab fa-github"></i> GitHub
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    // Approval/Rejection methods
    async approveCertificate(certId) {
        try {
            this.showLoading();
            const response = await this.api.request(`/certificates/${certId}/approve`, {
                method: 'PUT'
            });
            
            if (response.success) {
                this.showSuccess('Certificate approved successfully!');
                // Reload certificates
                if (this.currentViewingStudent) {
                    this.loadStudentCertificates(this.currentViewingStudent._id);
                }
            } else {
                this.showError(response.message || 'Failed to approve certificate');
            }
        } catch (error) {
            console.error('Error approving certificate:', error);
            this.showError('Failed to approve certificate');
        } finally {
            this.hideLoading();
        }
    }

    async rejectCertificate(certId) {
        try {
            this.showLoading();
            const response = await this.api.request(`/certificates/${certId}/reject`, {
                method: 'PUT'
            });
            
            if (response.success) {
                this.showSuccess('Certificate rejected');
                // Reload certificates
                if (this.currentViewingStudent) {
                    this.loadStudentCertificates(this.currentViewingStudent._id);
                }
            } else {
                this.showError(response.message || 'Failed to reject certificate');
            }
        } catch (error) {
            console.error('Error rejecting certificate:', error);
            this.showError('Failed to reject certificate');
        } finally {
            this.hideLoading();
        }
    }

    async approveInternship(internshipId) {
        try {
            this.showLoading();
            const response = await this.api.request(`/internships/${internshipId}/approve`, {
                method: 'PUT'
            });
            
            if (response.success) {
                this.showSuccess('Internship approved successfully!');
                // Reload internships
                if (this.currentViewingStudent) {
                    this.loadStudentInternships(this.currentViewingStudent._id);
                }
            } else {
                this.showError(response.message || 'Failed to approve internship');
            }
        } catch (error) {
            console.error('Error approving internship:', error);
            this.showError('Failed to approve internship');
        } finally {
            this.hideLoading();
        }
    }

    async rejectInternship(internshipId) {
        try {
            this.showLoading();
            const response = await this.api.request(`/internships/${internshipId}/reject`, {
                method: 'PUT'
            });
            
            if (response.success) {
                this.showSuccess('Internship rejected');
                // Reload internships
                if (this.currentViewingStudent) {
                    this.loadStudentInternships(this.currentViewingStudent._id);
                }
            } else {
                this.showError(response.message || 'Failed to reject internship');
            }
        } catch (error) {
            console.error('Error rejecting internship:', error);
            this.showError('Failed to reject internship');
        } finally {
            this.hideLoading();
        }
    }

    async approveProject(projectId) {
        try {
            this.showLoading();
            const response = await this.api.request(`/projects/${projectId}/approve`, {
                method: 'PUT'
            });
            
            if (response.success) {
                this.showSuccess('Project approved successfully!');
                // Reload projects
                if (this.currentViewingStudent) {
                    this.loadStudentProjects(this.currentViewingStudent._id);
                }
            } else {
                this.showError(response.message || 'Failed to approve project');
            }
        } catch (error) {
            console.error('Error approving project:', error);
            this.showError('Failed to approve project');
        } finally {
            this.hideLoading();
        }
    }

    async rejectProject(projectId) {
        try {
            this.showLoading();
            const response = await this.api.request(`/projects/${projectId}/reject`, {
                method: 'PUT'
            });
            
            if (response.success) {
                this.showSuccess('Project rejected');
                // Reload projects
                if (this.currentViewingStudent) {
                    this.loadStudentProjects(this.currentViewingStudent._id);
                }
            } else {
                this.showError(response.message || 'Failed to reject project');
            }
        } catch (error) {
            console.error('Error rejecting project:', error);
            this.showError('Failed to reject project');
        } finally {
            this.hideLoading();
        }
    }

    viewCertificateFile(filename) {
        if (filename) {
            window.open(`/uploads/certificates/${filename}`, '_blank');
        }
    }

    viewInternshipDoc(filename) {
        if (filename) {
            window.open(`/uploads/internships/${filename}`, '_blank');
        }
    }

    async viewStudentProjects(studentId) {
        // This method is kept for backward compatibility
        await this.loadStudentProjects(studentId);
    }

    async editCertificate(certificateId, studentId) {
        try {
            const response = await this.api.request(`/certificates/${certificateId}`, {
                method: 'GET'
            });
            if (!response.success) {
                throw new Error(response.message);
            }

            const certificate = response.data;
            this.openEditCertificateModal(certificate, studentId);
        } catch (error) {
            console.error('Error loading certificate:', error);
            this.showError('Failed to load certificate data');
        }
    }

    openEditCertificateModal(certificate, studentId) {
        const modal = document.getElementById('editCertificateModal');
        
        // Debug: Log the certificate data
        console.log('🔍 Certificate data received:', certificate);
        console.log('🔍 Certificate issuer:', certificate.issuer);
        console.log('🔍 Certificate issuer type:', typeof certificate.issuer);
        if (typeof certificate.issuer === 'object') {
            console.log('🔍 Certificate issuer.name:', certificate.issuer?.name);
        }
        
        // Populate form fields (matching student form exactly)
        document.getElementById('editCertId').value = certificate._id;
        document.getElementById('editCertStudentId').value = studentId;
        document.getElementById('editCertTitle').value = certificate.title || '';
        // Handle issuer field - support both string and object formats
        let issuerValue = '';
        if (typeof certificate.issuer === 'string') {
            issuerValue = certificate.issuer;
        } else if (typeof certificate.issuer === 'object' && certificate.issuer?.name) {
            issuerValue = certificate.issuer.name;
        }
        console.log('🔍 Final issuer value being set:', issuerValue);
        document.getElementById('editCertIssuer').value = issuerValue;
        document.getElementById('editCertOrganization').value = certificate.organization || '';
        
        // Date fields
        if (certificate.startDate) {
            document.getElementById('editCertStartDate').value = certificate.startDate.split('T')[0];
        }
        if (certificate.completionDate) {
            document.getElementById('editCertCompletionDate').value = certificate.completionDate.split('T')[0];
        }
        if (certificate.issueDate) {
            document.getElementById('editCertDate').value = certificate.issueDate.split('T')[0];
        }
        if (certificate.expiryDate) {
            document.getElementById('editCertExpiryDate').value = certificate.expiryDate.split('T')[0];
        }
        
        document.getElementById('editCertDescription').value = certificate.description || '';
        document.getElementById('editCertUrl').value = certificate.certificateUrl || '';
        
        // Show current certificate file if exists
        const currentFileDisplay = document.getElementById('currentCertificateFile');
        const currentFileNameSpan = document.getElementById('currentFileName');
        
        if (certificate.files && certificate.files.length > 0) {
            const file = certificate.files[0];
            currentFileNameSpan.textContent = file.fileName || 'Certificate File';
            currentFileDisplay.style.display = 'block';
            currentFileDisplay.setAttribute('data-file-url', file.fileUrl);
        } else {
            currentFileDisplay.style.display = 'none';
        }
        
        
        modal.style.display = 'block';
    }

    async saveCertificateEdits() {
        try {
            this.showLoading();
            
            const form = document.getElementById('editCertificateForm');
            const formData = new FormData(form);
            
            const certificateId = document.getElementById('editCertId').value;
            const studentId = document.getElementById('editCertStudentId').value;
            
            // Check if there's a new file upload
            const certificateFile = formData.get('certificateFile');
            const hasNewFile = certificateFile && certificateFile.size > 0;
            
            if (hasNewFile) {
                // If uploading new file, send as FormData
                const response = await this.api.request(`/certificates/${certificateId}`, {
                    method: 'PUT',
                    body: formData  // Send entire FormData for file upload
                });
                
                if (!response.success) {
                    throw new Error(response.message);
                }
            } else {
                // No file upload, send JSON data (matching student form exactly)
                const updateData = {
                    title: formData.get('title'),
                    issuer: formData.get('issuer'),
                    organization: formData.get('organization'),
                    startDate: formData.get('startDate'),
                    completionDate: formData.get('completionDate'),
                    issueDate: formData.get('issueDate'),
                    expiryDate: formData.get('expiryDate'),
                    description: formData.get('description'),
                    certificateUrl: formData.get('certificateUrl')
                };
                
                // Debug: Log the update data
                console.log('🔍 Update data being sent:', updateData);

                const response = await this.api.request(`/certificates/${certificateId}`, {
                    method: 'PUT',
                    body: updateData
                });
                
                if (!response.success) {
                    throw new Error(response.message);
                }
            }

            this.showSuccess('Certificate updated successfully');
            this.closeModal('editCertificateModal');
            
            // Reload certificates for this student
            await this.loadStudentCertificates(studentId);
            
        } catch (error) {
            console.error('❌ Error updating certificate:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            if (error.errors) {
                console.error('❌ Validation errors:', error.errors);
            }
            this.showError(`Failed to update certificate: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    async editInternship(internshipId, studentId) {
        try {
            const response = await this.api.request(`/internships/${internshipId}`);
            if (!response.success) {
                throw new Error(response.message);
            }

            const internship = response.data;
            this.openEditInternshipModal(internship, studentId);
        } catch (error) {
            console.error('Error loading internship:', error);
            this.showError('Failed to load internship data');
        }
    }

    openEditInternshipModal(internship, studentId) {
        const modal = document.getElementById('editInternshipModal');
        
        // Populate form fields
        document.getElementById('editInternId').value = internship._id;
        document.getElementById('editInternStudentId').value = studentId;
        document.getElementById('editInternCompany').value = internship.companyName || '';
        document.getElementById('editInternRole').value = internship.role || '';
        document.getElementById('editInternDescription').value = internship.description || '';
        document.getElementById('editInternStartDate').value = internship.startDate ? internship.startDate.split('T')[0] : '';
        document.getElementById('editInternEndDate').value = internship.endDate ? internship.endDate.split('T')[0] : '';
        document.getElementById('editInternStipend').value = internship.stipend || '';
        document.getElementById('editInternLocation').value = internship.location || '';
        
        modal.style.display = 'block';
    }


    showAddCertificateModal() {
        if (!this.currentViewingStudent) return;
        
        const modal = document.getElementById('addCertificateModal');
        if (!modal) {
            this.showError('Add certificate modal not found');
            return;
        }
        
        // Clear form
        const form = document.getElementById('addCertificateForm');
        if (form) form.reset();
        
        // Set student ID
        const studentIdField = document.getElementById('addCertStudentId');
        if (studentIdField) studentIdField.value = this.currentViewingStudent._id;
        
        modal.style.display = 'block';
    }

    showAddInternshipModal() {
        if (!this.currentViewingStudent) return;
        
        const modal = document.getElementById('addInternshipModal');
        if (!modal) {
            this.showError('Add internship modal not found');
            return;
        }
        
        // Clear form
        const form = document.getElementById('addInternshipForm');
        if (form) form.reset();
        
        // Set student ID
        const studentIdField = document.getElementById('addInternStudentId');
        if (studentIdField) studentIdField.value = this.currentViewingStudent._id;
        
        modal.style.display = 'block';
    }

    showAddProjectModal() {
        if (!this.currentViewingStudent) return;
        
        const modal = document.getElementById('addProjectModal');
        if (!modal) {
            this.showError('Add project modal not found');
            return;
        }
        
        // Clear form
        const form = document.getElementById('addProjectForm');
        if (form) form.reset();
        
        // Set student ID
        const studentIdField = document.getElementById('addProjectStudentId');
        if (studentIdField) studentIdField.value = this.currentViewingStudent._id;
        
        modal.style.display = 'block';
    }

    async saveNewCertificate() {
        try {
            this.showLoading();
            
            const form = document.getElementById('addCertificateForm');
            const formData = new FormData(form);
            
            // Check if there's a file upload
            const certificateFile = formData.get('certificateFile');
            const hasFile = certificateFile && certificateFile.size > 0;
            
            if (hasFile) {
                // If uploading file, send as FormData
                const response = await this.api.request('/certificates', {
                    method: 'POST',
                    body: formData  // Send entire FormData for file upload
                });
                
                if (!response.success) {
                    throw new Error(response.message);
                }
            } else {
                // No file upload, send JSON data (matching student form exactly)
                const certificateData = {
                    title: formData.get('title'),
                    issuer: formData.get('issuer'),
                    organization: formData.get('organization'),
                    startDate: formData.get('startDate'),
                    completionDate: formData.get('completionDate'),
                    issueDate: formData.get('issueDate'),
                    expiryDate: formData.get('expiryDate'),
                    description: formData.get('description'),
                    certificateUrl: formData.get('certificateUrl'),
                    uploadedForStudent: formData.get('studentId') // Teacher uploading for student
                };
                
                const response = await this.api.request('/certificates', {
                    method: 'POST',
                    body: certificateData
                });
                
                if (!response.success) {
                    throw new Error(response.message);
                }
            }

            this.showSuccess('Certificate added successfully');
            this.closeModal('addCertificateModal');
            
            // Reload certificates for this student
            await this.loadStudentCertificates(this.currentViewingStudent._id);
            
        } catch (error) {
            console.error('Error adding certificate:', error);
            this.showError('Failed to add certificate');
        } finally {
            this.hideLoading();
        }
    }

    async saveNewInternship() {
        try {
            this.showLoading();
            
            const form = document.getElementById('addInternshipForm');
            const formData = new FormData(form);
            
            // Add studentId if teacher is uploading for student
            if (this.currentViewingStudent) {
                formData.append('uploadedForStudent', this.currentViewingStudent._id);
            }

            const response = await this.api.request('/internships', {
                method: 'POST',
                body: formData
            });
            
            if (!response.success) {
                throw new Error(response.message);
            }

            this.showSuccess('Internship added successfully');
            this.closeModal('addInternshipModal');
            
            // Reload internships for this student
            await this.loadStudentInternships(this.currentViewingStudent._id);
            
        } catch (error) {
            console.error('Error adding internship:', error);
            this.showError('Failed to add internship');
        } finally {
            this.hideLoading();
        }
    }

    async saveNewProject() {
        try {
            this.showLoading();
            
            const form = document.getElementById('addProjectForm');
            const formData = new FormData(form);
            
            // Create project data - teacher is uploading for student, so it's auto-approved
            const projectData = {
                title: formData.get('title'),
                projectType: formData.get('projectType'),
                domain: formData.get('domain'),
                technologies: formData.get('technologies'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                githubUrl: formData.get('githubUrl'),
                liveUrl: formData.get('liveUrl'),
                description: formData.get('description'),
                uploadedForStudent: formData.get('studentId') // Teacher uploading for student
            };

            const response = await this.api.request('/api/projects', {
                method: 'POST',
                body: projectData
            });
            
            if (!response.success) {
                throw new Error(response.message);
            }

            this.showSuccess('Project added successfully');
            this.closeModal('addProjectModal');
            
            // Reload projects for this student
            await this.loadStudentProjects(this.currentViewingStudent._id);
            
        } catch (error) {
            console.error('Error adding project:', error);
            this.showError('Failed to add project');
        } finally {
            this.hideLoading();
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showSuccess(message) {
        // Implement success notification
        UI.toast(message, 'info'); // Replace with proper notification system
    }

    showError(message) {
        // Implement error notification
        UI.toast(message, 'info'); // Replace with proper notification system
    }

    async handleLogout() {
        try {
            await this.api.request('/auth/logout', {
                method: 'POST'
            });
            localStorage.removeItem('token');
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout even if API call fails
            localStorage.removeItem('token');
            window.location.href = '/';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Student profile editing methods
    async editStudentProfile(studentId) {
        try {
            // Fetch current student data
            const response = await this.api.request(`/users/${studentId}`);
            if (!response.success) {
                throw new Error(response.message);
            }

            const student = response.data;
            this.openEditStudentModal(student);
        } catch (error) {
            console.error('Error loading student data:', error);
            this.showError('Failed to load student data');
        }
    }

    openEditStudentModal(student) {
        const modal = document.getElementById('editStudentModal');
        
        // Populate all form fields
        document.getElementById('editStudentId').value = student._id;
        document.getElementById('editStudentName').value = student.name || '';
        document.getElementById('editStudentEmail').value = student.email || '';
        document.getElementById('editStudentUSN').value = student.usn || '';
        document.getElementById('editStudentRollNumber').value = student.rollNumber || '';
        document.getElementById('editStudentContact').value = student.contactNumber || '';
        document.getElementById('editStudentAlternateContact').value = student.alternateContact || '';
        document.getElementById('editStudentSemester').value = student.semester || '';
        document.getElementById('editStudentSection').value = student.section || '';
        document.getElementById('editStudentBatch').value = student.batch || '';
        document.getElementById('editStudentAdmissionYear').value = student.admissionYear || '';
        document.getElementById('editStudentCGPA').value = student.cgpa || '';
        document.getElementById('editStudentBacklogs').value = student.backlogs || '';
        
        // Personal information
        if (student.dateOfBirth) {
            document.getElementById('editStudentDateOfBirth').value = student.dateOfBirth.split('T')[0];
        }
        document.getElementById('editStudentGender').value = student.gender || '';
        document.getElementById('editStudentBloodGroup').value = student.bloodGroup || '';
        document.getElementById('editStudentAadharNumber').value = student.aadharNumber || '';
        
        // Address information
        document.getElementById('editStudentAddress').value = student.address || '';
        document.getElementById('editStudentCity').value = student.city || '';
        document.getElementById('editStudentState').value = student.state || '';
        document.getElementById('editStudentPincode').value = student.pincode || '';
        document.getElementById('editStudentCountry').value = student.country || 'India';
        
        // Parent information
        document.getElementById('editStudentFatherName').value = student.fatherName || '';
        document.getElementById('editStudentFatherContact').value = student.fatherContact || '';
        document.getElementById('editStudentMotherName').value = student.motherName || '';
        document.getElementById('editStudentMotherContact').value = student.motherContact || '';
        document.getElementById('editStudentParentEmail').value = student.parentEmail || '';
        
        modal.style.display = 'block';
    }

    async saveStudentEdits() {
        try {
            this.showLoading();
            
            const form = document.getElementById('editStudentForm');
            const formData = new FormData(form);
            const studentId = document.getElementById('editStudentId').value;
            
            const updateData = {
                name: formData.get('name'),
                email: formData.get('email'),
                usn: formData.get('usn'),
                rollNumber: formData.get('rollNumber'),
                contactNumber: formData.get('contactNumber'),
                alternateContact: formData.get('alternateContact'),
                semester: formData.get('semester'),
                section: formData.get('section'),
                batch: formData.get('batch'),
                admissionYear: formData.get('admissionYear'),
                cgpa: formData.get('cgpa'),
                backlogs: formData.get('backlogs'),
                dateOfBirth: formData.get('dateOfBirth'),
                gender: formData.get('gender'),
                bloodGroup: formData.get('bloodGroup'),
                aadharNumber: formData.get('aadharNumber'),
                address: formData.get('address'),
                city: formData.get('city'),
                state: formData.get('state'),
                pincode: formData.get('pincode'),
                country: formData.get('country'),
                fatherName: formData.get('fatherName'),
                fatherContact: formData.get('fatherContact'),
                motherName: formData.get('motherName'),
                motherContact: formData.get('motherContact'),
                parentEmail: formData.get('parentEmail')
            };

            const response = await this.api.request(`/users/${studentId}`, {
                method: 'PUT',
                body: updateData
            });
            
            if (!response.success) {
                throw new Error(response.message);
            }

            this.showSuccess('Student profile updated successfully');
            this.closeModal('editStudentModal');
            
            // Reload students list
            await this.loadStudents();
            
        } catch (error) {
            console.error('Error updating student:', error);
            this.showError('Failed to update student profile');
        } finally {
            this.hideLoading();
        }
    }


    // Enhanced internship editing methods
    async editInternship(internshipId, studentId) {
        try {
            // Fetch current internship data
            const response = await this.api.request(`/internships/${internshipId}`);
            if (!response.success) {
                throw new Error(response.message);
            }

            const internship = response.data;
            this.openEditInternshipModal(internship, studentId);
        } catch (error) {
            console.error('Error loading internship:', error);
            this.showError('Failed to load internship data');
        }
    }

    openEditInternshipModal(internship, studentId) {
        const modal = document.getElementById('editInternshipModal');
        
        // Debug: Log the internship data
        console.log('🔍 Internship data received:', internship);
        
        // Populate form fields (matching student form exactly)
        document.getElementById('editInternId').value = internship._id;
        document.getElementById('editInternStudentId').value = studentId;
        document.getElementById('editInternCompany').value = internship.companyName || '';
        document.getElementById('editInternPosition').value = internship.position || '';
        
        // Dates
        if (internship.startDate) {
            document.getElementById('editInternStartDate').value = internship.startDate.split('T')[0];
        }
        if (internship.endDate) {
            document.getElementById('editInternEndDate').value = internship.endDate.split('T')[0];
        }
        
        // Currently working checkbox
        document.getElementById('editInternCurrentlyWorking').checked = internship.currentlyWorking || false;
        
        // Other fields
        document.getElementById('editInternLocation').value = internship.location || '';
        document.getElementById('editInternDescription').value = internship.description || '';
        document.getElementById('editInternSkills').value = internship.skills || '';
        
        // Show current internship files if they exist
        const currentFilesDisplay = document.getElementById('currentInternshipFiles');
        if (currentFilesDisplay) {
            let filesHtml = '';
            if (internship.files?.offerLetter) {
                filesHtml += `<p><strong>Offer Letter:</strong> ${internship.files.offerLetter.fileName} 
                    <button type="button" onclick="window.open('${internship.files.offerLetter.fileUrl}', '_blank')" class="btn btn-sm btn-outline-primary">View</button></p>`;
            }
            if (internship.files?.joiningLetter) {
                filesHtml += `<p><strong>Joining Letter:</strong> ${internship.files.joiningLetter.fileName} 
                    <button type="button" onclick="window.open('${internship.files.joiningLetter.fileUrl}', '_blank')" class="btn btn-sm btn-outline-primary">View</button></p>`;
            }
            if (!filesHtml) {
                filesHtml = '<p>No files uploaded yet.</p>';
            }
            currentFilesDisplay.innerHTML = filesHtml;
        }
        
        modal.style.display = 'block';
    }

    async saveInternshipEdits() {
        try {
            this.showLoading();
            
            const form = document.getElementById('editInternshipForm');
            const formData = new FormData(form);
            
            const internshipId = document.getElementById('editInternId').value;
            const studentId = document.getElementById('editInternStudentId').value;
            
            // Check if there are new file uploads
            const offerLetterFile = formData.get('offerLetter');
            const joiningLetterFile = formData.get('joiningLetter');
            const hasNewFiles = (offerLetterFile && offerLetterFile.size > 0) || (joiningLetterFile && joiningLetterFile.size > 0);
            
            if (hasNewFiles) {
                // If uploading new files, send as FormData
                const response = await this.api.request(`/internships/${internshipId}`, {
                    method: 'PUT',
                    body: formData  // Send entire FormData for file upload
                });
                
                if (!response.success) {
                    throw new Error(response.message);
                }
            } else {
                // No file upload, send JSON data (matching student form exactly)
                const updateData = {
                    companyName: formData.get('companyName'),
                    position: formData.get('position'),
                    startDate: formData.get('startDate'),
                    endDate: formData.get('endDate'),
                    currentlyWorking: formData.get('currentlyWorking') === 'on',
                    location: formData.get('location'),
                    description: formData.get('description'),
                    skills: formData.get('skills')
                };
                
                // Debug: Log the update data
                console.log('🔍 Update data being sent:', updateData);

                const response = await this.api.request(`/internships/${internshipId}`, {
                    method: 'PUT',
                    body: updateData
                });
                
                if (!response.success) {
                    throw new Error(response.message);
                }
            }

            this.showSuccess('Internship updated successfully');
            this.closeModal('editInternshipModal');
            
            // Reload internships for this student
            await this.loadStudentInternships(studentId);
            
        } catch (error) {
            console.error('Error updating internship:', error);
            this.showError('Failed to update internship');
        } finally {
            this.hideLoading();
        }
    }

    // PROJECT EDIT FUNCTIONS
    async editProject(projectId, studentId) {
        try {
            const response = await this.api.request(`/projects/${projectId}`);
            
            if (!response.success) {
                throw new Error(response.message);
            }
            
            const project = response.data;
            this.openEditProjectModal(project, studentId);
        } catch (error) {
            console.error('Error loading project:', error);
            this.showError('Failed to load project data');
        }
    }

    openEditProjectModal(project, studentId) {
        const modal = document.getElementById('editProjectModal');
        
        // Debug: Log the project data
        console.log('🔍 Project data received:', project);
        
        // Populate form fields (mapping complex model to simple form)
        document.getElementById('editProjectId').value = project._id;
        document.getElementById('editProjectStudentId').value = studentId;
        document.getElementById('editProjectTitle').value = project.title || '';
        document.getElementById('editProjectType').value = project.studentProjectType || project.teacherProjectType || '';
        document.getElementById('editProjectDomain').value = project.domain || '';
        document.getElementById('editProjectStatus').value = project.currentStatus || '';
        document.getElementById('editProjectDescription').value = project.description || '';
        
        // Technologies (from complex model array to comma-separated string)
        if (project.technicalDetails?.technologies && Array.isArray(project.technicalDetails.technologies)) {
            document.getElementById('editProjectTechnologies').value = project.technicalDetails.technologies.join(', ');
        } else {
            document.getElementById('editProjectTechnologies').value = '';
        }
        
        // Team size (from teamMembers array length)
        const teamSize = project.teamMembers?.length || 1;
        document.getElementById('editProjectTeamSize').value = teamSize;
        
        // Dates (from complex timeline object)
        if (project.timeline?.startDate) {
            document.getElementById('editProjectStartDate').value = project.timeline.startDate.split('T')[0];
        }
        if (project.timeline?.expectedEndDate) {
            document.getElementById('editProjectEndDate').value = project.timeline.expectedEndDate.split('T')[0];
        }
        
        // URLs (from complex files object)
        document.getElementById('editProjectGithub').value = project.files?.codeRepository?.url || '';
        document.getElementById('editProjectLive').value = ''; // Live URL might be in deliverables or other field
        
        modal.style.display = 'block';
    }

    async saveProjectEdits() {
        try {
            this.showLoading();
            
            const form = document.getElementById('editProjectForm');
            const formData = new FormData(form);
            
            const projectId = document.getElementById('editProjectId').value;
            const studentId = document.getElementById('editProjectStudentId').value;
            
            // Map simple form fields to complex model structure
            const updateData = {
                title: formData.get('title'),
                studentProjectType: formData.get('studentProjectType'),
                domain: formData.get('domain'),
                currentStatus: formData.get('currentStatus'),
                description: formData.get('description'),
                
                // Technologies - convert comma-separated string to array
                technicalDetails: {
                    technologies: formData.get('technologies') ? 
                        formData.get('technologies').split(',').map(t => t.trim()).filter(t => t) : []
                },
                
                // Timeline object
                timeline: {
                    startDate: formData.get('startDate'),
                    expectedEndDate: formData.get('expectedEndDate')
                },
                
                // Code repository
                files: {
                    codeRepository: {
                        url: formData.get('githubUrl'),
                        platform: formData.get('githubUrl') ? 'github' : ''
                    }
                }
            };
            
            // Debug: Log the update data
            console.log('🔍 Project update data being sent:', updateData);

            const response = await this.api.request(`/projects/${projectId}`, {
                method: 'PUT',
                body: updateData
            });
            
            if (!response.success) {
                throw new Error(response.message);
            }

            this.showSuccess('Project updated successfully');
            this.closeModal('editProjectModal');
            
            // Reload projects for this student
            await this.loadStudentProjects(studentId);
            
        } catch (error) {
            console.error('Error updating project:', error);
            this.showError('Failed to update project');
        } finally {
            this.hideLoading();
        }
    }
    
    // View certificate file function
    async viewCertificateFile(certificateId) {
        try {
            // If called from edit modal
            if (!certificateId) {
                const currentFileDisplay = document.getElementById('currentCertificateFile');
                const fileUrl = currentFileDisplay?.getAttribute('data-file-url');
                
                if (fileUrl) {
                    window.open(fileUrl, '_blank');
                } else {
                    this.showError('No certificate file available');
                }
                return;
            }
            
            // If called from certificate list
            const response = await this.api.request(`/certificates/${certificateId}`);
            if (!response.success) {
                throw new Error(response.message);
            }
            
            const certificate = response.data;
            
            // Check for file
            if (certificate.files && certificate.files.length > 0) {
                window.open(certificate.files[0].fileUrl, '_blank');
            } 
            // Check for URL
            else if (certificate.certificateUrl) {
                window.open(certificate.certificateUrl, '_blank');
            }
            else {
                this.showError('No certificate file or URL available');
            }
            
        } catch (error) {
            console.error('Error viewing certificate file:', error);
            this.showError('Failed to open certificate file');
        }
    }
    
    // View complete certificate details (shows all info like students see)
    async viewCertificateDetails(certificateId) {
        try {
            const response = await this.api.request(`/certificates/${certificateId}`);
            if (!response.success) {
                throw new Error(response.message);
            }
            
            const certificate = response.data;
            this.showCertificateDetailsModal(certificate);
            
        } catch (error) {
            console.error('Error loading certificate details:', error);
            this.showError('Failed to load certificate details');
        }
    }
    
    // Show complete certificate details modal
    showCertificateDetailsModal(certificate) {
        // Create and show a detailed view modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>Certificate Details</h3>
                    <span class="close" data-close-modal>&times;</span>
                </div>
                <div class="certificate-details">
                    <h4>${certificate.title}</h4>
                    <p><strong>Issuing Organization:</strong> ${typeof certificate.issuer === 'string' ? certificate.issuer : (certificate.issuer?.name || 'N/A')}</p>
                    ${certificate.organization ? `<p><strong>Organization/Platform:</strong> ${certificate.organization}</p>` : ''}
                    ${certificate.startDate ? `<p><strong>Start Date:</strong> ${new Date(certificate.startDate).toLocaleDateString()}</p>` : ''}
                    ${certificate.completionDate ? `<p><strong>Completion Date:</strong> ${new Date(certificate.completionDate).toLocaleDateString()}</p>` : ''}
                    ${certificate.issueDate ? `<p><strong>Issue Date:</strong> ${new Date(certificate.issueDate).toLocaleDateString()}</p>` : ''}
                    ${certificate.expiryDate ? `<p><strong>Expiry Date:</strong> ${new Date(certificate.expiryDate).toLocaleDateString()}</p>` : ''}
                    <p><strong>Description:</strong> ${certificate.description || 'N/A'}</p>
                    ${certificate.certificateUrl ? `<p><strong>Certificate URL:</strong> <a href="${certificate.certificateUrl}" target="_blank">View Online</a></p>` : ''}
                    ${certificate.files && certificate.files.length > 0 ? `
                        <p><strong>Certificate File:</strong> 
                            <a href="${certificate.files[0].fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                                View File
                            </a>
                        </p>
                    ` : ''}
                    <p><strong>Status:</strong> <span class="status-${certificate.status}">${certificate.status?.toUpperCase() || 'PENDING'}</span></p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-close-modal>Close</button>
                </div>
            </div>
        `;
        
        // Add event listeners for close buttons
        modal.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-close-modal')) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }

    // Teacher Events Methods
    async showCreateEventModal() {
        try {
            // Load department users for dropdowns
            const usersResponse = await this.api.request('/teacher-events/users');
            const users = usersResponse.success ? usersResponse.data : { students: [], teachers: [] };

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 95vw; max-height: 95vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>Create New Event with Document Editor</h3>
                        <span class="close" data-close-modal>&times;</span>
                    </div>
                    
                    <div style="display: flex; gap: 20px;">
                        <!-- Basic Event Info -->
                        <div style="width: 300px; flex-shrink: 0;">
                            <h4>Basic Information</h4>
                            <form id="createEventForm" enctype="multipart/form-data">
                                <div class="form-group">
                                    <label for="eventDate">Event Date *</label>
                                    <input type="date" id="eventDate" name="eventDate" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="studentsInvolved">Students Involved</label>
                                    <select multiple id="studentsInvolved" name="studentsInvolved" size="4">
                                        ${users.students.map(student => `
                                            <option value="${student._id}">${student.name} (${student.usn || student.tempUSN || student.rollNumber})</option>
                                        `).join('')}
                                    </select>
                                    <small class="form-help">Hold Ctrl/Cmd to select multiple</small>
                                </div>
                                
                                <div class="form-group">
                                    <label for="teachersInvolved">Other Teachers</label>
                                    <select multiple id="teachersInvolved" name="teachersInvolved" size="3">
                                        ${users.teachers.filter(teacher => teacher._id !== this.currentUser.id).map(teacher => `
                                            <option value="${teacher._id}">${teacher.name}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editNewImages">Add Images</label>
                                    <input type="file" id="editNewImages" name="images" accept="image/*" multiple style="margin-bottom: 8px;">
                                    <div id="newImagePreview" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; min-height: 40px; border: 1px dashed #dee2e6;">
                                        <div style="display: flex; align-items: center; justify-content: center; color: #6c757d; font-size: 12px; grid-column: 1/-1;">
                                            <i class="fas fa-image" style="margin-right: 4px;"></i>
                                            Selected images will appear here
                                        </div>
                                    </div>
                                    <small class="form-help">Choose multiple image files to upload</small>
                                </div>
                                
                                <div class="modal-footer" style="margin-top: 20px;">
                                    <button type="submit" class="btn btn-primary">Create Event & Export PDF</button>
                                    <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
                                </div>
                            </form>
                        </div>
                        
                        <!-- Document Editor -->
                        <div style="flex: 1;">
                            ${this.getDocumentEditorHTML()}
                        </div>
                    </div>
                </div>
            `;

            modal.addEventListener('click', (e) => {
                if (e.target.hasAttribute('data-close-modal')) {
                    modal.remove();
                }
            });

            const form = modal.querySelector('#createEventForm');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateEvent(e, modal);
            });

            // Initialize document editor after modal is added to DOM
            document.body.appendChild(modal);
            this.initializeDocumentEditor(modal);
            this.setupImagePreview(modal);
            
        } catch (error) {
            console.error('Error showing create event modal:', error);
            this.showError('Failed to load create event form');
        }
    }

    getDocumentEditorHTML() {
        return `
            <style>
                .doc-editor { 
                    background: #f8f9fa; 
                    border-radius: 12px; 
                    padding: 16px; 
                    min-height: 500px; 
                    border: 1px solid #e9ecef;
                }
                .doc-editor .editor-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #dee2e6;
                }
                .doc-editor .editor-controls {
                    display: flex;
                    gap: 8px;
                }
                .doc-editor .editor-btn {
                    padding: 6px 12px;
                    border: 1px solid #ccc;
                    border-radius: 6px;
                    background: white;
                    cursor: pointer;
                    font-size: 12px;
                }
                .doc-editor .editor-btn:hover {
                    background: #e9ecef;
                }
                .doc-editor .editor-btn.active {
                    background: #007bff;
                    color: white;
                    border-color: #007bff;
                }
                .doc-rows {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .doc-row {
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                    padding: 12px;
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                }
                .doc-row:hover {
                    border-color: #007bff;
                    box-shadow: 0 2px 8px rgba(0,123,255,0.1);
                }
                .row-type-select {
                    width: 100px;
                    padding: 6px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: 12px;
                }
                .row-content {
                    flex: 1;
                    min-height: 40px;
                    padding: 8px;
                    border: 1px dashed #ccc;
                    border-radius: 4px;
                    outline: none;
                    background: #fafbfc;
                }
                .row-content:focus {
                    border-color: #007bff;
                    background: white;
                }
                .row-content.title {
                    font-size: 24px;
                    font-weight: bold;
                }
                .row-content.description {
                    font-size: 14px;
                    line-height: 1.4;
                }
                .row-content.teacher, .row-content.student {
                    font-size: 14px;
                    font-weight: 600;
                }
                .row-content.small {
                    font-size: 12px;
                    color: #666;
                }
                .row-content.auto-populated {
                    background-color: #e8f5e8;
                    border-left: 3px solid #28a745;
                }
                .auto-sync-indicator {
                    font-size: 10px;
                    color: #28a745;
                    margin-left: 4px;
                    font-weight: normal;
                }
                .row-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .row-remove-btn {
                    padding: 4px 8px;
                    border: none;
                    background: #dc3545;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                .row-image-preview {
                    max-width: 100%;
                    max-height: 150px;
                    border-radius: 4px;
                }
                .preview-panel {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    margin-top: 16px;
                    display: none;
                }
                .preview-panel.active {
                    display: block;
                }
                .preview-content h1 {
                    font-size: 28px;
                    margin: 16px 0;
                    color: #333;
                }
                .preview-content p {
                    font-size: 14px;
                    line-height: 1.6;
                    margin: 12px 0;
                    color: #333;
                }
                .preview-content .teacher-list, .preview-content .student-list {
                    font-size: 14px;
                    margin: 12px 0;
                    font-weight: 600;
                }
                .preview-content img {
                    max-width: 100%;
                    margin: 16px 0;
                    border-radius: 4px;
                }
            </style>
            
            <div class="doc-editor">
                <div class="editor-header">
                    <h4 style="margin: 0;">Event Documentation</h4>
                    <div class="editor-controls">
                        <button type="button" class="editor-btn" id="addRowBtn">+ Add Row</button>
                        <button type="button" class="editor-btn" id="previewBtn">📄 Preview</button>
                        <button type="button" class="editor-btn" id="clearRowsBtn">Clear All</button>
                    </div>
                </div>
                
                <div class="doc-rows" id="docRows">
                    <!-- Document rows will be added here -->
                </div>
                
                <div class="preview-panel" id="previewPanel">
                    <h4>Document Preview</h4>
                    <div class="preview-content" id="previewContent">
                        <!-- Preview content -->
                    </div>
                </div>
            </div>
        `;
    }

    initializeDocumentEditor(modal, existingEvent = null) {
        let docRowId = 0;
        let isPreviewMode = false;
        
        const docRows = modal.querySelector('#docRows');
        const addRowBtn = modal.querySelector('#addRowBtn');
        const previewBtn = modal.querySelector('#previewBtn');
        const clearRowsBtn = modal.querySelector('#clearRowsBtn');
        const previewPanel = modal.querySelector('#previewPanel');
        const previewContent = modal.querySelector('#previewContent');
        
        // If editing existing event, populate with existing document content
        if (existingEvent && existingEvent.documentContent && existingEvent.documentContent.length > 0) {
            existingEvent.documentContent.forEach(item => {
                this.createDocRow(docRows, item.type, item.content, ++docRowId, item.imageUrl);
            });
        } else {
            // Create initial rows with auto-populated content (for new events)
            this.createDocRow(docRows, 'title', existingEvent?.title || 'Event Title', ++docRowId);
            this.createDocRow(docRows, 'description', existingEvent?.description || 'Event description goes here...', ++docRowId);
            
            // Auto-populate teacher row with selected teachers
            let teachersText = 'Teachers involved in this event';
            if (existingEvent?.teachersInvolved?.length > 0) {
                teachersText = existingEvent.teachersInvolved.map(t => t.name).join(', ');
            }
            this.createDocRow(docRows, 'teacher', teachersText, ++docRowId);
            
            // Auto-populate student row with selected students  
            let studentsText = 'Students who participated';
            if (existingEvent?.studentsInvolved?.length > 0) {
                studentsText = existingEvent.studentsInvolved.map(s => `${s.name} (${s.usn || s.rollNumber})`).join(', ');
            }
            this.createDocRow(docRows, 'student', studentsText, ++docRowId);
            
            // Add outcome if exists
            if (existingEvent?.outcome) {
                this.createDocRow(docRows, 'description', existingEvent.outcome, ++docRowId);
            }
            
            // Add existing images if they exist (for events created before document editor)
            if (existingEvent?.images && existingEvent.images.length > 0) {
                // Create a single image row with all existing images
                this.createDocRow(docRows, 'image', '', ++docRowId);
                
                // Add all existing images to the image row
                const imageRow = docRows.querySelector(`[data-id="doc-row-${docRowId}"]`);
                const imageContent = imageRow.querySelector('.row-content');
                const previewContainer = imageContent.querySelector('.image-preview-container');
                
                if (previewContainer) {
                    previewContainer.innerHTML = ''; // Clear any placeholder content
                    
                    existingEvent.images.forEach((image, index) => {
                        const imgDiv = document.createElement('div');
                        imgDiv.style.cssText = 'position: relative; display: inline-block; margin: 4px;';
                        imgDiv.innerHTML = `
                            <img src="${image.fileUrl}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" alt="${image.fileName}">
                            <button type="button" class="remove-img-btn" style="position: absolute; top: -5px; right: -5px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer;">×</button>
                        `;
                        previewContainer.appendChild(imgDiv);
                        
                        // Add remove functionality
                        imgDiv.querySelector('.remove-img-btn').addEventListener('click', (e) => {
                            e.stopPropagation();
                            imgDiv.remove();
                            this.updatePreview(
                                docRows,
                                docRows.closest('.doc-editor').querySelector('#previewContent')
                            );
                        });
                    });
                }
            }
        }
        
        // Event listeners
        addRowBtn.addEventListener('click', () => {
            this.createDocRow(docRows, 'description', '', ++docRowId);
            this.updatePreview(docRows, previewContent);
        });
        
        previewBtn.addEventListener('click', () => {
            isPreviewMode = !isPreviewMode;
            if (isPreviewMode) {
                previewPanel.classList.add('active');
                previewBtn.classList.add('active');
                previewBtn.textContent = '✏️ Edit';
                this.updatePreview(docRows, previewContent);
            } else {
                previewPanel.classList.remove('active');
                previewBtn.classList.remove('active');
                previewBtn.textContent = '📄 Preview';
            }
        });
        
        clearRowsBtn.addEventListener('click', () => {
            if (confirm('Clear all content?')) {
                docRows.innerHTML = '';
                this.createDocRow(docRows, 'title', 'Event Title', ++docRowId);
                this.updatePreview(docRows, previewContent);
            }
        });
        
        // Initialize preview
        this.updatePreview(docRows, previewContent);
        
        // Add event listeners to participant dropdowns for auto-updating
        this.setupParticipantDropdownListeners(modal, docRows, previewContent);
    }

    createDocRow(container, type = 'description', content = '', id = 1, imageUrl = null) {
        const row = document.createElement('div');
        row.className = 'doc-row';
        row.dataset.id = 'doc-row-' + id;
        
        const isAutoPopulated = (type === 'teacher' || type === 'student') && content !== this.getPlaceholderText(type);
        
        row.innerHTML = `
            <select class="row-type-select">
                <option value="title" ${type === 'title' ? 'selected' : ''}>Title</option>
                <option value="description" ${type === 'description' ? 'selected' : ''}>Description</option>
                <option value="date" ${type === 'date' ? 'selected' : ''}>Date ⚡</option>
                <option value="teacher" ${type === 'teacher' ? 'selected' : ''}>Teachers ⚡</option>
                <option value="student" ${type === 'student' ? 'selected' : ''}>Students ⚡</option>
                <option value="image" ${type === 'image' ? 'selected' : ''}>Image</option>
                <option value="small" ${type === 'small' ? 'selected' : ''}>Small Text</option>
            </select>
            
            <div class="row-content ${type} ${isAutoPopulated ? 'auto-populated' : ''}" contenteditable="true">${content}</div>
            
            <div class="row-actions">
                <button type="button" class="row-remove-btn">×</button>
            </div>
        `;
        
        container.appendChild(row);
        
        const typeSelect = row.querySelector('.row-type-select');
        const rowContent = row.querySelector('.row-content');
        const removeBtn = row.querySelector('.row-remove-btn');
        
        // Handle type changes
        typeSelect.addEventListener('change', (e) => {
            const newType = e.target.value;
            rowContent.className = `row-content ${newType}`;
            
            if (newType === 'image') {
                this.convertToImageRow(rowContent);
            } else {
                rowContent.setAttribute('contenteditable', 'true');
                
                // Auto-populate with selected participants when type is changed to teacher/student/date
                if (newType === 'teacher' || newType === 'student') {
                    console.log(`🎯 Auto-populating ${newType} row...`);
                    const selectedNames = this.getSelectedParticipantNames(newType, container);
                    console.log(`🎯 Selected ${newType} names:`, selectedNames);
                    
                    if (selectedNames) {
                        rowContent.textContent = selectedNames;
                        rowContent.classList.add('auto-populated');
                        
                        // Brief visual feedback for auto-population
                        rowContent.style.transition = 'all 0.3s ease';
                        rowContent.style.backgroundColor = '#d4edda';
                        rowContent.style.borderColor = '#28a745';
                        setTimeout(() => {
                            rowContent.style.backgroundColor = '';
                            rowContent.style.borderColor = '';
                        }, 1500);
                        console.log(`✅ Auto-populated ${newType} row with: ${selectedNames}`);
                    } else {
                        console.log(`❌ No ${newType} names selected, using placeholder`);
                        if (!rowContent.textContent.trim()) {
                            rowContent.textContent = this.getPlaceholderText(newType);
                            rowContent.classList.remove('auto-populated');
                        }
                    }
                } else if (newType === 'date') {
                    const eventDate = this.getSelectedEventDate(container);
                    if (eventDate) {
                        rowContent.textContent = eventDate;
                        rowContent.classList.add('auto-populated');
                        
                        // Brief visual feedback for auto-population
                        rowContent.style.transition = 'all 0.3s ease';
                        rowContent.style.backgroundColor = '#d4edda';
                        rowContent.style.borderColor = '#28a745';
                        setTimeout(() => {
                            rowContent.style.backgroundColor = '';
                            rowContent.style.borderColor = '';
                        }, 1500);
                    } else if (!rowContent.textContent.trim()) {
                        rowContent.textContent = this.getPlaceholderText(newType);
                        rowContent.classList.remove('auto-populated');
                    }
                } else {
                    rowContent.classList.remove('auto-populated');
                    if (!rowContent.textContent.trim()) {
                        rowContent.textContent = this.getPlaceholderText(newType);
                    }
                }
            }
            this.updatePreview(container, container.closest('.doc-editor').querySelector('#previewContent'));
        });
        
        // Handle content changes
        rowContent.addEventListener('input', () => {
            this.updatePreview(container, container.closest('.doc-editor').querySelector('#previewContent'));
        });
        
        // Handle remove
        removeBtn.addEventListener('click', () => {
            row.remove();
            this.updatePreview(container, container.closest('.doc-editor').querySelector('#previewContent'));
        });
        
        // Handle enter key for new rows
        rowContent.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const newId = Date.now(); // Simple ID generation
                this.createDocRow(container, 'description', '', newId);
                // Focus the new row
                const newRow = container.querySelector(`[data-id="doc-row-${newId}"] .row-content`);
                if (newRow) newRow.focus();
            }
        });
        
        // Convert to image if needed
        if (type === 'image') {
            this.convertToImageRow(rowContent, imageUrl);
        }
    }

    convertToImageRow(contentEl, existingImageUrl = null) {
        contentEl.removeAttribute('contenteditable');
        contentEl.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <input type="file" accept="image/*" multiple style="margin-bottom: 8px;">
                <div style="font-size: 12px;">Choose image files (multiple selection allowed)</div>
                <div class="image-preview-container" style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;"></div>
            </div>
        `;
        
        // If there's an existing image, display it
        if (existingImageUrl) {
            const previewContainer = contentEl.querySelector('.image-preview-container');
            const imgDiv = document.createElement('div');
            imgDiv.style.cssText = 'position: relative; display: inline-block; margin: 4px;';
            imgDiv.innerHTML = `
                <img src="${existingImageUrl}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" alt="Existing image">
                <button type="button" class="remove-img-btn" style="position: absolute; top: -5px; right: -5px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer;">×</button>
            `;
            previewContainer.appendChild(imgDiv);
            
            // Add remove functionality
            imgDiv.querySelector('.remove-img-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                imgDiv.remove();
                this.updatePreview(
                    contentEl.closest('.doc-rows'),
                    contentEl.closest('.doc-editor').querySelector('#previewContent')
                );
            });
        }
        
        const fileInput = contentEl.querySelector('input[type="file"]');
        const previewContainer = contentEl.querySelector('.image-preview-container');
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                previewContainer.innerHTML = ''; // Clear previous previews
                
                files.forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const imgDiv = document.createElement('div');
                        imgDiv.style.cssText = 'position: relative; display: inline-block; margin: 4px;';
                        imgDiv.innerHTML = `
                            <img src="${e.target.result}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" alt="${file.name}">
                            <button type="button" class="remove-img-btn" data-index="${index}" style="position: absolute; top: -5px; right: -5px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer;">×</button>
                        `;
                        previewContainer.appendChild(imgDiv);
                        
                        // Add remove functionality
                        imgDiv.querySelector('.remove-img-btn').addEventListener('click', (e) => {
                            e.stopPropagation();
                            imgDiv.remove();
                            this.updatePreview(
                                contentEl.closest('.doc-rows'),
                                contentEl.closest('.doc-editor').querySelector('#previewContent')
                            );
                        });
                        
                        // Update preview after all images are loaded
                        if (index === files.length - 1) {
                            setTimeout(() => {
                                this.updatePreview(
                                    contentEl.closest('.doc-rows'),
                                    contentEl.closest('.doc-editor').querySelector('#previewContent')
                                );
                            }, 100);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
        });
    }

    getPlaceholderText(type) {
        const placeholders = {
            title: 'Event Title',
            description: 'Event description...',
            date: 'Event date...',
            teacher: 'Teachers involved...',
            student: 'Students who participated...',
            small: 'Additional details...',
            image: ''
        };
        return placeholders[type] || '';
    }
    
    getSelectedEventDate(container) {
        // Find the modal containing this document editor
        const modal = container.closest('.modal');
        if (!modal) return null;
        
        const eventDateInput = modal.querySelector('#eventDate');
        if (!eventDateInput || !eventDateInput.value) return null;
        
        // Format the date nicely
        const date = new Date(eventDateInput.value);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    getSelectedParticipantNames(type, container) {
        // Find the modal containing this document editor
        const modal = container.closest('.modal');
        if (!modal) return null;

        // Try both create and edit modal element IDs
        const selectElementIds = type === 'teacher' 
            ? ['teachersInvolved', 'editTeachersInvolved'] 
            : ['studentsInvolved', 'editStudentsInvolved'];
        
        let selectElement = null;
        for (const id of selectElementIds) {
            selectElement = modal.querySelector(`#${id}`);
            if (selectElement) break;
        }
        
        if (!selectElement) return null;

        const selectedOptions = Array.from(selectElement.selectedOptions);
        if (selectedOptions.length === 0) return null;

        // Extract just the names from the option text
        const names = selectedOptions.map(option => {
            const text = option.textContent.trim();
            if (type === 'student') {
                // For students: "John Doe (USN123) - Computer Science" -> "John Doe"
                return text.split(' (')[0];
            } else {
                // For teachers: "Jane Smith - Mechanical Engineering" -> "Jane Smith"
                return text.split(' - ')[0];
            }
        });

        return names.join(', ');
    }

    setupParticipantDropdownListeners(modal, docRows, previewContent) {
        // Try both create and edit modal element IDs
        const studentsSelect = modal.querySelector('#studentsInvolved') || modal.querySelector('#editStudentsInvolved');
        const teachersSelect = modal.querySelector('#teachersInvolved') || modal.querySelector('#editTeachersInvolved');

        // Update student rows when student selection changes
        if (studentsSelect) {
            studentsSelect.addEventListener('change', () => {
                this.updateParticipantRows('student', docRows, previewContent);
            });
        }

        // Update teacher rows when teacher selection changes
        if (teachersSelect) {
            teachersSelect.addEventListener('change', () => {
                this.updateParticipantRows('teacher', docRows, previewContent);
            });
        }
    }

    updateParticipantRows(type, docRows, previewContent) {
        // Find all rows of the specified type and update them
        Array.from(docRows.children).forEach(row => {
            const typeSelect = row.querySelector('.row-type-select');
            const rowContent = row.querySelector('.row-content');
            
            if (typeSelect.value === type) {
                const selectedNames = this.getSelectedParticipantNames(type, docRows);
                if (selectedNames) {
                    rowContent.textContent = selectedNames;
                    rowContent.classList.add('auto-populated');
                    
                    // Add a brief visual feedback
                    rowContent.style.transition = 'background-color 0.3s ease';
                    rowContent.style.backgroundColor = '#d4edda';
                    setTimeout(() => {
                        rowContent.style.backgroundColor = '';
                    }, 1000);
                } else {
                    rowContent.textContent = this.getPlaceholderText(type);
                    rowContent.classList.remove('auto-populated');
                }
            }
        });
        
        // Update preview
        this.updatePreview(docRows, previewContent);
    }

    updatePreview(docRows, previewContent) {
        if (!previewContent) return;
        
        previewContent.innerHTML = '';
        
        Array.from(docRows.children).forEach(row => {
            const typeSelect = row.querySelector('.row-type-select');
            const content = row.querySelector('.row-content');
            const type = typeSelect.value;
            
            if (type === 'image') {
                const images = content.querySelectorAll('img');
                if (images.length > 0) {
                    const imageContainer = document.createElement('div');
                    imageContainer.style.cssText = 'margin: 16px 0; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;';
                    
                    images.forEach(img => {
                        const previewImg = document.createElement('img');
                        previewImg.src = img.src;
                        previewImg.style.cssText = 'max-width: 300px; max-height: 200px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;';
                        imageContainer.appendChild(previewImg);
                    });
                    
                    previewContent.appendChild(imageContainer);
                }
            } else {
                let text = content.textContent || content.innerText || '';
                text = text.trim();
                
                // Show placeholder content if empty
                if (!text && type === 'title') {
                    text = 'Event Title';
                } else if (!text && type === 'description') {
                    text = 'Event description...';
                } else if (!text && type === 'date') {
                    text = 'Event date...';
                } else if (!text && type === 'teacher') {
                    text = 'Teachers involved...';
                } else if (!text && type === 'student') {
                    text = 'Students who participated...';
                } else if (!text && type === 'small') {
                    text = 'Additional details...';
                }
                
                if (text) {
                    const element = document.createElement(type === 'title' ? 'h1' : 'p');
                    
                    if (type === 'title') {
                        element.textContent = text;
                        element.style.fontSize = '28px';
                        element.style.fontWeight = 'bold';
                        element.style.margin = '16px 0';
                        element.style.color = '#333';
                    } else if (type === 'date') {
                        element.innerHTML = `<strong>📅 Event Date:</strong> ${text}`;
                        element.style.fontSize = '16px';
                        element.style.fontWeight = '600';
                        element.style.color = '#2c3e50';
                        element.style.margin = '12px 0';
                        element.style.padding = '8px 12px';
                        element.style.backgroundColor = '#f8f9fa';
                        element.style.borderLeft = '4px solid #007bff';
                        element.style.borderRadius = '4px';
                    } else if (type === 'teacher') {
                        element.innerHTML = `<strong>Teachers:</strong> ${text}`;
                        element.className = 'teacher-list';
                    } else if (type === 'student') {
                        element.innerHTML = `<strong>Students:</strong> ${text}`;
                        element.className = 'student-list';
                    } else if (type === 'small') {
                        element.style.fontSize = '12px';
                        element.style.color = '#666';
                    }
                    
                    if (type !== 'teacher' && type !== 'student' && type !== 'title' && type !== 'date') {
                        element.textContent = text;
                    }
                    
                    previewContent.appendChild(element);
                }
            }
        });
    }

    async handleCreateEvent(e, modal) {
        try {
            e.preventDefault();
            
            // Collect basic form data
            const formData = new FormData();
            formData.append('eventDate', modal.querySelector('#eventDate').value);
            
            // Handle multiple select values
            const studentsInvolved = Array.from(modal.querySelector('#studentsInvolved').selectedOptions).map(option => option.value);
            const teachersInvolved = Array.from(modal.querySelector('#teachersInvolved').selectedOptions).map(option => option.value);
            
            studentsInvolved.forEach(studentId => formData.append('studentsInvolved', studentId));
            teachersInvolved.forEach(teacherId => formData.append('teachersInvolved', teacherId));

            // Collect document content
            const docRows = modal.querySelector('#docRows');
            const documentContent = [];
            let title = 'Event Document';
            let description = '';
            
            Array.from(docRows.children).forEach((row, index) => {
                const typeSelect = row.querySelector('.row-type-select');
                const content = row.querySelector('.row-content');
                const type = typeSelect.value;
                
                const rowData = {
                    id: row.dataset.id,
                    type: type,
                    order: index
                };
                
                if (type === 'image') {
                    const images = content.querySelectorAll('img');
                    const imageUrls = [];
                    images.forEach((img, imgIndex) => {
                        if (img && img.src.startsWith('data:')) {
                            // Convert base64 to blob and add to FormData
                            const blob = this.dataURLtoBlob(img.src);
                            const fileName = `doc-image-${index}-${imgIndex}.png`;
                            console.log('📷 Frontend - Converting image to blob:', fileName, 'Size:', blob.size, 'Type:', blob.type);
                            formData.append('documentImages', blob, fileName);
                            imageUrls.push(fileName);
                        }
                    });
                    if (imageUrls.length > 0) {
                        rowData.imageUrl = imageUrls[0]; // For compatibility, use first image
                        rowData.imageUrls = imageUrls; // Store all image URLs
                    }
                } else {
                    const textContent = content.textContent.trim();
                    rowData.content = textContent;
                    
                    // Extract title and description for main fields
                    if (type === 'title' && !formData.has('title')) {
                        title = textContent;
                        formData.append('title', textContent);
                    } else if (type === 'description' && !formData.has('description')) {
                        description = textContent;
                        formData.append('description', textContent);
                    }
                }
                
                documentContent.push(rowData);
            });
            
            // Add document content as JSON
            formData.append('documentContent', JSON.stringify(documentContent));
            
            // Debug FormData contents
            console.log('📷 Frontend - FormData contents:');
            for (let [key, value] of formData.entries()) {
                if (value instanceof Blob) {
                    console.log(`${key}: [Blob] size=${value.size}, type=${value.type}`);
                } else {
                    console.log(`${key}: ${typeof value === 'string' ? value.substring(0, 100) + '...' : value}`);
                }
            }
            
            // Set default title and description if not set
            if (!formData.has('title')) {
                formData.append('title', title);
            }
            if (!formData.has('description')) {
                formData.append('description', description);
            }

            // Create the event
            const response = await this.api.request('/teacher-events', {
                method: 'POST',
                body: formData,
                headers: {} // Remove content-type to let browser set it for multipart
            });
            
            if (response.success) {
                this.showSuccess('Event created successfully!');
                
                // Generate and download PDF
                await this.generateEventPDF(modal);
                
                modal.remove();
                await this.loadEvents();
            } else {
                this.showError(response.message || 'Failed to create event');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            this.showError('Failed to create event');
        }
    }

    dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type: mime});
    }

    async generateEventPDF(modal) {
        try {
            // Load html2pdf if not already loaded
            if (typeof html2pdf === 'undefined') {
                await this.loadHtml2PdfLibrary();
            }

            const previewContent = modal.querySelector('#previewContent');
            const docRows = modal.querySelector('#docRows');
            
            // Update preview to ensure it's current
            this.updatePreview(docRows, previewContent);
            
            // Create a clean container for PDF
            const pdfContainer = document.createElement('div');
            pdfContainer.style.cssText = `
                padding: 40px;
                background: white;
                color: black;
                font-family: Arial, sans-serif;
                line-height: 1.6;
                max-width: none;
            `;
            
            // Clone preview content
            pdfContainer.innerHTML = previewContent.innerHTML;
            
            // Add event metadata
            const eventDate = modal.querySelector('#eventDate').value;
            if (eventDate) {
                const dateElement = document.createElement('p');
                dateElement.innerHTML = `<strong>Event Date:</strong> ${new Date(eventDate).toLocaleDateString()}`;
                dateElement.style.marginTop = '20px';
                pdfContainer.appendChild(dateElement);
            }
            
            // Temporarily add to body for PDF generation
            document.body.appendChild(pdfContainer);
            
            const opt = {
                margin: 15,
                filename: `event-${Date.now()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
            };
            
            await html2pdf().set(opt).from(pdfContainer).save();
            
            // Clean up
            pdfContainer.remove();
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showError('Failed to generate PDF');
        }
    }

    loadHtml2PdfLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof html2pdf !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.2/html2pdf.bundle.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async viewEvent(eventId) {
        try {
            const response = await this.api.request(`/teacher-events/${eventId}`);
            if (response.success) {
                this.showEventDetailsModal(response.data);
            }
        } catch (error) {
            console.error('Error viewing event:', error);
            this.showError('Failed to load event details');
        }
    }

    showEventDetailsModal(event) {
        console.log('📸 Debug - Event images:', event.images);
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>Event Overview - PDF Format</h3>
                    <span class="close" data-close-modal>&times;</span>
                </div>
                <div class="event-details" style="background: white; padding: 24px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${this.generateFormattedEventView(event)}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" data-event-action="edit" data-event-id="${event._id}">Edit Event</button>
                    <button class="btn btn-secondary" data-close-modal>Close</button>
                </div>
            </div>
        `;

        modal.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-close-modal')) {
                modal.remove();
            }
        });

        document.body.appendChild(modal);
    }

    generateFormattedEventView(event) {
        let html = '';
        
        // Title
        html += `<h1 style="font-size: 28px; font-weight: bold; margin: 16px 0; color: #333; text-align: center;">${this.escapeHtml(event.title || 'Event Title')}</h1>`;
        
        // Date
        html += `<p style="font-size: 16px; font-weight: 600; color: #2c3e50; margin: 12px 0; padding: 8px 12px; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px;">
            <strong>📅 Event Date:</strong> ${this.formatDate(event.eventDate)}
        </p>`;
        
        // Description
        if (event.description) {
            html += `<p style="margin: 16px 0;">${this.escapeHtml(event.description)}</p>`;
        }
        
        // Teachers Involved
        if (event.teachersInvolved && event.teachersInvolved.length > 0) {
            const teacherNames = event.teachersInvolved.map(t => t.name).join(', ');
            html += `<p style="margin: 12px 0;"><strong>Teachers:</strong> ${teacherNames}</p>`;
        }
        
        // Students Involved
        if (event.studentsInvolved && event.studentsInvolved.length > 0) {
            const studentNames = event.studentsInvolved.map(s => `${s.name} (${s.usn || s.rollNumber})`).join(', ');
            html += `<p style="margin: 12px 0;"><strong>Students:</strong> ${studentNames}</p>`;
        }
        
        // Outcome/Results
        if (event.outcome) {
            html += `<div style="margin: 16px 0;"><strong>Outcome/Results:</strong><br>${this.escapeHtml(event.outcome)}</div>`;
        }
        
        // Images  
        if (event.images && event.images.length > 0) {
            html += `<div style="margin: 16px 0;">
                <strong>Event Images:</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px;">`;
            
            event.images.forEach(image => {
                html += `<div style="text-align: center;">
                    <img src="${image.fileUrl}" alt="${image.fileName}" 
                         style="max-width: 300px; max-height: 200px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; cursor: pointer;"
                         onclick="window.open('${image.fileUrl}', '_blank')"
                         onerror="this.style.display='none'; this.nextElementSibling.innerHTML='❌ Image not found: ${image.fileName}';">
                    <p style="font-size: 12px; color: #666; margin-top: 4px;">${image.fileName}</p>
                </div>`;
            });
            
            html += `</div></div>`;
        }
        
        // Use document content if available (for properly formatted events)
        if (event.documentContent && event.documentContent.length > 0) {
            html = '<h1 style="text-align: center; margin-bottom: 20px;">Event Report</h1>';
            
            event.documentContent.forEach(item => {
                if (item.type === 'image') {
                    // Handle both single imageUrl and multiple imageUrls
                    const imageUrls = item.imageUrls || (item.imageUrl ? [item.imageUrl] : []);
                    
                    if (imageUrls.length > 0) {
                        html += `<div style="margin: 16px 0; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">`;
                        imageUrls.forEach(imageUrl => {
                            html += `<img src="${imageUrl}" style="max-width: 300px; max-height: 200px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">`;
                        });
                        html += `</div>`;
                    } else {
                        // Fallback: check if images exist at this position in the event.images array
                        if (event.images && event.images.length > 0) {
                            html += `<div style="margin: 16px 0; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">`;
                            event.images.forEach(image => {
                                html += `<img src="${image.fileUrl}" style="max-width: 300px; max-height: 200px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">`;
                            });
                            html += `</div>`;
                        }
                    }
                } else if (item.content) {
                    const content = this.escapeHtml(item.content);
                    
                    if (item.type === 'title') {
                        html += `<h1 style="font-size: 28px; font-weight: bold; margin: 16px 0; color: #333;">${content}</h1>`;
                    } else if (item.type === 'date') {
                        html += `<p style="font-size: 16px; font-weight: 600; color: #2c3e50; margin: 12px 0; padding: 8px 12px; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px;"><strong>📅 Event Date:</strong> ${content}</p>`;
                    } else if (item.type === 'teacher') {
                        html += `<p style="margin: 12px 0;"><strong>Teachers:</strong> ${content}</p>`;
                    } else if (item.type === 'student') {
                        html += `<p style="margin: 12px 0;"><strong>Students:</strong> ${content}</p>`;
                    } else if (item.type === 'small') {
                        html += `<p style="font-size: 12px; color: #666; margin: 8px 0;">${content}</p>`;
                    } else {
                        html += `<p style="margin: 16px 0;">${content}</p>`;
                    }
                }
            });
        }
        
        return html;
    }

    async editEvent(eventId) {
        console.log('🔧 Edit Event Modal - Opening for event:', eventId);
        try {
            const [eventResponse, usersResponse] = await Promise.all([
                this.api.request(`/teacher-events/${eventId}`),
                this.api.request('/teacher-events/users')
            ]);

            if (!eventResponse.success) {
                this.showError('Failed to load event details');
                return;
            }

            const event = eventResponse.data;
            const users = usersResponse.success ? usersResponse.data : { students: [], teachers: [] };

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 95vw; max-height: 95vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>Edit Event with Document Editor</h3>
                        <span class="close" data-close-modal>&times;</span>
                    </div>
                    
                    <div style="display: flex; gap: 20px;">
                        <!-- Basic Event Info -->
                        <div style="width: 300px; flex-shrink: 0;">
                            <h4>Basic Information</h4>
                            <form id="editEventForm" enctype="multipart/form-data">
                                <div class="form-group">
                                    <label for="editEventDate">Event Date *</label>
                                    <input type="date" id="editEventDate" name="eventDate" value="${new Date(event.eventDate).toISOString().split('T')[0]}" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editStudentsInvolved">Students Involved</label>
                                    <select multiple id="editStudentsInvolved" name="studentsInvolved" size="4">
                                        ${users.students.map(student => `
                                            <option value="${student._id}" ${event.studentsInvolved.some(s => s._id === student._id) ? 'selected' : ''}>
                                                ${student.name} (${student.usn || student.tempUSN || student.rollNumber})
                                            </option>
                                        `).join('')}
                                    </select>
                                    <small class="form-help">Hold Ctrl/Cmd to select multiple</small>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editTeachersInvolved">Other Teachers</label>
                                    <select multiple id="editTeachersInvolved" name="teachersInvolved" size="3">
                                        ${users.teachers.filter(teacher => teacher._id !== this.currentUser.id).map(teacher => `
                                            <option value="${teacher._id}" ${event.teachersInvolved.some(t => t._id === teacher._id) ? 'selected' : ''}>
                                                ${teacher.name}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>

                                ${event.images && event.images.length > 0 ? `
                                    <div class="form-group">
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Current Images (${event.images.length}):</label>
                                        <div class="current-images" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; padding: 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef;">
                                            ${event.images.map((image, index) => {
                                                console.log('📸 Displaying image', index + 1, 'of', event.images.length, ':', image.fileName || image.fileUrl);
                                                return `
                                                    <div class="image-item" style="position: relative; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                                        <img src="${image.fileUrl}" alt="${image.fileName || 'Event image'}" style="width: 100%; height: 100px; object-fit: cover; display: block; cursor: pointer;" onclick="window.open('${image.fileUrl}', '_blank')" title="Click to view full size: ${image.fileName || 'Event image'}">
                                                        <button type="button" class="btn btn-sm btn-danger" style="position: absolute; top: 2px; right: 2px; padding: 4px 6px; font-size: 12px; line-height: 1; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.2);" data-action="delete-image" data-event-id="${event._id}" data-image-id="${image._id}" title="Delete image">×</button>
                                                        <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; padding: 4px 6px; font-size: 10px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${image.fileName || 'Event image'}">${image.fileName || 'Image ' + (index + 1)}</div>
                                                    </div>
                                                `;
                                            }).join('')}
                                        </div>
                                        <div style="margin-top: 8px; font-size: 12px; color: #6c757d;">
                                            <i class="fas fa-info-circle"></i> Click on any image to view full size, or click × to delete
                                        </div>
                                    </div>
                                ` : `
                                    <div class="form-group">
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Current Images:</label>
                                        <div style="padding: 20px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef; text-align: center; color: #6c757d;">
                                            <i class="fas fa-images" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
                                            <div>No images uploaded yet</div>
                                        </div>
                                    </div>
                                `}
                                
                                <div class="form-group">
                                    <label for="editNewImages">Add New Images</label>
                                    <input type="file" id="editNewImages" name="images" accept="image/*" multiple style="margin-bottom: 8px;">
                                    <div id="newImagePreview" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; min-height: 40px; border: 1px dashed #dee2e6;">
                                        <div style="display: flex; align-items: center; justify-content: center; color: #6c757d; font-size: 12px; grid-column: 1/-1;">
                                            <i class="fas fa-image" style="margin-right: 4px;"></i>
                                            Selected images will appear here
                                        </div>
                                    </div>
                                    <small class="form-help">Choose multiple image files to upload</small>
                                </div>
                                
                                <div class="modal-footer" style="margin-top: 20px;">
                                    <button type="submit" class="btn btn-primary">Update Event & Export PDF</button>
                                    <button type="button" class="btn btn-danger" data-action="delete-event" data-event-id="${event._id}">Delete Event</button>
                                    <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
                                </div>
                            </form>
                        </div>
                        
                        <!-- Document Editor -->
                        <div style="flex: 1;">
                            ${this.getDocumentEditorHTML()}
                        </div>
                    </div>
                </div>
            `;

            modal.addEventListener('click', (e) => {
                if (e.target.hasAttribute('data-close-modal')) {
                    modal.remove();
                }
            });

            const form = modal.querySelector('#editEventForm');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditEvent(e, eventId, modal);
            });

            // Initialize document editor after modal is added to DOM
            document.body.appendChild(modal);
            this.initializeDocumentEditor(modal, event);
            this.setupImagePreview(modal);
        } catch (error) {
            console.error('Error showing edit event modal:', error);
            this.showError('Failed to load edit event form');
        }
    }

    async handleEditEvent(e, eventId, modal) {
        try {
            e.preventDefault();
            
            // Collect basic form data
            const formData = new FormData();
            formData.append('eventDate', modal.querySelector('#editEventDate').value);
            
            // Handle multiple select values
            const studentsInvolved = Array.from(modal.querySelector('#editStudentsInvolved').selectedOptions).map(option => option.value);
            const teachersInvolved = Array.from(modal.querySelector('#editTeachersInvolved').selectedOptions).map(option => option.value);
            
            studentsInvolved.forEach(studentId => formData.append('studentsInvolved', studentId));
            teachersInvolved.forEach(teacherId => formData.append('teachersInvolved', teacherId));

            // Process document editor content (same logic as create)
            const docRows = modal.querySelector('#docRows');
            const documentContent = [];
            let title = '';
            let description = '';
            
            Array.from(docRows.children).forEach((row, index) => {
                const typeSelect = row.querySelector('.row-type-select');
                const content = row.querySelector('.row-content');
                const type = typeSelect.value;
                
                const rowData = {
                    type: type,
                    order: index
                };
                
                if (type === 'image') {
                    const images = content.querySelectorAll('img');
                    const imageUrls = [];
                    images.forEach((img, imgIndex) => {
                        if (img && img.src.startsWith('data:')) {
                            // Convert base64 to blob and add to FormData
                            const blob = this.dataURLtoBlob(img.src);
                            const fileName = `doc-image-${index}-${imgIndex}.png`;
                            console.log('📷 Frontend - Converting image to blob:', fileName, 'Size:', blob.size, 'Type:', blob.type);
                            formData.append('documentImages', blob, fileName);
                            imageUrls.push(fileName);
                        }
                    });
                    if (imageUrls.length > 0) {
                        rowData.imageUrl = imageUrls[0]; // For compatibility, use first image
                        rowData.imageUrls = imageUrls; // Store all image URLs
                    }
                } else {
                    const textContent = content.textContent.trim();
                    rowData.content = textContent;
                    
                    // Extract title and description for main fields
                    if (type === 'title' && !title) {
                        title = textContent || 'Updated Event';
                    } else if (type === 'description' && !description) {
                        description = textContent || 'Event description updated.';
                    }
                }
                
                documentContent.push(rowData);
            });
            
            // Add document content as JSON
            formData.append('documentContent', JSON.stringify(documentContent));
            
            // Debug FormData contents
            console.log('📷 Frontend - Edit FormData contents:');
            for (let [key, value] of formData.entries()) {
                if (value instanceof Blob) {
                    console.log(`${key}: [Blob] size=${value.size}, type=${value.type}`);
                } else {
                    console.log(`${key}: ${typeof value === 'string' ? value.substring(0, 100) + '...' : value}`);
                }
            }
            
            // Set default title and description if not set
            if (!formData.has('title')) {
                formData.append('title', title);
            }
            if (!formData.has('description')) {
                formData.append('description', description);
            }
            
            console.log('📷 Frontend - Submitting edit with title:', title, 'description:', description);

            const response = await this.api.request(`/teacher-events/${eventId}`, {
                method: 'PUT',
                body: formData,
                headers: {} // Remove content-type to let browser set it for multipart
            });
            
            if (response.success) {
                this.showSuccess('Event updated successfully!');
                modal.remove();
                await this.loadEvents();
            } else {
                this.showError(response.message || 'Failed to update event');
            }
        } catch (error) {
            console.error('Error updating event:', error);
            this.showError('Failed to update event');
        }
    }

    async deleteEvent(eventId) {
        if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            try {
                const response = await this.api.request(`/teacher-events/${eventId}`, {
                    method: 'DELETE'
                });
                
                if (response.success) {
                    this.showSuccess('Event deleted successfully!');
                    // Close any open modals
                    document.querySelectorAll('.modal').forEach(modal => modal.remove());
                    await this.loadEvents();
                } else {
                    this.showError(response.message || 'Failed to delete event');
                }
            } catch (error) {
                console.error('Error deleting event:', error);
                this.showError('Failed to delete event');
            }
        }
    }

    async downloadEvent(eventId) {
        try {
            const response = await this.api.request(`/teacher-events/${eventId}`);
            
            if (response.success) {
                const event = response.data;
                
                // Create downloadable JSON data
                const downloadData = {
                    event: {
                        title: event.title,
                        description: event.description,
                        eventType: event.eventType,
                        eventDate: event.eventDate,
                        location: event.location,
                        eventCategory: event.eventCategory,
                        targetAudience: event.targetAudience,
                        expectedAttendees: event.expectedAttendees,
                        resourcesRequired: event.resourcesRequired,
                        teachersInvolved: event.teachersInvolved?.map(t => ({
                            name: t.name,
                            email: t.email,
                            department: t.department?.name
                        })),
                        status: event.status,
                        approvalStatus: event.approvalStatus,
                        images: event.images?.map(img => ({
                            fileName: img.fileName,
                            fileUrl: img.fileUrl
                        })),
                        budget: event.budget,
                        createdAt: event.createdAt,
                        updatedAt: event.updatedAt
                    },
                    exportedAt: new Date().toISOString(),
                    exportedBy: this.currentUser?.name || 'Teacher'
                };
                
                // Create and download the file
                const blob = new Blob([JSON.stringify(downloadData, null, 2)], { 
                    type: 'application/json' 
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `event-${event.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                this.showSuccess('Event downloaded successfully!');
            } else {
                this.showError(response.message || 'Failed to download event');
            }
        } catch (error) {
            console.error('Error downloading event:', error);
            this.showError('Failed to download event');
        }
    }

    async deleteEventImage(eventId, imageId, buttonElement) {
        if (confirm('Are you sure you want to delete this image?')) {
            try {
                const response = await this.api.request(`/teacher-events/${eventId}/images/${imageId}`, {
                    method: 'DELETE'
                });
                
                if (response.success) {
                    // Remove the image item from the UI
                    buttonElement.closest('.image-item').remove();
                    this.showSuccess('Image deleted successfully!');
                } else {
                    this.showError(response.message || 'Failed to delete image');
                }
            } catch (error) {
                console.error('Error deleting image:', error);
                this.showError('Failed to delete image');
            }
        }
    }

    setupImagePreview(modal) {
        const fileInput = modal.querySelector('#editNewImages');
        const previewContainer = modal.querySelector('#newImagePreview');
        
        if (fileInput && previewContainer) {
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                
                // Clear existing preview
                previewContainer.innerHTML = '';
                
                if (files.length === 0) {
                    previewContainer.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; color: #6c757d; font-size: 12px; grid-column: 1/-1;">
                            <i class="fas fa-image" style="margin-right: 4px;"></i>
                            Selected images will appear here
                        </div>
                    `;
                    return;
                }
                
                files.forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const imgDiv = document.createElement('div');
                        imgDiv.style.cssText = 'position: relative; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);';
                        imgDiv.innerHTML = `
                            <img src="${e.target.result}" style="width: 100%; height: 80px; object-fit: cover; display: block;" alt="${file.name}" title="${file.name}">
                            <button type="button" class="remove-new-img-btn" data-index="${index}" style="position: absolute; top: 2px; right: 2px; background: rgba(220,53,69,0.8); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Remove image">×</button>
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; padding: 2px 4px; font-size: 9px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${file.name}">${file.name}</div>
                        `;
                        previewContainer.appendChild(imgDiv);
                        
                        // Add remove functionality
                        imgDiv.querySelector('.remove-new-img-btn').addEventListener('click', (e) => {
                            e.stopPropagation();
                            
                            // Remove file from input
                            const dt = new DataTransfer();
                            const newFiles = Array.from(fileInput.files);
                            newFiles.splice(index, 1);
                            newFiles.forEach(file => dt.items.add(file));
                            fileInput.files = dt.files;
                            
                            // Remove preview
                            imgDiv.remove();
                            
                            // If no files left, show placeholder
                            if (previewContainer.children.length === 0) {
                                previewContainer.innerHTML = `
                                    <div style="display: flex; align-items: center; justify-content: center; color: #6c757d; font-size: 12px; grid-column: 1/-1;">
                                        <i class="fas fa-image" style="margin-right: 4px;"></i>
                                        Selected images will appear here
                                    </div>
                                `;
                            }
                        });
                    };
                    reader.readAsDataURL(file);
                });
            });
        }
    }
}

// Initialize teacher dashboard when DOM is loaded
let teacherDashboard;
document.addEventListener('DOMContentLoaded', () => {
    teacherDashboard = new TeacherDashboard();
});

// Handle browser back/forward navigation
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.section) {
        teacherDashboard.showSection(event.state.section);
    }
});

// Global function for modal onclick handlers
window.viewCertificateFile = function() {
    if (teacherDashboard) {
        teacherDashboard.viewCertificateFile();
    }
};