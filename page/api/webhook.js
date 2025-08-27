import Stripe from "stripe";
import { google } from "googleapis";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function generateUser() {
  const user_id = Math.floor(1000 + Math.random() * 9000);
  const token = crypto.randomBytes(8).toString("hex");
  return { user_id, token };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const credits = parseInt(session.metadata.credits, 10);
    const { user_id, token } = generateUser();

    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 30);

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: "Members!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          user_id,
          token,
          expiry.toISOString().split("T")[0],
          credits,
          0,
          "",
          session.id
        ]],
      },
    });
  }

  res.json({ received: true });
}

