import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");

    console.log("Loaded creds:", Object.keys(creds)); // DEBUG

    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);
    await doc.loadInfo(); // 👈 ถ้า auth ไม่ถูก จะ error ตรงนี้

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    res.status(200).json({
      ok: true,
      totalRows: rows.length,
      firstRow: rows[0]?._rawData || null
    });
  } catch (err) {
    console.error("Google Sheets error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
