import { GoogleSpreadsheet } from "google-spreadsheet";

export default async function handler(req, res) {
  try {
    // Debug: ตรวจว่า ENV มีจริงมั้ย
    console.log(
      "ENV GOOGLE_SERVICE_ACCOUNT_KEY exists?",
      !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    );

    // โหลด ENV
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");
    console.log("Loaded creds keys:", Object.keys(creds));

    // ✅ ใช้วิธี auth แบบ useServiceAccountAuth
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key,
    });

    // โหลดข้อมูล
    await doc.loadInfo();
    console.log("Spreadsheet title:", doc.title);

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    console.log("Total rows:", rows.length);

    // ค้นหา user ตาม query
    const { user_id, token } = req.query;
    const user = rows.find(
      (r) => r.user_id === user_id && r.token === token
    );

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
    res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}
