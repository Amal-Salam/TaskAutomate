/* eslint-disable prettier/prettier */
import { Routes, Route } from "react-router-dom";
import Layout from "./Components/Layout2.js";
import Dashboard from "./Pages/Dashboard.js";
import PredictiveTimeline from "./Pages/Timeline.js";
import AcceptInvite from "./Pages/AcceptInvite.js";
import WorkspaceSettings from "./Pages/WorkspaceSettings.js";
import Projects from "./Pages/Projects.js";
import TaskQueue from "./Pages/TaskQueue.js";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

export default function App() {
  return (
    <Routes>
      {/* invite route - outside Layout, no auth required to view */}
      <Route path = "/invite/:token" element = {<AcceptInvite/>}/>
      <Route path = "/*" element = {
        <>
      <SignedIn>
        <Layout>
          {(workspaceId) => (
            <Routes>
              <Route path="/" element={<Dashboard workspaceId={workspaceId} />} />
              <Route path ="/projects" element={<Projects/>}/>
              <Route path ="/kanban-board" element={<TaskQueue workspaceId={workspaceId}/>}/>
              <Route path="/timeline" element={<PredictiveTimeline workspaceId={workspaceId} />} />
              <Route path="/settings" element ={<WorkspaceSettings/>}/>
              
            </Routes>
          )}
        </Layout>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      </>
      }
      />
    </Routes>
    
  );
}