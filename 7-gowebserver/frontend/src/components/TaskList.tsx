import { useState, useEffect } from 'react';
import { Task } from '../types';
import { api } from '../services/api';
import TaskItem from './TaskItem';
import TaskForm from './TaskForm';

const TaskList = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch tasks. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleTaskCreate = async (title: string) => {
    try {
      const newTask = await api.createTask({ title, completed: false });
      setTasks([...tasks, newTask]);
    } catch (err) {
      setError('Failed to create task. Please try again.');
      console.error(err);
    }
  };

  const handleTaskUpdate = async (id: string, completed: boolean) => {
    try {
      const taskToUpdate = tasks.find(task => task.id === id);
      if (!taskToUpdate) return;
      
      const updatedTask = await api.updateTask(id, {
        title: taskToUpdate.title,
        completed
      });
      
      setTasks(tasks.map(task => task.id === id ? updatedTask : task));
    } catch (err) {
      setError('Failed to update task. Please try again.');
      console.error(err);
    }
  };

  const handleTaskDelete = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks(tasks.filter(task => task.id !== id));
    } catch (err) {
      setError('Failed to delete task. Please try again.');
      console.error(err);
    }
  };

  if (loading) return <div className="loading">Loading tasks...</div>;

  return (
    <div className="task-list">
      <h2>Task List</h2>
      
      {error && <div className="error">{error}</div>}
      
      <TaskForm onCreateTask={handleTaskCreate} />
      
      {tasks.length === 0 ? (
        <p>No tasks yet. Add one above!</p>
      ) : (
        <ul>
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={(completed) => handleTaskUpdate(task.id, completed)}
              onDelete={() => handleTaskDelete(task.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskList; 