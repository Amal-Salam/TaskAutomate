/* eslint-disable prettier/prettier */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { useUser, SignIn } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { BsRobot } from "react-icons/bs";
import { FiCheck, FiX } from "react-icons/fi";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useUser();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  const invite = useQuery(
    api.invites.getInviteByToken,
    token ? { token } : "skip"
  );
  const acceptInvite = useMutation(api.invites.acceptInvite);

  // Auto-accept once the user is signed in
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !invite || accepting || accepted) return;
    if (invite.status !== "pending" || invite.expired) return;

    const run = async () => {
      setAccepting(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result = await acceptInvite({ token: token! });
        setAccepted(true);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => navigate("/"), 2000);
      } catch (e: any) {
        setError(e.message ?? "Failed to accept invite.");
      } finally {
        setAccepting(false);
      }
    };
    run();
  }, [isLoaded, isSignedIn, invite]);

  // Loading invite details
  if (!invite && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offwhite dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <BsRobot size={36} className="animate-pulse text-iris" />
          <p className="text-sm">Loading invite...</p>
        </div>
      </div>
    );
  }

  // Invalid token
  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offwhite dark:bg-gray-900">
        <div className="text-center max-w-sm mx-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <FiX size={24} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-indigo dark:text-white mb-2">Invite not found</h2>
          <p className="text-sm text-gray-500 mb-6">
            This invite link is invalid or has already been used.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-iris text-white rounded-lg text-sm font-semibold hover:bg-iris/80 transition"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  // Expired invite
  if (invite.expired || invite.status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offwhite dark:bg-gray-900">
        <div className="text-center max-w-sm mx-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <FiX size={24} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-indigo dark:text-white mb-2">Invite expired</h2>
          <p className="text-sm text-gray-500 mb-6">
            This invite link expired. Ask your workspace admin to send a new one.
          </p>
        </div>
      </div>
    );
  }

  // Already accepted
  if (invite.status === "accepted" || accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offwhite dark:bg-gray-900">
        <div className="text-center max-w-sm mx-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <FiCheck size={24} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-indigo dark:text-white mb-2">
            {accepted ? "You're in!" : "Already joined"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {accepted
              ? `Welcome to ${invite.workspaceName}. Redirecting you to the dashboard...`
              : `You're already a member of ${invite.workspaceName}.`}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-iris text-white rounded-lg text-sm font-semibold hover:bg-iris/80 transition"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  // Not signed in — show Clerk sign-in
  if (isLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offwhite dark:bg-gray-900">
        <div className="text-center max-w-sm mx-4">
          <BsRobot size={40} className="text-iris mx-auto mb-4" />
          <h2 className="text-xl font-bold text-indigo dark:text-white mb-1">
            Join {invite.workspaceName}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {invite.inviterName} invited you to join as a{" "}
            <strong>{invite.role}</strong>. Sign in to accept.
          </p>
          <SignIn
            afterSignInUrl={`/invite/${token}`}
            afterSignUpUrl={`/invite/${token}`}
          />
        </div>
      </div>
    );
  }

  // Signed in, accepting in progress
  return (
    <div className="min-h-screen flex items-center justify-center bg-offwhite dark:bg-gray-900">
      <div className="text-center max-w-sm mx-4">
        <BsRobot size={40} className="text-iris mx-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-indigo dark:text-white mb-2">
          Joining {invite.workspaceName}...
        </h2>
        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}