/* eslint-disable prettier/prettier */
import { FiCalendar, FiUser } from "react-icons/fi";

interface Props {
  title: string;
  desc: string;
  due?: string; // ISO
  assignee?: string;
  onClick?: () => void;
}

export default function TaskCard({ title, desc, due, assignee, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="card p-4 cursor-pointer hover:shadow-md transition"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-indigo dark:text-iris">{title}</h3>
        <span className="ai-sparkle text-xs text-iris">AI</span>
      </div>
      <p className="text-sm mt-2 line-clamp-2">{desc}</p>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        {due && (
          <span className="flex items-center gap-1">
            <FiCalendar /> {new Date(due).toLocaleDateString()}
          </span>
        )}
        {assignee && (
          <span className="flex items-center gap-1">
            <FiUser /> {assignee}
          </span>
        )}
      </div>
    </div>
  );
}