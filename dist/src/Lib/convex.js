import { ConvexReactClient } from "convex/react";
const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is not defined. Check your .env.local file.");
}
export const convex = new ConvexReactClient(convexUrl);
//# sourceMappingURL=convex.js.map