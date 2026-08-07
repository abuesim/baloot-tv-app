package com.akaklive.offline.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [PlayerEntity::class, GameEntity::class, RoundEntity::class, GameParticipantEntity::class, TournamentEntity::class, TournamentTeamEntity::class],
    version = 4,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class BalootDatabase : RoomDatabase() {
    abstract fun balootDao(): BalootDao

    companion object {
        @Volatile private var instance: BalootDatabase? = null

        fun get(context: Context): BalootDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    BalootDatabase::class.java,
                    "akak-live-offline.db",
                ).addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4).build().also { instance = it }
            }

        fun closeInstance() {
            synchronized(this) {
                instance?.close()
                instance = null
            }
        }

        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """CREATE TABLE IF NOT EXISTS `game_participants` (
                        `id` TEXT NOT NULL,
                        `gameId` TEXT NOT NULL,
                        `playerId` TEXT NOT NULL,
                        `team` INTEGER NOT NULL,
                        PRIMARY KEY(`id`),
                        FOREIGN KEY(`gameId`) REFERENCES `games`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
                        FOREIGN KEY(`playerId`) REFERENCES `players`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT
                    )""".trimIndent(),
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_game_participants_gameId` ON `game_participants` (`gameId`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_game_participants_playerId` ON `game_participants` (`playerId`)")
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_game_participants_gameId_playerId` ON `game_participants` (`gameId`, `playerId`)")
            }
        }

        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS `tournaments` (`id` TEXT NOT NULL, `name` TEXT NOT NULL, `format` TEXT NOT NULL, `status` TEXT NOT NULL, `createdAt` INTEGER NOT NULL, PRIMARY KEY(`id`))")
                db.execSQL("""CREATE TABLE IF NOT EXISTS `tournament_teams` (
                    `id` TEXT NOT NULL, `tournamentId` TEXT NOT NULL, `name` TEXT NOT NULL,
                    `player1Id` TEXT NOT NULL, `player2Id` TEXT NOT NULL, `seed` INTEGER NOT NULL,
                    `points` INTEGER NOT NULL, `wins` INTEGER NOT NULL, `losses` INTEGER NOT NULL,
                    PRIMARY KEY(`id`), FOREIGN KEY(`tournamentId`) REFERENCES `tournaments`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
                )""".trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_tournament_teams_tournamentId` ON `tournament_teams` (`tournamentId`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_tournament_teams_tournamentId_seed` ON `tournament_teams` (`tournamentId`, `seed`)")
            }
        }

        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE `rounds` ADD COLUMN `isEdited` INTEGER NOT NULL DEFAULT 0")
            }
        }
    }
}
