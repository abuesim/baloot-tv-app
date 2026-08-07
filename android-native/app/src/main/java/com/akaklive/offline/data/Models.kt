package com.akaklive.offline.data

import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Relation

enum class GameMode { NORMAL, MASHDOOD }
enum class GameStatus { IN_PROGRESS, COMPLETED, ABANDONED }
enum class TournamentFormat { KNOCKOUT, POINTS }
enum class TournamentStatus { DRAFT, DRAWN, IN_PROGRESS, COMPLETED }

@Entity(tableName = "players", indices = [Index(value = ["name"], unique = true)])
data class PlayerEntity(
    @PrimaryKey val id: String,
    val name: String,
    val imagePath: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "games")
data class GameEntity(
    @PrimaryKey val id: String,
    val mode: GameMode,
    val status: GameStatus,
    val team1Score: Int,
    val team2Score: Int,
    val targetScore: Int = 152,
    val winner: Int? = null,
    val startedAt: Long = System.currentTimeMillis(),
    val endedAt: Long? = null,
    val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(
    tableName = "rounds",
    foreignKeys = [
        ForeignKey(
            entity = GameEntity::class,
            parentColumns = ["id"],
            childColumns = ["gameId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("gameId"), Index(value = ["gameId", "number"], unique = true)],
)
data class RoundEntity(
    @PrimaryKey val id: String,
    val gameId: String,
    val number: Int,
    val team1Score: Int,
    val team2Score: Int,
    val isEdited: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
)

@Entity(
    tableName = "game_participants",
    foreignKeys = [
        ForeignKey(
            entity = GameEntity::class,
            parentColumns = ["id"],
            childColumns = ["gameId"],
            onDelete = ForeignKey.CASCADE,
        ),
        ForeignKey(
            entity = PlayerEntity::class,
            parentColumns = ["id"],
            childColumns = ["playerId"],
            onDelete = ForeignKey.RESTRICT,
        ),
    ],
    indices = [Index("gameId"), Index("playerId"), Index(value = ["gameId", "playerId"], unique = true)],
)
data class GameParticipantEntity(
    @PrimaryKey val id: String,
    val gameId: String,
    val playerId: String,
    val team: Int,
)

@Entity(tableName = "tournaments")
data class TournamentEntity(
    @PrimaryKey val id: String,
    val name: String,
    val format: TournamentFormat,
    val status: TournamentStatus = TournamentStatus.DRAFT,
    val createdAt: Long = System.currentTimeMillis(),
)

@Entity(
    tableName = "tournament_teams",
    foreignKeys = [
        ForeignKey(
            entity = TournamentEntity::class,
            parentColumns = ["id"],
            childColumns = ["tournamentId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("tournamentId"), Index(value = ["tournamentId", "seed"])],
)
data class TournamentTeamEntity(
    @PrimaryKey val id: String,
    val tournamentId: String,
    val name: String,
    val player1Id: String,
    val player2Id: String,
    val seed: Int,
    val points: Int = 0,
    val wins: Int = 0,
    val losses: Int = 0,
)

data class GameWithRounds(
    @Embedded val game: GameEntity,
    @Relation(parentColumn = "id", entityColumn = "gameId")
    val rounds: List<RoundEntity>,
    @Relation(parentColumn = "id", entityColumn = "gameId")
    val participants: List<GameParticipantEntity>,
)
