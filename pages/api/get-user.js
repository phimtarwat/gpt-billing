import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  try {
    const { user_id, token } = req.query;
    if (!user_id || !token) {
      return res.status(400).json({ error: "Missing user_id or token" });
    }

    const creds = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64, "base64").toString()
    );

    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const user = rows.find(r => r.user_id === user_id && r.token === token);
    if (!user) return res.status(401).json({ error: "Invalid user_id or token" });

    return res.status(200).json({
      ok: true,
      user_id,
      plan: user.plan,
      status: user.status,
      quota: user.quota,
      used_count: user.used_count,
      expiry: user.token_expiry,
    });
  } catch (err) {
    console.error("get-user error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
