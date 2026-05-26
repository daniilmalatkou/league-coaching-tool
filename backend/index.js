const express = require('express')
const cors = require('cors')
const { extractKeyEvents, extractPlayerStats, extractTeamContext, extractCSTimeline } = require('./analyseMatch')
require('dotenv').config()
const axios = require('axios')
const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const NodeCache = require('node-cache')
const cache = new NodeCache({ stdTTL: 86400 }) // cache for 24 hours
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const app = express()
app.use(cors())
app.use(express.json())

async function checkAndIncrementUsage(ip) {
  console.log('checking ip:', ip)
  console.log('supabase url:', process.env.SUPABASE_URL)
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('ip_usage')
    .select('*')
    .eq('ip_address', ip)
    .single()

  if (!data) {
    await supabase.from('ip_usage').insert({ ip_address: ip, analysis_count: 1, last_reset: today })
    return { allowed: true, remaining: 2 }
  }

  if (data.last_reset !== today) {
    await supabase.from('ip_usage').update({ analysis_count: 1, last_reset: today }).eq('ip_address', ip)
    return { allowed: true, remaining: 2 }
  }

  if (data.analysis_count >= 3) {
    return { allowed: false, remaining: 0 }
  }

  const { error: updateError } = await supabase.from('ip_usage').update({ analysis_count: data.analysis_count + 1 }).eq('ip_address', ip)
  console.log('updated count to:', data.analysis_count + 1, 'error:', updateError)
  return { allowed: true, remaining: 3 - data.analysis_count - 1 }
}



app.get('/summoner/:name/:tag', async (req, res) => {
  try {
    const { name, tag } = req.params
    const response = await axios.get(
      `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}`,
      { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
    )
    res.json(response.data)
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message })
  }
})
//takes PUUID and returns the IDs of the last 5 matches
app.get('/matches/:puuid', async (req, res) => {
  try {
    const { puuid } = req.params
    const response = await axios.get(
      `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=5`,
      { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
    )
    res.json(response.data)
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message })
  }
})
//takes a match ID and returns all match data
app.get('/match/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params
    const response = await axios.get(
      `https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}`,
      { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
    )
    res.json(response.data)
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message })
  }
})
//timeline of individual match
app.get('/timeline/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params
    const response = await axios.get(
      `https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`,
      { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
    )
    res.json(response.data)
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message })
  }
})
//fetch timeline and run through extraction function, returning player stats and key
app.get('/analyse/:matchId/:participantId', async (req, res) => {
  try {
    const { matchId, participantId } = req.params

    const [timelineResponse, matchResponse] = await Promise.all([
      axios.get(
        `https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`,
        { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
      ),
      axios.get(
        `https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}`,
        { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
      )
    ])

    const keyEvents = extractKeyEvents(timelineResponse.data, parseInt(participantId))
    const playerStats = extractPlayerStats(matchResponse.data, parseInt(participantId))

    res.json({ playerStats, keyEvents })
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message })
  }
})

app.get('/coaching/:matchId/:participantId', async (req, res) => {
  try {
    console.log('coaching route hit')
    const { matchId, participantId } = req.params

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const usage = await checkAndIncrementUsage(ip)
    if (!usage.allowed) {
      return res.status(429).json({ error: 'Daily limit reached. Upgrade to continue.' })
    }

    const cacheKey = `coaching_${matchId}_${participantId}`
    const cached = cache.get(cacheKey)
    if (cached) {
      console.log('returning cached result for', cacheKey)
      return res.json({ ...cached, remaining: usage.remaining })
    }

    const [timelineResponse, matchResponse] = await Promise.all([
      axios.get(
        `https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`,
        { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
      ),
      axios.get(
        `https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}`,
        { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
      )
    ])

    const keyEvents = extractKeyEvents(timelineResponse.data, parseInt(participantId), matchResponse.data)
    const playerStats = extractPlayerStats(matchResponse.data, parseInt(participantId))
    const teamContext = extractTeamContext(matchResponse.data) 
    const csTimeline = extractCSTimeline(timelineResponse.data, parseInt(participantId))   


    let rankData = { rank: 'Unranked', lp: 0 }
    try {
      const rankRes = await axios.get(
        `https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${playerStats.summonerId}`,
        { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
      )
      const soloQ = rankRes.data.find(e => e.queueType === 'RANKED_SOLO_5x5')
      if (soloQ) rankData = { rank: `${soloQ.tier} ${soloQ.rank}`, lp: soloQ.leaguePoints }
    } catch (rankError) {
      console.log('rank fetch error:', rankError.response?.data || rankError.message)
    }

    const prompt = `You are a calm, high level League of Legends coach. Analyse this player's game and give specific coaching feedback in 3 points maximum. Be concise — players won't read long paragraphs. Each point should be 3-5 sentences max.

IMPORTANT RULES:
- Plain conversational English only, no coordinates, no brackets, no raw data
- Separate observed facts from interpretation — use words like "suggests", "likely", "possibly"
- Never use absolute language like "completely" or "always" — keep certainty proportional to the evidence
- Never invent precise numbers or time estimates unless they come directly from the data provided
- Do not assume enemy intent — avoid saying things like "they were hunting you" unless the data clearly shows repeated targeted ganks
- Be direct but calm and constructive — never harsh or emotional
- Always acknowledge at least one thing the player did reasonably well before or during coaching a mistake
- Focus on map state changes and consequence chains — explain WHY the map became unsafe rather than just pointing out individual deaths
- Never say "play safer" without immediately following it with a specific visual example of what safer looks like in that situation
- Reference champion names not player numbers
- Factor in CS progression over time
- Tailor advice to whether they were winning or losing
- Do not default to the same coaching categories every game. Look at what is actually unusual or notable in this specific game's data and coach on that. If vision was fine, don't mention vision. If CS was good, acknowledge it and move on. Only coach on what genuinely stands out as a problem in this specific game.
- Do not mention control wards unless it is clearly the most important issue in the game. If you mention vision, it must be the single biggest factor in that specific game, not a generic tip
- If the data shows the enemy team had one or more players with significantly more kills than the entire enemy team average, acknowledge the game may have been very difficult to influence and adjust coaching accordingly
- If rank is Unranked or unknown, assume the player is a beginner to intermediate level and coach accordingly

Player stats:
${JSON.stringify(playerStats, null, 2)}

Player rank: 
${rankData.rank} ${rankData.lp ? rankData.lp + 'LP' : ''}

CS progression:
${JSON.stringify(csTimeline, null, 2)}

Team composition:
${JSON.stringify(teamContext, null, 2)}

Key events:
${JSON.stringify(keyEvents, null, 2)}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const result = {
      playerStats,
      keyEvents,
      coaching: message.content[0].text
    }
    cache.set(cacheKey, result)
    res.json({ ...result, remaining: usage.remaining })
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message })
  }
})

app.get('/matchlist/:name/:tag', async (req, res) => {
  try {
    const { name, tag } = req.params

    const accountRes = await axios.get(
      `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}`,
      { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
    )
    const { puuid } = accountRes.data

    const matchIdsRes = await axios.get(
      `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=10`,
      { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
    )
    const matchIds = matchIdsRes.data

    const matchDetails = await Promise.all(
      matchIds.map(id => axios.get(
        `https://europe.api.riotgames.com/lol/match/v5/matches/${id}`,
        { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
      ))
    )

    const summaries = matchDetails.map((res, i) => {
      const match = res.data
      const participant = match.info.participants.find(p => p.puuid === puuid)
      return {
        matchId: matchIds[i],
        participantId: participant.participantId,
        champion: participant.championName,
        role: participant.teamPosition,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
        win: participant.win,
        gameDuration: Math.floor(match.info.gameDuration / 60),
        gameCreation: match.info.gameCreation
      }
    })
    
    const filtered = summaries.filter(m => m.gameDuration > 3).slice(0, 5)
    res.json({ puuid, summaries: filtered })
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message })
  }
})

app.get('/rank/:summonerId', async (req, res) => {
  try {
    const { summonerId } = req.params
    const response = await axios.get(
      `https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`,
      { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
    )
    const soloQ = response.data.find(e => e.queueType === 'RANKED_SOLO_5x5')
    if (!soloQ) return res.json({ rank: 'Unranked' })
    res.json({ rank: `${soloQ.tier} ${soloQ.rank}`, lp: soloQ.leaguePoints })
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message })
  }
})

app.listen(3001, () => {
  console.log('Backend running on port 3001')
})