import { useState } from 'react';

interface TaskFormProps {
  onCreateTask: (title: string) => void;
}

const TaskForm = ({ onCreateTask }: TaskFormProps) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (title.trim()) {
      onCreateTask(title.trim());
      setTitle('');
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a new task..."
        required
      />
      <button type="submit">Add Task</button>
    </form>
  );
};

export default TaskForm; 