import { GoogleSpreadsheet } from "google-spreadsheet";

export default async function handler(req, res) {
  try {
    // Decode Service Account Key จาก Base64
    const decoded = Buffer.from(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64,
      "base64"
    ).toString("utf8");
    const creds = JSON.parse(decoded);

    // เชื่อม Google Sheet
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key,
    });
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    // รับค่าจาก query
    const { user_id, token } = req.query;

    if (!user_id || !token) {
      return res.status(400).json({ error: "Missing user_id or token" });
    }

    // หา row ที่ตรงกัน
    const user = rows.find(
      (r) => r.user_id === user_id && r.token === token
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid user or token" });
    }

    // อ่านข้อมูลจาก row
    const quota = parseInt(user.quota, 10) || 0;
    const used = parseInt(user.used_count, 10) || 0;
    const expiry = user.token_expiry ? new Date(user.token_expiry) : null;
    const status = user.status || "inactive";

    // ตรวจสอบสิทธิ์
    let valid = true;
    let reason = "ok";

    if (status !== "active") {
      valid = false;
      reason = "inactive";
    } else if (expiry && expiry < new Date()) {
      valid = false;
      reason = "expired";
    } else if (used >= quota) {
      valid = false;
      reason = "quota_exceeded";
    }

    // คืนค่า
    res.status(200).json({
      user_id: user.user_id,
      plan: user.plan,
      quota,
      used_count: used,
      remaining: quota - used,
      expiry: user.token_expiry,
      status,
      valid,
      reason,
    });
  } catch (err) {
    console.error("Google Sheets error:", err);
    res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
}
