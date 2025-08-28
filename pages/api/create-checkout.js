import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id, plan } = req.body;
    if (!user_id || !plan) {
      return res.status(400).json({ error: "Missing user_id or plan" });
    }

    // กำหนดราคา (ตัวอย่าง)
    let priceId;
    if (plan === "lite") priceId = "price_lite_id";
    if (plan === "standard") priceId = "price_standard_id";
    if (plan === "premium") priceId = "price_premium_id";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/cancel`,
      client_reference_id: user_id,
      metadata: { plan },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
