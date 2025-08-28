import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const { user_id, token } = req.query;
    const user = rows.find(r => r.user_id === user_id && r.token === token);

    if (!user) {
      return res.status(401).json({ error: "Invalid user or token" });
    }

    const quota = parseInt(user.quota, 10);
    const used = parseInt(user.used_count, 10);

    res.status(200).json({
      user_id: user.user_id,
      quota,
      used_count: used,
      remaining: quota - used,
      expiry: user.token_expiry,
      valid: true,
    });
  } catch (err) {
    console.error("Google Sheets error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
