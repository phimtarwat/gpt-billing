import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  // ✅ ตรวจสอบว่าต้องเป็น GET เท่านั้น
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user_id, token } = req.query;

  try {
    // ✅ โหลด Service Account จาก ENV
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // ✅ โหลด Google Sheet
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0]; // ใช้ sheet แรก
    const rows = await sheet.getRows();

    // ✅ หา user จาก user_id + token
    const user = rows.find(
      (r) => String(r.user_id) === String(user_id) && String(r.token) === String(token)
    );

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ✅ ดึง quota และ used_count
    const quota = parseInt(user.quota || 0, 10);
    const used = parseInt(user.used_count || 0, 10);

    return res.status(200).json({
      user_id,
      quota,
      used_count: used,
      remaining: quota - used,
      valid: true,
      expiry: user.token_expiry || null,
    });
  } catch (err) {
    console.error("check-credits error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}
