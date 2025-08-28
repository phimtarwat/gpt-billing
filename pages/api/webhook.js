import Stripe from "stripe";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false, // ต้องใช้ raw body สำหรับ Stripe
  },
};

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (chunk) => chunks.push(chunk));
    readable.on("end", () => resolve(Buffer.concat(chunks)));
    readable.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];

  try {
    const event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const plan = session.metadata.plan;

      let quota = 50;
      if (plan === "standard") quota = 200;
      if (plan === "premium") quota = 500;

      const creds = JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64, "base64").toString()
      );

      const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[0];
      const rows = await sheet.getRows();

      const user = rows.find(r => r.user_id === userId);
      if (user) {
        user.plan = plan;
        user.status = "active";
        user.token_expiry = new Date(new Date().setMonth(new Date().getMonth() + 1))
          .toISOString()
          .split("T")[0];
        user.quota = quota;
        user.used_count = 0;
        await user.save();
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("webhook error:", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
