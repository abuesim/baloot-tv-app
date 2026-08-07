package com.akaklive.offline

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.akaklive.offline.data.GameMode
import com.akaklive.offline.data.GameWithRounds
import com.akaklive.offline.data.PlayerEntity
import com.akaklive.offline.data.TournamentFormat
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = (application as AkakApplication).repository

    val players: StateFlow<List<PlayerEntity>> = repository.players.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        emptyList(),
    )

    val latestGame: StateFlow<GameWithRounds?> = repository.latestGame.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        null,
    )

    val games = repository.games.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        emptyList(),
    )

    val gameDetails = repository.gameDetails.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        emptyList(),
    )

    val tournaments = repository.tournaments.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val tournamentTeams = repository.tournamentTeams.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun addPlayer(name: String, onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch { onResult(repository.addPlayer(name).isSuccess) }
    }

    fun deletePlayer(player: PlayerEntity) {
        viewModelScope.launch { repository.deletePlayer(player) }
    }

    fun setPlayerImage(player: PlayerEntity, imagePath: String?) {
        viewModelScope.launch { repository.setPlayerImage(player, imagePath) }
    }

    fun startGame(mode: GameMode, team1: List<String> = emptyList(), team2: List<String> = emptyList()) {
        viewModelScope.launch { repository.startGame(mode, team1, team2) }
    }

    fun recordRound(gameId: String, team1: Int, team2: Int) {
        viewModelScope.launch { repository.recordRound(gameId, team1, team2) }
    }

    fun undo(gameId: String) {
        viewModelScope.launch { repository.undo(gameId) }
    }

    fun editRound(gameId: String, roundId: String, team1: Int, team2: Int) {
        viewModelScope.launch { repository.editRound(gameId, roundId, team1, team2) }
    }

    fun createTournament(name: String, format: TournamentFormat, playerIds: List<String>) {
        viewModelScope.launch { repository.createTournament(name, format, playerIds) }
    }

    fun drawTournament(id: String) {
        viewModelScope.launch { repository.drawTournament(id) }
    }
}
