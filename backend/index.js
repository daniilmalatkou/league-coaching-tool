const express = require('express')
const cors = require('cors')
const { extractKeyEvents, extractPlayerStats } = require('./analyseMatch')
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

    const keyEvents = extractKeyEvents(timelineResponse.data, parseInt(participantId))
    const playerStats = extractPlayerStats(matchResponse.data, parseInt(participantId))

    const prompt = `You are an expert League of Legends coach. Analyse this player's game and give specific, honest coaching feedback focused on macro decisions and positioning. Do not just list stats. Point out specific moments where better decisions could have been made and explain why.

Player stats:
${JSON.stringify(playerStats, null, 2)}

Key events from the game:
${JSON.stringify(keyEvents, null, 2)}

Give 3-5 specific coaching points. For each death, explain what likely went wrong and what the correct decision would have been. Focus on macro — wave management, objective control, positioning, map awareness. Be direct and specific, not generic.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
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