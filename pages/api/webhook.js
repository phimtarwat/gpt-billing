import Stripe from "stripe";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false, // ❌ ต้องปิด bodyParser เพื่อให้ Stripe ตรวจลายเซ็นได้
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ฟังก์ชันช่วยอ่าน raw body
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// ฟังก์ชันสร้าง user_id / token ใหม่
function generateUser() {
  const user_id = Math.floor(1000 + Math.random() * 9000);
  const token = crypto.randomBytes(8).toString("hex");
  return { user_id, token };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ จัดการ event ที่เราสนใจ
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      // ดึง credits จาก metadata (ใส่ตอนสร้าง checkout)
      const plan = session.metadata.plan || "lite";
      const credits = plan === "lite" ? 5 : plan === "standard" ? 20 : 50;

      // สร้าง user ใหม่
      const { user_id, token } = generateUser();
      const today = new Date();
      const expiry = new Date();
      expiry.setDate(today.getDate() + 30); // +30 วัน

      // เชื่อม Google Sheet
      const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[0];

      // เพิ่มแถวใหม่
      await sheet.addRow({
        user_id,
        token,
        token_expiry: expiry.toISOString().split("T")[0],
        quota: credits,
        used_count: 0,
        fingerprint: "",
        session_id: session.id,
      });

      console.log(`✅ User created in sheet: ${user_id} / ${token}`);
    } catch (err) {
      console.error("Google Sheets update error:", err);
      return res.status(500).send("Failed to update Google Sheet");
    }
  }

  res.status(200).json({ received: true });
}
