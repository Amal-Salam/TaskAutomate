/* eslint-disable prettier/prettier */
"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export const sendInvite = action({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Verify sender is an admin
    const sender = await ctx.runQuery(api.invites.getCallerMembership, {
      workspaceId: args.workspaceId,
    });
    if (!sender || sender.role !== "admin") throw new Error("Only admins can invite members");

    // Check for existing pending invite
    const existing = await ctx.runQuery(api.invites.getPendingInvite, {
      workspaceId: args.workspaceId,
      email: args.email,
    });
    if (existing) throw new Error("An invite is already pending for this email");

    // Get workspace name for the email
    const workspace = await ctx.runQuery(api.invites.getWorkspace, {
      workspaceId: args.workspaceId,
    });
    if (!workspace) throw new Error("Workspace not found");

    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.runMutation(api.invites.createInviteRecord, {
      workspaceId: args.workspaceId,
      email: args.email,
      token,
      role: args.role,
      invitedBy: sender.userId,
      expiresAt,
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:5173";
    const inviteUrl = `${appUrl}/invite/${token}`;

    const deliverTo = process.env.DEV_EMAIL ?? args.email;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TaskAutomate <onboarding@resend.dev>",
        to: [deliverTo],
        subject: `You've been invited to ${workspace.name} on TaskAutomate`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #1E1B4B; margin-bottom: 8px;">You're invited to join ${workspace.name}</h2>
            <p style="color: #6B7280; margin-bottom: 24px;">
              ${identity.name ?? identity.email} has invited you to collaborate on
              <strong>${workspace.name}</strong> on TaskAutomate — an AI-powered project
              management tool that suggests smart due dates and generates task descriptions.
            </p>
            <a href="${inviteUrl}"
              style="display: inline-block; background: #5B5EA6; color: white; padding: 12px 24px;
                     border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
              Accept Invitation
            </a>
            <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">
              This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.
            </p>
            <p style="color: #D1D5DB; font-size: 12px; margin-top: 8px;">
              Or copy this link: ${inviteUrl}
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Failed to send email: ${err.message ?? res.statusText}`);
    }

    return { success: true };
  },
});