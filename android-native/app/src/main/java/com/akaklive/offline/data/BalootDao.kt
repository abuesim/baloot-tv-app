package com.akaklive.offline.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.akaklive.offline.domain.BalootRules
import kotlinx.coroutines.flow.Flow

@Dao
abstract class BalootDao {
    @Query("SELECT * FROM players ORDER BY name COLLATE NOCASE")
    abstract fun observePlayers(): Flow<List<PlayerEntity>>

    @Insert(onConflict = OnConflictStrategy.ABORT)
    abstract suspend fun insertPlayer(player: PlayerEntity)

    @Delete
    abstract suspend fun deletePlayer(player: PlayerEntity)

    @Update
    abstract suspend fun updatePlayer(player: PlayerEntity)

    @Transaction
    @Query("SELECT * FROM games ORDER BY startedAt DESC LIMIT 1")
    abstract fun observeLatestGame(): Flow<GameWithRounds?>

    @Query("SELECT * FROM games ORDER BY startedAt DESC")
    abstract fun observeGames(): Flow<List<GameEntity>>

    @Transaction
    @Query("SELECT * FROM games ORDER BY startedAt DESC")
    abstract fun observeGameDetails(): Flow<List<GameWithRounds>>

    @Query("SELECT * FROM tournaments ORDER BY createdAt DESC")
    abstract fun observeTournaments(): Flow<List<TournamentEntity>>

    @Query("SELECT * FROM tournament_teams ORDER BY tournamentId, seed")
    abstract fun observeTournamentTeams(): Flow<List<TournamentTeamEntity>>

    @Query("SELECT * FROM games WHERE id = :id LIMIT 1")
    abstract suspend fun getGame(id: String): GameEntity?

    @Query("SELECT * FROM rounds WHERE gameId = :gameId ORDER BY number ASC")
    abstract suspend fun getRounds(gameId: String): List<RoundEntity>

    @Insert
    abstract suspend fun insertGame(game: GameEntity)

    @Insert
    abstract suspend fun insertRound(round: RoundEntity)

    @Insert
    abstract suspend fun insertParticipants(participants: List<GameParticipantEntity>)

    @Insert
    abstract suspend fun insertTournament(tournament: TournamentEntity)

    @Insert
    abstract suspend fun insertTournamentTeams(teams: List<TournamentTeamEntity>)

    @Update
    abstract suspend fun updateTournament(tournament: TournamentEntity)

    @Update
    abstract suspend fun updateTournamentTeams(teams: List<TournamentTeamEntity>)

    @Query("SELECT * FROM tournaments WHERE id = :id LIMIT 1")
    abstract suspend fun getTournament(id: String): TournamentEntity?

    @Query("SELECT * FROM tournament_teams WHERE tournamentId = :tournamentId ORDER BY seed")
    abstract suspend fun getTournamentTeams(tournamentId: String): List<TournamentTeamEntity>

    @Update
    abstract suspend fun updateGame(game: GameEntity)

    @Delete
    abstract suspend fun deleteRound(round: RoundEntity)

    @Query(
        "UPDATE games SET status = 'ABANDONED', endedAt = :endedAt, updatedAt = :endedAt " +
            "WHERE status = 'IN_PROGRESS'",
    )
    abstract suspend fun abandonActiveGames(endedAt: Long)

    @Transaction
    open suspend fun recordRound(gameId: String, team1: Int, team2: Int) {
        require(team1 >= 0 && team2 >= 0 && team1 + team2 > 0)
        val game = getGame(gameId) ?: return
        if (game.status != GameStatus.IN_PROGRESS) return

        val rounds = getRounds(gameId)
        val newTeam1 = game.team1Score + team1
        val newTeam2 = game.team2Score + team2
        val winner = BalootRules.winner(newTeam1, newTeam2, game.targetScore)
        val now = System.currentTimeMillis()

        val previousRound = rounds.filter { it.number > 0 }.maxByOrNull { it.number }
        if (previousRound != null && BalootRules.shouldMergeWithPreviousRound(team1, team2)) {
            updateRound(
                previousRound.copy(
                    team1Score = previousRound.team1Score + team1,
                    team2Score = previousRound.team2Score + team2,
                    isEdited = true,
                ),
            )
        } else {
            insertRound(
                RoundEntity(
                    id = java.util.UUID.randomUUID().toString(),
                    gameId = gameId,
                    number = (rounds.maxOfOrNull { it.number } ?: 0) + 1,
                    team1Score = team1,
                    team2Score = team2,
                    createdAt = now,
                ),
            )
        }
        updateGame(
            game.copy(
                team1Score = newTeam1,
                team2Score = newTeam2,
                winner = winner,
                status = if (winner == null) GameStatus.IN_PROGRESS else GameStatus.COMPLETED,
                endedAt = if (winner == null) null else now,
                updatedAt = now,
            ),
        )
    }

    @Update
    abstract suspend fun updateRound(round: RoundEntity)

    @Transaction
    open suspend fun editRound(gameId: String, roundId: String, team1: Int, team2: Int) {
        require(team1 in 0..300 && team2 in 0..300)
        val game = getGame(gameId) ?: return
        if (game.status == GameStatus.ABANDONED) return
        val round = getRounds(gameId).find { it.id == roundId } ?: return
        if (round.number == 0) return
        val newTeam1 = game.team1Score - round.team1Score + team1
        val newTeam2 = game.team2Score - round.team2Score + team2
        val winner = BalootRules.winner(newTeam1, newTeam2, game.targetScore)
        val now = System.currentTimeMillis()
        updateRound(round.copy(team1Score = team1, team2Score = team2, isEdited = true))
        updateGame(
            game.copy(
                team1Score = newTeam1,
                team2Score = newTeam2,
                winner = winner,
                status = if (winner == null) GameStatus.IN_PROGRESS else GameStatus.COMPLETED,
                endedAt = if (winner == null) null else now,
                updatedAt = now,
            ),
        )
    }

    @Transaction
    open suspend fun undoLastRound(gameId: String) {
        val game = getGame(gameId) ?: return
        val last = getRounds(gameId).maxByOrNull { it.number } ?: return
        deleteRound(last)
        val newTeam1 = (game.team1Score - last.team1Score).coerceAtLeast(0)
        val newTeam2 = (game.team2Score - last.team2Score).coerceAtLeast(0)
        updateGame(
            game.copy(
                team1Score = newTeam1,
                team2Score = newTeam2,
                winner = null,
                status = GameStatus.IN_PROGRESS,
                endedAt = null,
                updatedAt = System.currentTimeMillis(),
            ),
        )
    }
}
