function extractKeyEvents(timeline, targetParticipantId, matchData) {
  const keyEvents = []
  const towers = []
  const objectives = []

  // Build a map of participant IDs to champion names
  const champMap = {}
  for (const p of matchData.info.participants) {
    champMap[p.participantId] = p.championName
  }

  for (const frame of timeline.info.frames) {
    for (const event of frame.events) {
      const minute = Math.floor(event.timestamp / 60000)

      if (event.type === 'BUILDING_KILL') {
        towers.push({
          minute,
          buildingType: event.buildingType,
          teamId: event.teamId,
          position: event.position
        })
      }

      if (event.type === 'ELITE_MONSTER_KILL') {
        objectives.push({
          minute,
          monster: event.monsterType,
          killerTeam: event.killerTeamId
        })
      }

      if (event.type === 'CHAMPION_KILL' && event.victimId === targetParticipantId) {
        // Find towers that fell within 3 minutes before this death
        const recentTowers = towers.filter(t => minute - t.minute <= 3)

        // Find objectives spawning soon (within 2 minutes)
        const upcomingObjectives = objectives.filter(o => o.minute >= minute && o.minute <= minute + 2)

        // Was jungler unseen? Check if any kill by jungler in last 2 min
        const killerChamp = champMap[event.killerId] || 'Unknown'
        const assistChamps = (event.assistingParticipantIds || []).map(id => champMap[id] || 'Unknown')

        keyEvents.push({
          type: 'DEATH',
          minute,
          position: event.position,
          killedBy: killerChamp,
          assistedBy: assistChamps,
          recentTowersLost: recentTowers.length,
          context: recentTowers.length > 0
            ? `A tower had fallen ${minute - recentTowers[recentTowers.length - 1].minute} minutes before this death — safety boundary likely shifted`
            : null
        })
      }
    }
  }

  return keyEvents
}

function extractPlayerStats(matchData, targetParticipantId) {
  const participant = matchData.info.participants.find(p => p.participantId === targetParticipantId)
  const gameDuration = Math.floor(matchData.info.gameDuration / 60)

  return {
    name: participant.riotIdGameName,
    champion: participant.championName,
    role: participant.teamPosition,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
    csPerMin: ((participant.totalMinionsKilled + participant.neutralMinionsKilled) / gameDuration).toFixed(1),
    goldEarned: participant.goldEarned,
    visionScore: participant.visionScore,
    wardsPlaced: participant.wardsPlaced,
    wardsKilled: participant.wardsKilled,
    controlWards: participant.detectorWardsPlaced,
    damageDealt: participant.totalDamageDealtToChampions,
    damageTaken: participant.totalDamageTaken,
    totalTimeSpentDead: participant.totalTimeSpentDead,
    turretsLost: participant.turretsLost,
    win: participant.win,
    gameDuration
  }
}

function extractTeamContext(matchData) {
  const blueTeam = []
  const redTeam = []

  for (const p of matchData.info.participants) {
    const player = {
      name: p.riotIdGameName,
      champion: p.championName,
      role: p.teamPosition,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      goldEarned: p.goldEarned
    }
    if (p.teamId === 100) blueTeam.push(player)
    else redTeam.push(player)
  }

  return { blueTeam, redTeam }
}

function extractCSTimeline(timeline, targetParticipantId) {
  const checkpoints = [5, 10, 15, 20]
  const csAtTime = {}

  for (const frame of timeline.info.frames) {
    const minute = Math.floor(frame.timestamp / 60000)
    if (checkpoints.includes(minute)) {
      const participantFrame = frame.participantFrames[targetParticipantId]
      if (participantFrame) {
        csAtTime[`min${minute}`] = participantFrame.minionsKilled + participantFrame.jungleMinionsKilled
      }
    }
  }

  return csAtTime
}

module.exports = { extractKeyEvents, extractPlayerStats, extractTeamContext, extractCSTimeline }