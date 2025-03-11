import { Task } from '../types';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (completed: boolean) => void;
  onDelete: () => void;
}

const TaskItem = ({ task, onToggleComplete, onDelete }: TaskItemProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <li className={`task-item ${task.completed ? 'completed' : ''}`}>
      <div className="task-content">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={(e) => onToggleComplete(e.target.checked)}
        />
        <div className="task-details">
          <span className="task-title">{task.title}</span>
          <span className="task-date">Created: {formatDate(task.createdAt)}</span>
        </div>
      </div>
      <button className="delete-btn" onClick={onDelete}>
        Delete
      </button>
    </li>
  );
};

export default TaskItem; 