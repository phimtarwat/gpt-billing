import Stripe from "stripe";
import { Readable } from "stream";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false, // ต้องปิด default bodyParser ของ Next.js
  },
};

// helper: raw body
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 👉 กรณีชำระเงินเสร็จ
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const plan = session.metadata.plan;
    const user_id = session.metadata.user_id;

    console.log("✅ Payment success:", { user_id, plan });

    // กำหนด quota ตาม plan
    let quota = 50;
    if (plan === "standard") quota = 100;
    if (plan === "premium") quota = 200;

    // 👉 ยิงไป create-user API
    try {
      await fetch(`${process.env.BASE_URL}/api/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          plan,
          quota,
          expiryDays: 30,
        }),
      });
      console.log("✅ User created/updated in Google Sheet");
    } catch (err) {
      console.error("❌ Failed to call create-user API:", err);
    }
  }

  res.json({ received: true });
}
