# Go + React Full Stack Application

This is a full-stack application with a Go backend serving JSON data to a React frontend. The application is a simple task manager that allows users to create, read, update, and delete tasks.

## Project Structure

```
.
├── backend/             # Go backend
│   ├── main.go          # Main Go server file
│   └── go.mod           # Go module file
└── frontend/            # React frontend
    ├── src/             # React source code
    ├── public/          # Static assets
    └── package.json     # Node.js dependencies
```

## Backend (Go)

The backend is a RESTful API built with Go, using:
- Gorilla Mux for routing
- CORS middleware for cross-origin requests

### API Endpoints

- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/{id}` - Get a specific task
- `PUT /api/tasks/{id}` - Update a task
- `DELETE /api/tasks/{id}` - Delete a task

## Frontend (React)

The frontend is built with React and TypeScript, using:
- Vite as the build tool
- Axios for API requests
- React Router for routing

## Running the Application

### Backend

```bash
cd backend
go run main.go
```

The backend server will start on http://localhost:8080.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend development server will start on http://localhost:3000.

## Development

To work on this project, you'll need:
- Go 1.21 or higher
- Node.js 16 or higher
- npm 8 or higher 