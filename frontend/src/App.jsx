import { useState } from "react"
import Pricing from "./Pricing.jsx"

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#e8e8f0",
    fontFamily: "'DM Sans', sans-serif",
    padding: "0",
  },
  nav: {
    padding: "24px 40px",
    borderBottom: "1px solid #1a1a2e",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  logo: {
    fontSize: "18px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    color: "#c89b3c",
    fontFamily: "'DM Sans', sans-serif",
    textTransform: "uppercase",
  },
  logoSub: {
    fontSize: "18px",
    fontWeight: "300",
    color: "#666680",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  hero: {
    padding: "32px 24px 24px",
    maxWidth: "900px",
    margin: "0 auto",
    textAlign: "center",
  },
  heroTitle: {
    fontSize: "36px",
    fontWeight: "700",
    lineHeight: "1.1",
    marginBottom: "10px",
    letterSpacing: "-0.02em",
    color: "#f0f0fa",
  },
  heroSub: {
    fontSize: "15px",
    color: "#666680",
    lineHeight: "1.6",
    marginBottom: "24px",
    fontWeight: "400",
  },
  searchRow: {
    display: "flex",
    gap: "8px",
    maxWidth: "480px",
    margin: "0 auto",
  },
  input: {
    background: "#12121e",
    border: "1px solid #2a2a40",
    borderRadius: "8px",
    padding: "12px 16px",
    color: "#e8e8f0",
    fontSize: "14px",
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    transition: "border-color 0.2s",
  },
  inputName: {
    flex: "2",
  },
  inputTag: {
    flex: "1",
  },
  button: {
    background: "#c89b3c",
    color: "#0a0a0f",
    border: "none",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    transition: "opacity 0.2s",
    whiteSpace: "nowrap",
  },
  content: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "0 24px 80px",
  },
  sectionTitle: {
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#666680",
    marginBottom: "16px",
  },
  matchCard: {
    background: "#12121e",
    border: "1px solid #1a1a2e",
    borderRadius: "10px",
    padding: "16px 20px",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    transition: "border-color 0.2s",
    cursor: "default",
  },
  matchLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  winBadge: {
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "3px 8px",
    borderRadius: "4px",
    minWidth: "36px",
    textAlign: "center",
  },
  matchChamp: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#f0f0fa",
  },
  matchMeta: {
    fontSize: "13px",
    color: "#666680",
    marginTop: "2px",
  },
  matchTime: {
    fontSize: "11px",
    color: "#44445a",
    marginTop: "2px",
  },
  analyseBtn: {
    background: "transparent",
    border: "1px solid #2a2a40",
    borderRadius: "6px",
    padding: "8px 16px",
    color: "#c89b3c",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    transition: "all 0.2s",
  },
  error: {
    color: "#e05555",
    fontSize: "14px",
    textAlign: "center",
    padding: "16px",
  },
  coachingCard: {
    background: "#12121e",
    border: "1px solid #1a1a2e",
    borderRadius: "10px",
    padding: "32px",
    marginTop: "8px",
  },
  coachingHeader: {
    marginBottom: "24px",
    paddingBottom: "20px",
    borderBottom: "1px solid #1a1a2e",
  },
  coachingChamp: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#f0f0fa",
    marginBottom: "6px",
  },
  coachingStats: {
    fontSize: "14px",
    color: "#666680",
  },
  coachingText: {
    fontSize: "15px",
    lineHeight: "1.8",
    color: "#b0b0c8",
    whiteSpace: "pre-wrap",
  },
  backBtn: {
    background: "transparent",
    border: "none",
    color: "#666680",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    padding: "0",
    marginBottom: "20px",
    letterSpacing: "0.04em",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  loadingText: {
    textAlign: "center",
    color: "#666680",
    fontSize: "14px",
    padding: "40px",
    letterSpacing: "0.06em",
  }
}

export default function App() {
  const [summonerName, setSummonerName] = useState("")
  const [tag, setTag] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [matches, setMatches] = useState(null)
  const [coaching, setCoaching] = useState(null)
  const [analysing, setAnalysing] = useState(false)
  const [remaining, setRemaining] = useState(null)

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    setMatches(null)
    setCoaching(null)
    try {
      const res = await fetch(`https://zealous-purpose-production-9cbe.up.railway.app/matchlist/${summonerName}/${tag}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMatches({ puuid: data.puuid, summaries: data.summaries })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyse = async (matchId, participantId) => {
    setAnalysing(true)
    setError(null)
    setCoaching(null)
    try {
      const res = await fetch(`https://zealous-purpose-production-9cbe.up.railway.app/coaching/${matchId}/${participantId}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCoaching(data)
      setRemaining(data.remaining)
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalysing(false)
    }
  }

  const timeAgo = (timestamp) => {
    const hours = Math.floor((Date.now() - timestamp) / 3600000)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <div style={styles.root}>
        <nav style={styles.nav}>
          <span style={styles.logo}>Rift</span>
          <span style={styles.logoSub}>Coach</span>
        </nav>

        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Understand why<br />you're losing</h1>
          <p style={styles.heroSub}>AI-powered coaching that explains the decisions behind your deaths, not just the numbers.</p>
          <div style={styles.searchRow}>
            <input
              style={{ ...styles.input, ...styles.inputName }}
              placeholder="Summoner name"
              value={summonerName}
              onChange={e => setSummonerName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <input
              style={{ ...styles.input, ...styles.inputTag }}
              placeholder="EUW"
              value={tag}
              onChange={e => setTag(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <button style={styles.button} onClick={handleSearch} disabled={loading}>
              {loading ? "..." : "Go"}
            </button>
          </div>
        </div>

          <div style={styles.content}>
            {error && <p style={styles.error}>{error}</p>}

            {loading && <p style={styles.loadingText}>Loading match history...</p>}
            {remaining !== null && (
              <p style={{ fontSize: "13px", color: remaining === 0 ? "#e05555" : "#c89b3c", marginBottom: "16px" }}>
                {remaining === 0 
                  ? "No analyses remaining today. Resets at midnight." 
                  : `${remaining} free ${remaining === 1 ? "analysis" : "analyses"} remaining today`}
              </p>
            )}
            {matches && !coaching && (
              <div>
                <p style={styles.sectionTitle}>Recent Games — Select one to analyse</p>
                {matches.summaries.map(m => (
                  <div key={m.matchId} style={{
                    ...styles.matchCard,
                    borderLeft: `3px solid ${m.win ? "#3c7a4a" : "#7a3c3c"}`
                  }}>
                    <div style={styles.matchLeft}>
                      <span style={{
                        ...styles.winBadge,
                        background: m.win ? "#1a3a22" : "#3a1a1a",
                        color: m.win ? "#4caf70" : "#af4c4c"
                      }}>
                        {m.win ? "WIN" : "LOSS"}
                      </span>
                      <div>
                        <div style={styles.matchChamp}>{m.champion} <span style={{ color: "#44445a", fontWeight: 400, fontSize: "13px" }}>{m.role}</span></div>
                        <div style={styles.matchMeta}>{m.kills}/{m.deaths}/{m.assists} · {m.cs} CS · {m.gameDuration}m</div>
                        <div style={styles.matchTime}>{new Date(m.gameCreation).toLocaleDateString()} · {timeAgo(m.gameCreation)}</div>
                      </div>
                    </div>
                    <button
                      style={styles.analyseBtn}
                      onClick={() => handleAnalyse(m.matchId, m.participantId)}
                      disabled={analysing}
                    >
                      {analysing ? "..." : "Analyse"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {analysing && <p style={styles.loadingText}>Analysing your game...</p>}

            {coaching && (
              <div>
                <button style={styles.backBtn} onClick={() => setCoaching(null)}>← Back to matches</button>
                <div style={styles.coachingCard}>
                  <div style={styles.coachingHeader}>
                    <div style={styles.coachingChamp}>{coaching.playerStats.champion} <span style={{ color: "#c89b3c" }}>{coaching.playerStats.role}</span></div>
                    <div style={styles.coachingStats}>{coaching.playerStats.kills}/{coaching.playerStats.deaths}/{coaching.playerStats.assists} · {coaching.playerStats.cs} CS · {coaching.playerStats.gameDuration} mins · {coaching.playerStats.win ? "WIN" : "LOSS"}</div>
                    <p style={{ fontSize: "13px", color: "#c89b3c", marginTop: "8px" }}>
                      {coaching.remaining} free {coaching.remaining === 1 ? "analysis" : "analyses"} remaining today
                    </p>
                  </div>
                  <div style={styles.coachingText}>
                    {coaching.coaching.split('\n').map((line, i) => {
                      const boldParsed = line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                        j % 2 === 1 ? <strong key={j} style={{ color: "#f0f0fa" }}>{part}</strong> : part
                      )
                      return <p key={i} style={{ marginBottom: line === '' ? '8px' : '4px' }}>{boldParsed}</p>
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        <Pricing />
      </div>
    </>
  )
}