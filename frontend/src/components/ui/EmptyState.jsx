import { HiOutlineSparkles } from 'react-icons/hi2';

export default function EmptyState({
  title = 'Nenhum resultado',
  message,
  icon,
  action
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        {icon || <HiOutlineSparkles className="h-5 w-5" />}
      </div>

      <div className="empty-state-copy">
        <p className="empty-state-title">{title}</p>
        {message ? <p className="empty-state-message">{message}</p> : null}
      </div>

      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
