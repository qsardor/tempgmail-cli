/**
 * tempgmail - Zero-dependency @gmail.com temp mail CLI
 * Reverse-engineered from Emailnator (emailnator.com)
 * No browser required after initial session fetch.
 */

const BASE = "https://www.emailnator.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/**
 * Step 1: Get a fresh session (XSRF-TOKEN + session cookie)
 * by loading the homepage once.
 */
async function getSession() {
  const res = await fetch(BASE + "/", {
    headers: { "User-Agent": UA },
    redirect: "follow",
  });

  // Extract Set-Cookie headers
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const cookies = {};

  for (const c of raw) {
    const [pair] = c.split(";");
    const [key, ...valParts] = pair.split("=");
    cookies[key.trim()] = valParts.join("=").trim();
  }

  // XSRF-TOKEN value is URL-encoded
  const xsrf = cookies["XSRF-TOKEN"]
    ? decodeURIComponent(cookies["XSRF-TOKEN"])
    : null;

  return { cookies, xsrf };
}

/**
 * Serialize cookies object to header string
 */
function buildCookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

/**
 * Step 2: Generate a new @gmail.com email address
 */
export async function generateEmail(session, types = ['domain', 'plusGmail', 'googleMail', 'dotGmail']) {
  const res = await fetch(BASE + "/api/generate-email", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-XSRF-TOKEN": session.xsrf,
      "Cookie": buildCookieHeader(session.cookies),
      "Referer": BASE + "/",
      "Origin": BASE,
    },
    body: JSON.stringify({ email: types }),
  });

  if (!res.ok) throw new Error(`generate-email failed: ${res.status}`);
  const data = await res.json();
  return data.email; // e.g. "jess.eldial4@gmail.com"
}

/**
 * Step 3: Get inbox message list for an email address
 */
export async function getInbox(session, email) {
  const res = await fetch(BASE + "/api/inbox", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-XSRF-TOKEN": session.xsrf,
      "Cookie": buildCookieHeader(session.cookies),
      "Referer": BASE + "/",
      "Origin": BASE,
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) throw new Error(`inbox failed: ${res.status}`);
  const data = await res.json();
  return data.messageData || [];
}

/**
 * Step 4: Read a specific message body
 */
export async function getMessage(session, email, messageId) {
  const res = await fetch(BASE + "/api/message-list", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-XSRF-TOKEN": session.xsrf,
      "Cookie": buildCookieHeader(session.cookies),
      "Referer": BASE + "/",
      "Origin": BASE,
    },
    body: JSON.stringify({ email, messageId }),
  });

  if (!res.ok) throw new Error(`message-list failed: ${res.status}`);
  return await res.json();
}

/**
 * Wait for a new email to arrive and extract a numeric OTP code
 */
export async function waitForOTP(session, email, options = {}) {
  const { timeout = 120_000, interval = 4_000, pattern = /\b\d{4,8}\b/ } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const messages = await getInbox(session, email);
    for (const msg of messages) {
      const body = await getMessage(session, email, msg.messageID);
      const text = body?.subject + " " + (body?.html || body?.text || "");
      const match = text.match(pattern);
      if (match) return match[0];
    }
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error("OTP not received within timeout");
}

/**
 * Full convenience: create email + wait for OTP
 */
export async function createAndWaitOTP(options = {}) {
  const session = await getSession();
  const email = await generateEmail(session);
  return { email, session, waitForOTP: (opts) => waitForOTP(session, email, opts) };
}

export { getSession };
