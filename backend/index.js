const express = require('express')
const cors = require('cors')
require('dotenv').config()
const axios = require('axios')

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

app.listen(3001, () => {
  console.log('Backend running on port 3001')
})