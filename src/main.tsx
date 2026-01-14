/// <reference types="vite/client" />
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { ClerkProvider } from "@clerk/clerk-react";
import { useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { convex } from "./lib/convex";
import { ThemeProvider } from "./lib/ThemeProvider";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ThemeProvider>
          <BrowserRouter> 
          <App /> 
          </BrowserRouter>
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>
);