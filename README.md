# Department Management System

A comprehensive academic department management system built with Node.js, Express, MongoDB, and vanilla JavaScript frontend.

## Features

- **Multi-role Authentication**: SuperAdmin, Admin, HOD, Teacher, Student
- **Department Management**: Create and manage academic departments
- **User Management**: Role-based user creation and management
- **Club System**: Create clubs with approval workflow
- **Event Management**: Multi-level approval system for events
- **Project Tracking**: Student and teacher project management
- **Certificate Management**: Upload and approve certificates
- **Internship Tracking**: Student internship records
- **Report Generation**: Automated department and student reports
- **Budget Management**: Event and project budget tracking

## System Architecture

### User Hierarchy
1. **SuperAdmin**: Creates departments, designations, and admin accounts
2. **Admin**: Creates HODs, teachers, students; views department reports
3. **HOD**: Approves clubs/events, manages budgets, generates reports
4. **Teacher**: Creates clubs/events/projects, manages student data, acts as mentor
5. **Student**: Maintains profile, uploads achievements, joins clubs

### Key Workflows
- **Club Creation**: Teacher → HOD Approval
- **Event Organization**: Initiator → Mentor (if club) → HOD → Approved
- **Student Submissions**: Student Upload → Teacher Approval (auto-approved if teacher uploads)
- **Budget Approval**: Request → HOD Review → Approved/Rejected

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Authentication**: JWT tokens
- **Security**: Helmet, bcrypt, CORS
- **File Upload**: Multer (configured)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd department-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/department_management
   JWT_SECRET=your_secure_jwt_secret_key
   JWT_EXPIRE=7d
   NODE_ENV=development
   ```

4. **Start MongoDB**
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Ubuntu/Linux
   sudo systemctl start mongodb
   
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start the application**
   ```bash
   # Development mode (with nodemon)
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

## First Time Setup

1. **Initialize Super Admin**
   - Visit the application URL
   - Click "Initialize Super Admin"
   - Create the first super admin account

2. **Create Departments**
   - Login as Super Admin
   - Navigate to Departments
   - Create academic departments (CSE, ECE, etc.)

3. **Create Designations**
   - Create teacher designations (Professor, Assistant Professor, HOD, etc.)

4. **Create Admin Account**
   - Create an admin user to manage day-to-day operations

5. **Setup Department Structure**
   - Admin creates HODs, Teachers, and Students
   - Assign users to appropriate departments

## API Endpoints

### Authentication
- `POST /api/auth/init-superadmin` - Initialize super admin
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatepassword` - Update password

### User Management
- `POST /api/users` - Create user
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Departments
- `POST /api/departments` - Create department
- `GET /api/departments` - Get all departments
- `GET /api/departments/:id` - Get single department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Deactivate department

### Designations
- `POST /api/departments/designations/create` - Create designation
- `GET /api/departments/designations/all` - Get all designations

## Project Structure

```
department-management-system/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── auth.controller.js   # Authentication logic
│   ├── user.controller.js   # User management
│   └── department.controller.js # Department management
├── middleware/
│   ├── auth.js             # Authentication middleware
│   └── validation.js       # Request validation
├── models/
│   ├── User.js             # User schema
│   ├── Department.js       # Department schema
│   ├── Club.js             # Club schema
│   ├── Event.js            # Event schema
│   ├── Project.js          # Project schema
│   ├── Certificate.js      # Certificate schema
│   └── Internship.js       # Internship schema
├── routes/
│   ├── auth.routes.js      # Authentication routes
│   ├── user.routes.js      # User routes
│   └── department.routes.js # Department routes
├── public/
│   ├── css/
│   │   └── style.css       # Application styles
│   └── js/
│       ├── api.js          # API client
│       └── app.js          # Frontend logic
├── views/
│   └── index.html          # Main HTML file
├── uploads/                # File upload directory
├── .env                    # Environment variables
├── server.js               # Application entry point
└── package.json            # Dependencies
```

## Development Guidelines

### Adding New Features

1. **Create Schema** (if needed)
   - Add new Mongoose schema in `models/`
   - Define validation rules and relationships

2. **Create Controller**
   - Add controller logic in `controllers/`
   - Implement CRUD operations
   - Add proper error handling

3. **Create Routes**
   - Define routes in `routes/`
   - Add authentication and authorization middleware
   - Include request validation

4. **Update Frontend**
   - Add UI components in `views/index.html`
   - Update JavaScript in `public/js/app.js`
   - Add API calls in `public/js/api.js`

### Testing

```bash
# Run tests (when implemented)
npm test

# Test API endpoints using curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- CORS configuration
- Helmet security headers
- Rate limiting (configured)

## Deployment

### Production Deployment

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   MONGODB_URI=mongodb://your-production-db
   JWT_SECRET=your-strong-production-secret
   ```

2. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name dept-management
   
   # Using systemd (Linux)
   sudo systemctl create dept-management.service
   ```

3. **Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Check network connectivity

2. **Authentication Errors**
   - Verify JWT secret is set
   - Check token expiration
   - Ensure proper headers are sent

3. **Permission Errors**
   - Check user roles and permissions
   - Verify middleware order in routes

### Logs

```bash
# View application logs
npm run dev  # Shows console output

# PM2 logs (production)
pm2 logs dept-management
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## Future Enhancements

- **Notification System**: Email/SMS notifications for approvals
- **File Upload**: Document and image upload functionality
- **Advanced Reports**: PDF generation and export options
- **Analytics Dashboard**: Usage statistics and insights
- **Mobile App**: React Native or Flutter mobile application
- **Integration APIs**: Connect with external systems

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Note**: This system is designed for academic institutions and includes role-based access control. Ensure proper configuration of user roles and permissions before deploying in a production environment.