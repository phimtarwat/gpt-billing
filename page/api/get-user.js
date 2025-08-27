import { google } from "googleapis";

export default async function handler(req, res) {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: "session_id required" });

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "Members!A:G",
    });

    const rows = read.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][6] === session_id) {
        return res.json({
          user_id: rows[i][0],
          token: rows[i][1],
          token_expiry: rows[i][2],
          quota: rows[i][3],
        });
      }
    }
    res.json({});
  } catch (err) {
    res.status(500).json({ error: "Google Sheets error" });
  }
}

