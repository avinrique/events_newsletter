# GEMINI.md

## Project Overview

This is a comprehensive academic department management system built with Node.js, Express, MongoDB, and a vanilla JavaScript frontend. The system supports multiple user roles (SuperAdmin, Admin, HOD, Teacher, Student) and features for managing departments, users, clubs, events, projects, certificates, and internships.

The backend is built with Node.js and Express, using MongoDB with Mongoose for the database. Authentication is handled with JWT tokens. The frontend is built with HTML, CSS, and vanilla JavaScript.

## Building and Running

### Prerequisites

*   Node.js (v14 or higher)
*   MongoDB (v4.4 or higher)
*   npm

### Installation

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Setup:**

    Create a `.env` file in the root of the project and add the following variables:

    ```
    PORT=5000
    MONGODB_URI=mongodb://localhost:27017/department_management
    JWT_SECRET=your_secure_jwt_secret_key
    JWT_EXPIRE=7d
    NODE_ENV=development
    ```

### Running the Application

*   **Development mode (with nodemon):**
    ```bash
    npm run dev
    ```

*   **Production mode:**
    ```bash
    npm start
    ```

### Running Tests

*   **Run all tests:**
    ```bash
    npm test
    ```

*   **Run tests in watch mode:**
    ```bash
    npm run test:watch
    ```

*   **Run tests with coverage:**
    ```bash
    npm run test:coverage
    ```

## Development Conventions

### API

The API is documented in the `docs/` directory. The main API documentation file is `docs/API_Documentation.md`.

### Authentication

Authentication is handled by JWT. The `protect` middleware (in `middleware/auth.js`) is used to protect routes.

### Code Style

The project uses a consistent code style, but there is no formal linter configuration in the `package.json` file. It is recommended to add a linter like ESLint to enforce a consistent style.

### Testing

Tests are written with Jest and Supertest. Test files are located in the `tests/` directory and follow the `*.test.js` naming convention.
