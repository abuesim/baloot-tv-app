package com.akaklive.offline.domain

object BalootRules {
    fun shouldMergeWithPreviousRound(team1: Int, team2: Int): Boolean =
        (team1 == 0 && team2 in 1..15) || (team2 == 0 && team1 in 1..15)

    fun winner(team1: Int, team2: Int, target: Int = 152): Int? {
        if (team1 < target && team2 < target) return null
        if (team1 == team2) return null
        return if (team1 > team2) 1 else 2
    }
}
