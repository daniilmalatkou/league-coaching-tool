const express = require('express')
const cors = require('cors')
const { extractKeyEvents, extractPlayerStats, extractTeamContext, extractCSTimeline } = require('./analyseMatch')
require('dotenv').config()
const axios = require('axios')
const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const app = express()
app.use(cors())
app.use(express.json())

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

    const keyEvents = extractKeyEvents(timelineResponse.data, parseInt(participantId), matchResponse.data)
    const playerStats = extractPlayerStats(matchResponse.data, parseInt(participantId))
    const teamContext = extractTeamContext(matchResponse.data) 
    const csTimeline = extractCSTimeline(timelineResponse.data, parseInt(participantId))   

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

Player stats:
${JSON.stringify(playerStats, null, 2)}

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

    res.json({ 
      playerStats, 
      keyEvents, 
      coaching: message.content[0].text 
    })
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message })
  }
})

app.listen(3001, () => {
  console.log('Backend running on port 3001')
})