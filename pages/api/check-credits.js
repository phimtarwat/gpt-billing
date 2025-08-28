import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  try {
    // ✅ Debug 1: ตรวจว่ามี ENV จริงมั้ย
    console.log(
      "ENV GOOGLE_SERVICE_ACCOUNT_KEY exists?",
      !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    );

    // ✅ โหลด ENV
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");

    // ✅ Debug 2: ดูว่ามี key อะไรบ้าง
    console.log("Loaded creds:", Object.keys(creds));

    // ✅ Debug 3: ดู email ที่โหลดมา
    console.log("Service account email:", creds.client_email);

    // ✅ สร้าง JWT auth
    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // ✅ เชื่อม Google Sheet
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    console.log("Spreadsheet title:", doc.title);

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    console.log("Total rows:", rows.length);

    // ✅ Response กลับ
    res.status(200).json({
      ok: true,
      totalRows: rows.length,
      firstRow: rows[0]?._rawData || null,
    });
  } catch (err) {
    console.error("Google Sheets error:", err);
    res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
}
