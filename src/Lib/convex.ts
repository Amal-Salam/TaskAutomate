/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConvexHttpClient } from "convex/browser";
import { ConvexReactClient } from "convex/react";

// This pulls your Convex URL from your environment variables
const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not defined. Check your .env.local file.");
}

export const convex = new ConvexReactClient(convexUrl);