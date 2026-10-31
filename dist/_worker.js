const INBOX = "info@brandandbyte.com";
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/lead" && request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(request) });
    }
    if (url.pathname === "/api/lead" && request.method === "POST") {
      const headers = cors(request);
      if (!headers) return json({ error: "Origin not allowed" }, 403);
      if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "JSON required" }, 415, headers);
      const length = Number(request.headers.get("content-length") || 0);
      if (length > MAX_AUDIO_BYTES * 1.5) return json({ error: "Request too large" }, 413, headers);
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400, headers); }
      const { name, email, company, challenge, outcome, timing, phone, context, voice } = body || {};
      if (![name, email, company, challenge, outcome, timing].every(v => typeof v === "string" && v.trim())) return json({ error: "Complete the required fields" }, 400, headers);
      if (name.length > 120 || company.length > 250 || context?.length > 3000 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "Check the submitted information" }, 400, headers);
      const attachments = [];
      if (voice?.data) {
        if (typeof voice.data !== "string" || voice.data.length > MAX_AUDIO_BYTES * 1.4) return json({ error: "Voice note exceeds 8 MB" }, 413, headers);
        const mime = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"].find(x => voice.type?.startsWith(x));
        if (!mime) return json({ error: "Unsupported voice-note format" }, 400, headers);
        attachments.push({ filename: `brandbyte-voice-note.${mime === "audio/mp4" ? "m4a" : mime.split("/")[1]}`, content: voice.data });
      }
      const esc = s => String(s || "—").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
      const html = `<h2>New Brand&Byte growth inquiry</h2><p><b>Name:</b> ${esc(name)}</p><p><b>Email:</b> ${esc(email)}</p><p><b>Company / website:</b> ${esc(company)}</p><p><b>Challenge:</b> ${esc(challenge)}</p><p><b>Desired outcome:</b> ${esc(outcome)}</p><p><b>Timing:</b> ${esc(timing)}</p><p><b>Phone:</b> ${esc(phone)}</p><p><b>Context:</b><br>${esc(context).replace(/\n/g,"<br>")}</p><p>Voice note attached: ${attachments.length ? "yes" : "no"}</p>`;
      const mail = await fetch("https://api.resend.com/emails", { method:"POST", headers:{ Authorization:`Bearer ${env.RESEND_API_KEY}`, "Content-Type":"application/json" }, body:JSON.stringify({ from:env.MAIL_FROM || "Brand&Byte Website <website@brandandbyte.com>", to:[INBOX], reply_to:email, subject:`Growth inquiry · ${name} · ${company}`, html, ...(attachments.length ? { attachments } : {}) }) });
      if (!mail.ok) { console.error("Resend error", mail.status, await mail.text()); return json({ error:"Email delivery failed" }, 502, headers); }
      return json({ ok:true }, 200, headers);
    }
    return env.ASSETS.fetch(request);
  }
};

function cors(request) {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) return null;
  const headers = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods":"POST, OPTIONS", "Access-Control-Allow-Headers":"Content-Type", "Vary":"Origin" };
  return headers;
}
function json(data, status=200, headers={}) { return new Response(JSON.stringify(data), { status, headers:{...headers,"Content-Type":"application/json; charset=utf-8"} }); }
