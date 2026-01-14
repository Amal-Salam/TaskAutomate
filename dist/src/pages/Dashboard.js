import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import TaskCard from "../components/Taskcard.js";
export default function Dashboard() {
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold text-indigo", children: "Dashboard" }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: [_jsx(TaskCard, { title: "Build landing page", desc: "Design and implement the marketing landing with Tailwind CSS.", due: "2025-07-10", assignee: "You" }), _jsx(TaskCard, { title: "Integrate AI due-date", desc: "Train XGBoost model and expose via FastAPI endpoint.", due: "2025-07-12" })] })] }));
}
//# sourceMappingURL=Dashboard.js.map