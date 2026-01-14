/* eslint-disable prettier/prettier */
import TaskCard from "../components/Taskcard.js";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-indigo">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TaskCard
          title="Build landing page"
          desc="Design and implement the marketing landing with Tailwind CSS."
          due="2025-07-10"
          assignee="You"
        />
        <TaskCard
          title="Integrate AI due-date"
          desc="Train XGBoost model and expose via FastAPI endpoint."
          due="2025-07-12"
        />
      </div>
    </div>
  );
}