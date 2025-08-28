import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { user_id, token } = req.body;
  if (!user_id || !token) return res.status(400).json({ error: "user_id and token required" });

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "Members!A:E",
    });

    const rows = read.data.values || [];
    const today = new Date();

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === user_id && rows[i][1] === token) {
        const expiry = new Date(rows[i][2]);
        const quota = parseInt(rows[i][3]);
        let used = parseInt(rows[i][4]);

        if (today > expiry) return res.json({ allowed: false, message: "หมดอายุแล้ว" });
        if (used >= quota) return res.json({ allowed: false, message: "ใช้ครบแล้ว" });

        used++;
        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.SHEET_ID,
          range: `Members!E${i + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[used]] },
        });

        return res.json({ allowed: true, remaining: quota - used, expiry: rows[i][2] });
      }
    }

    res.json({ allowed: false, message: "ไม่พบ user_id/token" });
  } catch (err) {
    res.status(500).json({ error: "Google Sheets error" });
  }
}

