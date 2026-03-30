/* eslint-disable prettier/prettier */
import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { useUser } from "@clerk/clerk-react";

interface Workspace {
  _id: string;
  name: string;
  role?: "admin" | "member";
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspaceId: (id: string) => void;
  loading: boolean;
  userReady: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  activeWorkspace: null,
  setActiveWorkspaceId: () => {},
  loading: true,
  userReady: false,
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [userReady, setUserReady] = useState(false);

  const ensureExists = useMutation(api.users.ensureExists);

  // Step 1: as soon as Clerk confirms sign-in, ensure the user
  // record exists in Convex before running any other queries
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    ensureExists()
      .then(() => setUserReady(true))
      .catch(console.error);
  }, [isLoaded, isSignedIn]);

  // Step 2: only query workspaces once the user record is confirmed
  const workspaces = useQuery(
    api.workspaces.listMine,
    userReady ? {} : "skip"
  );

  // Restore active workspace from localStorage or default to first
  useEffect(() => {
    if (!workspaces || workspaces.length === 0) return;
    const saved = localStorage.getItem("taskAutomate_activeWorkspace");
    if (saved && workspaces.find((w) => w._id === saved)) {
      setActiveId(saved);
    } else {
      setActiveId(workspaces[0]._id);
    }
  }, [workspaces]);

  const setActiveWorkspaceId = (id: string) => {
    setActiveId(id);
    localStorage.setItem("taskAutomate_activeWorkspace", id);
  };

  const activeWorkspace = workspaces?.find((w) => w._id === activeId) ?? null;
  const loading = !isLoaded || !userReady || workspaces === undefined;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces: workspaces ?? [],
        activeWorkspace,
        setActiveWorkspaceId,
        loading,
        userReady,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
