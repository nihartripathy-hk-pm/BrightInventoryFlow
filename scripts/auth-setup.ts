/**
 * One-time Google OAuth2 authorization for local dev.
 *
 * Setup:
 *  1. Go to https://console.cloud.google.com/apis/credentials
 *  2. Create Credentials → OAuth client ID → Application type: Web application
 *  3. Add this to "Authorized redirect URIs":  http://localhost:3456/callback
 *  4. Download the JSON → rename to credentials.json → place in project root
 *  5. Run:  npm run auth-setup
 *     (browser opens automatically, sign in, token saved to .google-token.json)
 */
import fs from "fs";
import http from "http";
import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const CREDENTIALS_FILE = "credentials.json";
const TOKEN_FILE = ".google-token.json";
const REDIRECT_PORT = 3456;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

async function main() {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    console.error(`
ERROR: ${CREDENTIALS_FILE} not found.

Steps:
  1. Go to https://console.cloud.google.com/apis/credentials
  2. Click "Create Credentials" → "OAuth client ID"
  3. Application type: Web application
  4. Under "Authorized redirect URIs" add:  http://localhost:3456/callback
  5. Download JSON → rename to credentials.json → place in project root
  6. Also enable the Google Sheets API:
     https://console.cloud.google.com/apis/library/sheets.googleapis.com
`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf8"));
  const { client_id, client_secret } = raw.web ?? raw.installed;
  const oAuth2 = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

  const authUrl = oAuth2.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  // Try to open the browser automatically
  const opener =
    process.platform === "darwin" ? "open" :
    process.platform === "win32" ? "start" : "xdg-open";
  const { exec } = await import("child_process");
  exec(`${opener} "${authUrl}"`);

  console.log("\nOpening browser for Google authorization…");
  console.log("If it didn't open, visit this URL manually:\n");
  console.log(authUrl, "\n");

  // Spin up a temporary server to capture the redirect
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${REDIRECT_PORT}`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.end(`<h2>Authorization failed: ${error}</h2><p>You can close this tab.</p>`);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (code) {
        res.end(`
          <html><body style="font-family:sans-serif;max-width:500px;margin:80px auto;text-align:center">
            <h2>✅ Authorized!</h2>
            <p>Token saved. You can close this tab and go back to the terminal.</p>
          </body></html>
        `);
        server.close();
        resolve(code);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`Waiting for Google to redirect to http://localhost:${REDIRECT_PORT}/callback …\n`);
    });

    server.on("error", reject);

    // Timeout after 5 minutes
    setTimeout(() => { server.close(); reject(new Error("Timed out waiting for authorization.")); }, 5 * 60 * 1000);
  });

  const { tokens } = await oAuth2.getToken(code);
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  console.log(`\n✅ Token saved to ${TOKEN_FILE}`);
  console.log("You can now run:  npm run seed  and  npm run dev\n");
}

main().catch((e) => { console.error("\n❌", e.message); process.exit(1); });
