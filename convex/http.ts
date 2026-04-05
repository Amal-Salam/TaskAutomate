/* eslint-disable prettier/prettier */
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

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
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;