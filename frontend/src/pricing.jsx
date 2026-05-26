const PLANS = [
  {
    name: "Free",
    price: "€0",
    period: "forever",
    features: ["3 analyses per day", "Standard coaching", "Last 5 games", "Match history with account"],
    priceId: null,
    cta: "Current plan"
  },
  {
    name: "Pro",
    price: "€9.99",
    period: "per month",
    features: ["10 analyses per day", "Standard coaching", "Last 5 games", "Match history"],
    priceId: "price_1TbTENRnWgGARkMOU3IvakFc",
    cta: "Get Pro"
  },
  {
    name: "Elite",
    price: "€14.99",
    period: "per month",
    features: ["15 analyses per day", "In-depth coaching", "More coaching points", "Match history", "Priority support"],
    priceId: "price_1TbTFvRnWgGARkMOAwKG2Wq4",
    cta: "Get Elite"
  }
]

export default function Pricing() {
  const handleSubscribe = async (priceId) => {
    if (!priceId) return
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px" }}>
      <h2 style={{ textAlign: "center", fontSize: "28px", fontWeight: "700", color: "#f0f0fa", marginBottom: "8px" }}>
        Simple pricing
      </h2>
      <p style={{ textAlign: "center", color: "#666680", marginBottom: "40px", fontSize: "15px" }}>
        Upgrade to get more analyses and deeper coaching
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {PLANS.map(plan => (
          <div key={plan.name} style={{
            background: plan.name === "Pro" ? "#16162a" : "#12121e",
            border: `1px solid ${plan.name === "Pro" ? "#c89b3c" : "#1a1a2e"}`,
            borderRadius: "12px",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: plan.name === "Pro" ? "#c89b3c" : "#666680", marginBottom: "12px" }}>
              {plan.name}
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#f0f0fa", marginBottom: "4px" }}>
              {plan.price}
            </div>
            <div style={{ fontSize: "13px", color: "#666680", marginBottom: "24px" }}>
              {plan.period}
            </div>
            <div style={{ flex: 1 }}>
              {plan.features.map(f => (
                <div key={f} style={{ fontSize: "14px", color: "#b0b0c8", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#c89b3c" }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => handleSubscribe(plan.priceId)}
              disabled={!plan.priceId}
              style={{
                marginTop: "24px",
                background: plan.priceId ? "#c89b3c" : "transparent",
                color: plan.priceId ? "#0a0a0f" : "#444460",
                border: plan.priceId ? "none" : "1px solid #2a2a40",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: plan.priceId ? "pointer" : "default",
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
