import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  try {
    // ✅ Debug ตรงนี้
    console.log("ENV GOOGLE_SERVICE_ACCOUNT_KEY exists?", !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");

    // ✅ Debug ตรงนี้
    console.log("Loaded creds:", Object.keys(creds));

    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    res.status(200).json({ ok: true, totalRows: rows.length });
  } catch (err) {
    console.error("Google Sheets error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
