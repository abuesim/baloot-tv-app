package com.akaklive.offline.data

import androidx.room.TypeConverter

class Converters {
    @TypeConverter
    fun gameModeToString(value: GameMode): String = value.name

    @TypeConverter
    fun stringToGameMode(value: String): GameMode = GameMode.valueOf(value)

    @TypeConverter
    fun gameStatusToString(value: GameStatus): String = value.name

    @TypeConverter
    fun stringToGameStatus(value: String): GameStatus = GameStatus.valueOf(value)

    @TypeConverter
    fun tournamentFormatToString(value: TournamentFormat): String = value.name

    @TypeConverter
    fun stringToTournamentFormat(value: String): TournamentFormat = TournamentFormat.valueOf(value)

    @TypeConverter
    fun tournamentStatusToString(value: TournamentStatus): String = value.name

    @TypeConverter
    fun stringToTournamentStatus(value: String): TournamentStatus = TournamentStatus.valueOf(value)
}
