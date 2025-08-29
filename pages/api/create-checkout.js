import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { plan, user_id } = req.body;

    if (!plan || !user_id) {
      return res.status(400).json({ error: "Missing plan or user_id" });
    }

    // 👉 กำหนดราคาแต่ละแผน (บาท)
    let price = 0;
    if (plan === "lite") price = 99;
    if (plan === "standard") price = 199;
    if (plan === "premium") price = 299;

    if (price === 0) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    // 👉 ใช้ BASE_URL จาก env ถ้ามี ไม่งั้น fallback
    const BASE_URL = process.env.BASE_URL || "https://gpt-billing.vercel.app";

    // 👉 สร้าง Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "promptpay"], // ✅ รองรับทั้งบัตร & PromptPay
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: `AstroWise Plan - ${plan}`,
            },
            unit_amount: price * 100, // Stripe ใช้หน่วยสตางค์
          },
          quantity: 1,
        },
      ],
      mode: "payment", // ⚠️ PromptPay ใช้ได้เฉพาะ payment (one-time) ไม่รองรับ subscription
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancel`,
      metadata: {
        plan,
        user_id,
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Error creating checkout:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
