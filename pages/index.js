import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("1001"); // default user_id
  const [plan, setPlan] = useState("lite");

  const handleCheckout = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, plan }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // ไป Stripe Checkout
      } else {
        setError(data.error || "Unexpected error");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>GPT Billing Demo</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label>User ID: </label>
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ padding: "0.3rem" }}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>Select Plan: </label>
        <select value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="lite">Lite (50 credits)</option>
          <option value="standard">Standard (200 credits)</option>
          <option value="premium">Premium (500 credits)</option>
        </select>
      </div>

      <button
        onClick={handleCheckout}
        disabled={loading}
        style={{
          padding: "0.5rem 1rem",
          background: "blue",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {loading ? "Loading..." : "Checkout"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: "1rem" }}>
          ❌ Error: {error}
        </p>
      )}
    </div>
  );
}
