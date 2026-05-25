function extractKeyEvents(timeline, targetParticipantId) {
  const keyEvents = []

  for (const frame of timeline.info.frames) {
    for (const event of frame.events) {
      if (event.type === 'CHAMPION_KILL') {
        if (event.victimId === targetParticipantId) {
          keyEvents.push({
            type: 'DEATH',
            minute: Math.floor(event.timestamp / 60000),
            position: event.position,
            killedBy: event.killerId
          })
        }
      }
      if (event.type === 'ELITE_MONSTER_KILL') {
        keyEvents.push({
          type: 'OBJECTIVE',
          minute: Math.floor(event.timestamp / 60000),
          monster: event.monsterType
        })
      }
      if (event.type === 'BUILDING_KILL') {
        keyEvents.push({
          type: 'BUILDING',
          minute: Math.floor(event.timestamp / 60000),
          building: event.buildingType
        })
      }
    }
  }

  return keyEvents
}

function extractPlayerStats(matchData, targetParticipantId) {
  const participant = matchData.info.participants[targetParticipantId - 1]
  return {
    champion: participant.championName,
    role: participant.teamPosition,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    cs: participant.totalMinionsKilled,
    visionScore: participant.visionScore,
    win: participant.win,
    gameDuration: Math.floor(matchData.info.gameDuration / 60)
  }
}

module.exports = { extractKeyEvents, extractPlayerStats }