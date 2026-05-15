const API_BASE = '/api';

class API {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            }
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        // Handle FormData differently from regular objects
        if (options.body && typeof options.body === 'object') {
            if (options.body instanceof FormData) {
                // For FormData, remove content-type to let browser set it with boundary
                delete config.headers['Content-Type'];
                config.body = options.body;
            } else {
                config.body = JSON.stringify(options.body);
            }
        }

        try {
            console.log('🔍 Making request to:', url);
            console.log('🔍 Request config:', {
                method: config.method,
                headers: config.headers,
                bodyType: typeof config.body,
                bodyPreview: config.body ? (typeof config.body === 'string' ? config.body.substring(0, 200) + '...' : 'FormData/Object') : 'none'
            });
            
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                console.error('❌ API Error Response:', data);
                console.error('❌ Status:', response.status, response.statusText);
                
                // Attach errors array to the error for better debugging
                const error = new Error(data.message || 'Request failed');
                if (data.errors) {
                    error.errors = data.errors;
                }
                throw error;
            }

            console.log('✅ API Success:', data);
            return data;
        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async initSuperAdmin(userData) {
        return this.request('/auth/init-superadmin', {
            method: 'POST',
            body: userData
        });
    }

    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    async getMe() {
        return this.request('/auth/me');
    }

    async updatePassword(currentPassword, newPassword) {
        return this.request('/auth/updatepassword', {
            method: 'PUT',
            body: { currentPassword, newPassword }
        });
    }

    async updateProfile(profileData) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: profileData
        });
    }

    async uploadProfileImage(formData) {
        return this.request('/auth/upload-profile-image', {
            method: 'POST',
            body: formData,
            headers: {} // Remove content-type to let browser set it for multipart
        });
    }

    // User endpoints
    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: userData
        });
    }

    async getUsers(params = {}) {
        // Handle position=null parameter correctly
        const cleanParams = { ...params };
        if (cleanParams.position === null) {
            cleanParams.position = 'null';
        }
        
        const queryString = new URLSearchParams(cleanParams).toString();
        return this.request(`/users${queryString ? '?' + queryString : ''}`);
    }

    async getDepartmentTeachers() {
        return this.request('/users/teachers/department');
    }

    async getUser(id) {
        return this.request(`/users/${id}`);
    }

    async updateUser(id, userData) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: userData
        });
    }

    async toggleUserStatus(id) {
        return this.request(`/users/${id}/toggle-status`, {
            method: 'PUT'
        });
    }

    async resetUserPassword(id, password) {
        return this.request(`/users/${id}/reset-password`, {
            method: 'PUT',
            body: { password }
        });
    }

    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    async assignHOD(data) {
        return this.request('/users/assign-hod', {
            method: 'POST',
            body: data
        });
    }

    // HOD-specific endpoints
    async getDepartmentStudents(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/users/department/students${queryString ? '?' + queryString : ''}`);
    }

    // Department endpoints
    async createDepartment(deptData) {
        return this.request('/departments', {
            method: 'POST',
            body: deptData
        });
    }

    async getDepartments(includeInactive = false) {
        const query = includeInactive ? '?includeInactive=true' : '';
        return this.request(`/departments${query}`);
    }
    
    async reactivateDepartment(id) {
        return this.request(`/departments/${id}/reactivate`, {
            method: 'PUT'
        });
    }

    async getDepartment(id) {
        return this.request(`/departments/${id}`);
    }

    async updateDepartment(id, deptData) {
        return this.request(`/departments/${id}`, {
            method: 'PUT',
            body: deptData
        });
    }

    async deleteDepartment(id) {
        return this.request(`/departments/${id}`, {
            method: 'DELETE'
        });
    }

    // Designation endpoints
    async getDesignations() {
        return this.request('/departments/designations/all');
    }

    async createDesignation(data) {
        return this.request('/departments/designations/create', {
            method: 'POST',
            body: data
        });
    }

    async updateDesignation(id, data) {
        return this.request(`/departments/designations/${id}`, {
            method: 'PUT',
            body: data
        });
    }

    async deleteDesignation(id) {
        return this.request(`/departments/designations/${id}`, {
            method: 'DELETE'
        });
    }

    // Club endpoints
    async getClubs() {
        return this.request('/clubs');
    }

    async createClub(clubData) {
        return this.request('/clubs', {
            method: 'POST',
            body: clubData
        });
    }

    async approveClub(id, data = {}) {
        return this.request(`/clubs/${id}/approve`, {
            method: 'PUT',
            body: data
        });
    }

    async rejectClub(id, data = {}) {
        return this.request(`/clubs/${id}/reject`, {
            method: 'PUT',
            body: data
        });
    }

    async joinClub(id) {
        return this.request(`/clubs/${id}/join`, {
            method: 'POST'
        });
    }

    // Club single (newly added)
    async getClub(id) {
        return this.request(`/clubs/${id}`);
    }

    // Event endpoints
    async getEvents(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/events${qs ? '?' + qs : ''}`);
    }

    async getEvent(id) {
        return this.request(`/events/${id}`);
    }

    async createEvent(eventData) {
        return this.request('/events', {
            method: 'POST',
            body: eventData
        });
    }

    async updateEvent(id, eventData) {
        return this.request(`/events/${id}`, {
            method: 'PUT',
            body: eventData
        });
    }

    async deleteEvent(id) {
        return this.request(`/events/${id}`, { method: 'DELETE' });
    }

    async approveEvent(id, data = {}) {
        return this.request(`/events/${id}/approve`, {
            method: 'PUT',
            body: data
        });
    }

    async rejectEvent(id, data = {}) {
        return this.request(`/events/${id}/reject`, {
            method: 'PUT',
            body: data
        });
    }

    async updateEventBudget(id, data) {
        return this.request(`/events/${id}/budget`, { method: 'PUT', body: data });
    }

    async utilizeEventBudget(id, amount) {
        return this.request(`/events/${id}/budget/utilize`, { method: 'PUT', body: { amount } });
    }

    // Newsletter endpoints
    async createNewsletter(data)   { return this.request('/newsletters', { method: 'POST', body: data }); }
    async getNewsletters(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/newsletters${qs ? '?' + qs : ''}`);
    }
    async getNewsletter(id)        { return this.request(`/newsletters/${id}`); }
    async updateNewsletter(id, d)  { return this.request(`/newsletters/${id}`, { method: 'PUT', body: d }); }
    async publishNewsletter(id)    { return this.request(`/newsletters/${id}/publish`, { method: 'PUT' }); }
    async deleteNewsletter(id)     { return this.request(`/newsletters/${id}`, { method: 'DELETE' }); }
    async uploadNewsletterCover(id, formData) {
        return this.request(`/newsletters/${id}/cover`, {
            method: 'POST',
            body: formData,
            headers: {} // let browser set multipart boundary
        });
    }
    async newsletterDraftPreview(deptId, year, month) {
        return this.request(`/newsletters/draft-preview/${deptId}/${year}/${month}`);
    }
    async listPublishedNewsletters(deptId) {
        return this.request(`/newsletters/published?deptId=${encodeURIComponent(deptId)}`);
    }
    async sendNewsletter(id) {
        return this.request(`/newsletters/${id}/send`, { method: 'POST' });
    }

    // Budgets aggregation
    async getDepartmentBudgets(deptId, params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/reports/budgets/department/${deptId}${qs ? '?' + qs : ''}`);
    }

    // Project endpoints
    async getProjects() {
        return this.request('/projects');
    }

    async createProject(projectData) {
        return this.request('/projects', {
            method: 'POST',
            body: projectData
        });
    }

    async getProject(id) {
        return this.request(`/projects/${id}`);
    }

    async addProject(formData) {
        return this.request('/projects/upload', {
            method: 'POST',
            body: formData,
            headers: {} // Remove content-type to let browser set it for multipart
        });
    }

    async getDepartmentProjects(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/projects/department/all${queryString ? '?' + queryString : ''}`);
    }

    async approveProject(projectId) {
        return this.request(`/projects/${projectId}/approve`, {
            method: 'PUT'
        });
    }

    async rejectProject(projectId, reason) {
        return this.request(`/projects/${projectId}/reject`, {
            method: 'PUT',
            body: { reason }
        });
    }

    // Report endpoints
    async getTeacherReport(teacherId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/reports/teachers/${teacherId}${queryString ? '?' + queryString : ''}`);
    }

    async getDepartmentTeachersReport(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/reports/department/teachers${queryString ? '?' + queryString : ''}`);
    }

    async downloadTeacherReport(teacherId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/reports/teachers/${teacherId}/download${queryString ? '?' + queryString : ''}`;
        
        // For download, we'll return the URL for window.open or direct download
        return {
            success: true,
            downloadUrl: `${API_BASE}${url}`,
            directDownload: () => {
                const link = document.createElement('a');
                link.href = `${API_BASE}${url}`;
                link.setAttribute('download', '');
                if (this.token) {
                    // For download with auth, we need to handle it differently
                    window.open(`${API_BASE}${url}?token=${this.token}`, '_blank');
                } else {
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        };
    }

    // Certificate endpoints
    async getCertificates() {
        return this.request('/certificates');
    }

    async uploadCertificate(formData) {
        return this.request('/certificates', {
            method: 'POST',
            body: formData,
            headers: {} // Remove content-type to let browser set it for multipart
        });
    }

    // Internship endpoints
    async getInternships() {
        return this.request('/internships');
    }

    async addInternship(formData) {
        return this.request('/internships', {
            method: 'POST',
            body: formData,
            headers: {} // Remove content-type to let browser set it for multipart
        });
    }

    // External Event Participation endpoints
    async getEventParticipations() {
        return this.request('/event-participations');
    }

    async addEventParticipation(formData) {
        return this.request('/event-participations', {
            method: 'POST',
            body: formData,
            headers: {} // Remove content-type to let browser set it for multipart
        });
    }

    async addEventParticipationJSON(eventData) {
        return this.request('/event-participations', {
            method: 'POST',
            body: eventData // This will be JSON.stringify'd by the request method
        });
    }

    // Get college events where student is a participant
    async getMyEventParticipations() {
        return this.request('/events/my-participations');
    }

    // Get all teachers from college for mentor selection (Students only)
    async getAllTeachers() {
        return this.request('/students/all-teachers');
    }

    // Get all students from college for team member selection (Students only)  
    async getAllStudents() {
        return this.request('/students/all-students');
    }

    // Report endpoints
    async getDepartmentReport(deptId) {
        return this.request(`/reports/department/${deptId}`);
    }

    async getStudentReport(studentId) {
        return this.request(`/reports/student/${studentId}`);
    }
}

const api = new API();