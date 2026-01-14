/* eslint-disable prettier/prettier */
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.js';
import Dashboard from './pages/Dashboard.js';
import PredictiveTimeline from './components/PredictiveTimeline.js';
// import Settings from './pages/Settings';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';

export default function App() {
  return (
    <>
      <SignedIn>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/timeline" element={<PredictiveTimeline />} />
            {/* <Route path="/settings" element={<Settings />} /> */}
          </Routes>
        </Layout>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
