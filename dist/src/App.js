import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.js';
import Dashboard from './pages/Dashboard.js';
import PredictiveTimeline from './components/PredictiveTimeline.js';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
export default function App() {
    return (_jsxs(_Fragment, { children: [_jsx(SignedIn, { children: _jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/timeline", element: _jsx(PredictiveTimeline, {}) })] }) }) }), _jsx(SignedOut, { children: _jsx(RedirectToSignIn, {}) })] }));
}
//# sourceMappingURL=App.js.map