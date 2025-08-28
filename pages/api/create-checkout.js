import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { plan, email } = req.body;
  const pricing = {
    lite: { price: 79, credits: 5 },
    standard: { price: 199, credits: 20 },
    premium: { price: 399, credits: 50 },
  };

  const selected = pricing[plan];
  if (!selected) return res.status(400).json({ error: "Invalid plan" });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "promptpay"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: { name: `แพ็กเกจ ${plan}` },
            unit_amount: selected.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
      metadata: { email, plan, credits: selected.credits },
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: "Stripe session creation failed" });
  }
}

