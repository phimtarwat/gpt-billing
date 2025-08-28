import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user_id, token } = req.query;

  try {
    // load service account
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

    const user = rows.find(r => r.user_id === user_id && r.token === token);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const quota = parseInt(user.quota || 0);
    const used = parseInt(user.used_count || 0);

    return res.status(200).json({
      user_id,
      quota,
      used_count: used,
      remaining: quota - used,
      valid: true
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
