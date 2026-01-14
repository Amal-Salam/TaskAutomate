import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { BsRobot } from "react-icons/bs";
const messages = [
    "AI has shifted 3 deadlines to keep you on track ✨",
    "All tasks are progressing smoothly ✨",
    "Heads-up: 1 task at risk of slipping ✨",
];
export default function AIIntelligenceBar() {
    const [idx, setIdx] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setIdx((i) => (i + 1) % messages.length), 7000);
        return () => clearInterval(t);
    }, []);
    return (_jsx("div", { className: "relative w-full h-12 bg-gradient-to-r from-iris/20 to-iris/10 dark:from-iris/30 dark:to-iris/20 backdrop-blur-glass border-b border-iris/30", children: _jsxs("div", { className: "mx-auto max-w-7xl flex items-center h-full px-4", children: [_jsx(BsRobot, { className: "text-iris mr-2", size: 20 }), _jsx("span", { className: "text-sm sm:text-base font-medium text-indigo dark:text-iris animate-fade-in", children: messages[idx] })] }) }));
}
//# sourceMappingURL=AIBar.js.map