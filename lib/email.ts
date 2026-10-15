import "server-only";

// Sends through Resend's HTTP API. Without RESEND_API_KEY (local dev) the email
// is printed to the server console instead, so links can still be clicked.
export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email] To: ${to}\nSubject: ${subject}\n\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Loopgrain <hello@loopgrain.io>",
      to,
      subject,
      text,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
}
