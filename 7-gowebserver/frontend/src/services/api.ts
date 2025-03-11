import axios from 'axios';
import { Task } from '../types';

const API_URL = 'http://localhost:8080/api';

export const api = {
  // Get all tasks
  getTasks: async (): Promise<Task[]> => {
    const response = await axios.get(`${API_URL}/tasks`);
    return response.data;
  },

  // Get a single task by ID
  getTask: async (id: string): Promise<Task> => {
    const response = await axios.get(`${API_URL}/tasks/${id}`);
    return response.data;
  },

  // Create a new task
  createTask: async (task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
    const response = await axios.post(`${API_URL}/tasks`, task);
    return response.data;
  },

  // Update an existing task
  updateTask: async (id: string, task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
    const response = await axios.put(`${API_URL}/tasks/${id}`, task);
    return response.data;
  },

  // Delete a task
  deleteTask: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/tasks/${id}`);
  }
}; 