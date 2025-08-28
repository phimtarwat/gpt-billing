import { useState } from "react";

export default function Home() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (plan) => {
    if (!userId) {
      alert("กรุณาใส่ User ID ก่อน");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, plan }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.url) {
      window.location.href = data.url; // redirect ไป Stripe Checkout
    } else {
      alert("เกิดข้อผิดพลาด: " + (data.error || "ไม่สามารถสร้าง Checkout ได้"));
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>✨ GPT Billing API ✨</h1>
      <p>ระบบสมัครแพ็กเกจสำหรับ Custom GPT</p>

      <div style={{ margin: "1rem 0" }}>
        <label>ใส่ User ID: </label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="เช่น 1001"
          style={{ padding: "0.5rem", marginRight: "1rem" }}
        />
      </div>

      <h2>เลือกแพ็กเกจ:</h2>
      <div style={{ display: "flex", gap: "1rem" }}>
        <button onClick={() => handleCheckout("lite")} disabled={loading}>
          🚀 Lite (50 ครั้ง / เดือน)
        </button>
        <button onClick={() => handleCheckout("standard")} disabled={loading}>
          ⭐ Standard (200 ครั้ง / เดือน)
        </button>
        <button onClick={() => handleCheckout("premium")} disabled={loading}>
          💎 Premium (ไม่จำกัด)
        </button>
      </div>
    </div>
  );
}
