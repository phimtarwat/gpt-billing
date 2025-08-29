import { GoogleSpreadsheet } from "google-spreadsheet";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id, plan, quota, expiryDays } = req.body;

    if (!user_id || !plan) {
      return res.status(400).json({ error: "Missing user_id or plan" });
    }

    // ✅ decode JSON จาก ENV
    const creds = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, "base64").toString()
    );

    // ✅ auth Google Sheet
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];

    // ✅ สร้าง token แบบสุ่ม
    const token = Math.random().toString(36).substring(2, 10);

    // ✅ วันหมดอายุ
    const expiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // ✅ เขียนข้อมูลใหม่ลง sheet
    await sheet.addRow({
      user_id,
      token,
      token_expiry: expiry,
      quota,
      used_count: 0,
      fingerprint: "",
      session_id: "",
      plan,
      status: "active",
    });

    res.json({ ok: true, message: "User created", user_id, plan });
  } catch (err) {
    console.error("❌ create-user error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
