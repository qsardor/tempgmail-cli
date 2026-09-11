#!/usr/bin/env node
/**
 * tempgmail CLI
 * Usage:
 *   tempgmail new              → generate a new email
 *   tempgmail inbox <email>    → list inbox messages
 *   tempgmail read <email> <id> → read a specific message
 *   tempgmail otp <email>      → wait and print the first OTP found
 */

import { getSession, generateEmail, getInbox, getMessage, waitForOTP } from "./index.js";

const [,, cmd, ...args] = process.argv;

function printHelp() {
  console.log(`
tempgmail - Temporary @gmail.com address CLI

Usage:
  tempgmail new                     Generate a new temp email
  tempgmail inbox <email>           List inbox messages
  tempgmail read <email> <msgId>    Read a specific message
  tempgmail otp <email>             Wait and print OTP code (4-8 digits)

Examples:
  tempgmail new
  tempgmail inbox jess.eldial4@gmail.com
  tempgmail otp jess.eldial4@gmail.com
`);
}

async function main() {
  try {
    if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
      printHelp();
      return;
    }

    if (cmd === "new") {
      process.stdout.write("Creating email... ");
      const session = await getSession();
      const email = await generateEmail(session);
      console.log(`\n✓ ${email}`);
      // Print session for piping (JSON to stdout only on --json flag)
      if (args.includes("--json")) {
        console.log(JSON.stringify({ email, session }));
      }
      return;
    }

    if (cmd === "inbox") {
      const email = args[0];
      if (!email) { console.error("Usage: tempgmail inbox <email>"); process.exit(1); }
      const session = await getSession();
      const messages = await getInbox(session, email);
      if (messages.length === 0) {
        console.log("Inbox is empty.");
      } else {
        console.log(`\n${messages.length} message(s):\n`);
        for (const m of messages) {
          console.log(`  ID: ${m.messageID}`);
          console.log(`  From: ${m.from}`);
          console.log(`  Subject: ${m.subject}`);
          console.log(`  Time: ${m.time}`);
          console.log("  ---");
        }
      }
      return;
    }

    if (cmd === "read") {
      const [email, messageId] = args;
      if (!email || !messageId) { console.error("Usage: tempgmail read <email> <msgId>"); process.exit(1); }
      const session = await getSession();
      const msg = await getMessage(session, email, messageId);
      console.log("\nSubject:", msg.subject);
      console.log("From:", msg.from);
      console.log("\nBody:\n");
      // Strip HTML tags for terminal display
      const text = (msg.html || msg.text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      console.log(text);
      return;
    }

    if (cmd === "otp") {
      const email = args[0];
      if (!email) { console.error("Usage: tempgmail otp <email>"); process.exit(1); }
      const timeout = parseInt(args.find(a => a.startsWith("--timeout="))?.split("=")[1] || "120") * 1000;
      console.log(`Waiting for OTP in ${email} (timeout: ${timeout / 1000}s)...`);
      const session = await getSession();
      const otp = await waitForOTP(session, email, { timeout });
      console.log(`\n✓ OTP: ${otp}`);
      return;
    }

    console.error(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);

  } catch (err) {
    console.error("\n✗ Error:", err.message);
    process.exit(1);
  }
}

main();
