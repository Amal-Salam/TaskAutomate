/* eslint-disable prettier/prettier */
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const payload = await request.json();

    if (payload.type === "email.created") {
      const otp = payload.data?.data?.otp_code;
      const toEmail = payload.data?.to_email_address;

      if (otp && toEmail) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "ForeSight <notifications@foresightsync.com>",
            to: [toEmail],
            subject: `${otp} is your ForeSight verification code`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
                <h2 style="color: #1E1B4B;">ForeSight Verification Code</h2>
                <p style="color: #6B7280;">Enter the following code when prompted:</p>
                <p style="font-size: 40px; font-weight: bold; color: #1E1B4B;">${otp}</p>
                <p style="color: #9CA3AF; font-size: 13px;">Do not share this code with anyone.</p>
              </div>
            `,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          console.error("Failed to send verification email:", err);
          return new Response("Email send failed", { status: 500 });
        }
      }
      return new Response("OK", { status: 200 });
    }
    
    if (payload.type === "user.created") {
      const data = payload.data;
      const primaryEmail = data.email_addresses?.find(
        (e: any) => e.id === data.primary_email_address_id
      );

    if (primaryEmail?.verification?.status !== "verified") {
        console.warn("user.created fired but email not verified — skipping upsert");
        return new Response("OK", { status: 200 });
      }

      await _ctx.runMutation(internal.users.upsert, {
        clerkId: data.id,
        email: primaryEmail.email_address,
        name: [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined,
        avatarUrl: data.image_url ?? undefined,
      });

      return new Response("OK", { status: 200 });
    }

    // ── 3. User updated — covers profile changes and email verification ──────
    // Also fires when a secondary email gets verified and becomes primary.
    if (payload.type === "user.updated") {
      const data = payload.data;
      const primaryEmail = data.email_addresses?.find(
        (e: any) => e.id === data.primary_email_address_id
      );

      if (!primaryEmail) {
        return new Response("OK", { status: 200 });
      }

      // Only upsert if the primary email is verified.
      // This is the gate that makes autoAcceptPendingInvites safe.
      if (primaryEmail?.verification?.status !== "verified") {
        return new Response("OK", { status: 200 });
      }

      await _ctx.runMutation(internal.users.upsert, {
        clerkId: data.id,
        email: primaryEmail.email_address,
        name: [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined,
        avatarUrl: data.image_url ?? undefined,
      });

      return new Response("OK", { status: 200 });
    }

    // Unhandled event types — return 200 so Clerk doesn't retry
    return new Response("OK", { status: 200 });

  }),
});

export default http;