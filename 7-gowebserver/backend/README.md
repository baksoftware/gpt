# Go Web Server Backend

This is a simple Go web server that provides a RESTful API for a task management application.

## Prerequisites

- Go 1.21 or higher
- [Gorilla Mux](https://github.com/gorilla/mux) for routing
- [rs/cors](https://github.com/rs/cors) for CORS support

## Installation

1. Install the required dependencies:

```bash
go get github.com/gorilla/mux
go get github.com/rs/cors
```

2. Run the server:

```bash
go run main.go
```

The server will start on port 8080.

## API Endpoints

- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/{id}` - Get a specific task
- `PUT /api/tasks/{id}` - Update a task
- `DELETE /api/tasks/{id}` - Delete a task

## Data Format

Example of a task object:

```json
{
  "id": "1",
  "title": "Learn Go",
  "completed": false,
  "createdAt": "2023-05-01T12:00:00Z"
}
``` 