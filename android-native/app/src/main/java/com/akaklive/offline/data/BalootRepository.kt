package com.akaklive.offline.data

import java.util.UUID

class BalootRepository(private val dao: BalootDao) {
    val players = dao.observePlayers()
    val latestGame = dao.observeLatestGame()
    val games = dao.observeGames()
    val gameDetails = dao.observeGameDetails()
    val tournaments = dao.observeTournaments()
    val tournamentTeams = dao.observeTournamentTeams()

    suspend fun addPlayer(name: String): Result<Unit> = runCatching {
        val clean = name.trim()
        require(clean.isNotEmpty())
        dao.insertPlayer(PlayerEntity(id = UUID.randomUUID().toString(), name = clean))
    }

    suspend fun deletePlayer(player: PlayerEntity) = dao.deletePlayer(player)

    suspend fun setPlayerImage(player: PlayerEntity, imagePath: String?) =
        dao.updatePlayer(player.copy(imagePath = imagePath, updatedAt = System.currentTimeMillis()))

    suspend fun startGame(mode: GameMode, team1: List<String> = emptyList(), team2: List<String> = emptyList()) {
        val now = System.currentTimeMillis()
        dao.abandonActiveGames(now)
        val base = if (mode == GameMode.MASHDOOD) 52 else 0
        val gameId = UUID.randomUUID().toString()
        dao.insertGame(
            GameEntity(
                id = gameId,
                mode = mode,
                status = GameStatus.IN_PROGRESS,
                team1Score = base,
                team2Score = base,
                startedAt = now,
                updatedAt = now,
            ),
        )
        val participants = team1.map { playerId ->
            GameParticipantEntity(UUID.randomUUID().toString(), gameId, playerId, 1)
        } + team2.map { playerId ->
            GameParticipantEntity(UUID.randomUUID().toString(), gameId, playerId, 2)
        }
        if (participants.isNotEmpty()) dao.insertParticipants(participants)
    }

    suspend fun recordRound(gameId: String, team1: Int, team2: Int) =
        dao.recordRound(gameId, team1, team2)

    suspend fun undo(gameId: String) = dao.undoLastRound(gameId)

    suspend fun editRound(gameId: String, roundId: String, team1: Int, team2: Int) =
        dao.editRound(gameId, roundId, team1, team2)

    suspend fun createTournament(name: String, format: TournamentFormat, playerIds: List<String>) {
        val clean = name.trim()
        require(clean.isNotEmpty() && playerIds.size >= 4 && playerIds.size % 2 == 0)
        val tournamentId = UUID.randomUUID().toString()
        dao.insertTournament(TournamentEntity(tournamentId, clean, format))
        val teams = playerIds.chunked(2).mapIndexed { index, pair ->
            TournamentTeamEntity(
                id = UUID.randomUUID().toString(), tournamentId = tournamentId,
                name = "الفريق ${index + 1}", player1Id = pair[0], player2Id = pair[1], seed = index + 1,
            )
        }
        dao.insertTournamentTeams(teams)
    }

    suspend fun drawTournament(id: String) {
        val tournament = dao.getTournament(id) ?: return
        val shuffled = dao.getTournamentTeams(id).shuffled().mapIndexed { index, team -> team.copy(seed = index + 1) }
        dao.updateTournamentTeams(shuffled)
        dao.updateTournament(tournament.copy(status = TournamentStatus.DRAWN))
    }
}
