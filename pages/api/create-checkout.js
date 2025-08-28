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

    // 👉 ตั้งราคาแต่ละ plan (บาท)
    let price = 0;
    if (plan === "lite") price = 99;
    if (plan === "standard") price = 199;
    if (plan === "premium") price = 299;

    if (price === 0) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    // 👉 สร้าง Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: `AstroWise Plan - ${plan}`,
            },
            unit_amount: price * 100, // หน่วยสตางค์
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/cancel`,
      metadata: {
        plan,     // บอก webhook ว่าเป็น plan ไหน
        user_id,  // บอก webhook ว่าเป็น user ไหน
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Error creating checkout:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
