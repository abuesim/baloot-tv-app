package com.akaklive.offline.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BalootRulesTest {
    @Test
    fun smallOneSidedScoresMerge() {
        assertEquals(true, BalootRules.shouldMergeWithPreviousRound(0, 1))
        assertEquals(true, BalootRules.shouldMergeWithPreviousRound(15, 0))
        assertEquals(false, BalootRules.shouldMergeWithPreviousRound(0, 0))
        assertEquals(false, BalootRules.shouldMergeWithPreviousRound(0, 16))
        assertEquals(false, BalootRules.shouldMergeWithPreviousRound(8, 9))
    }

    @Test
    fun noWinnerBeforeTarget() {
        assertNull(BalootRules.winner(151, 100))
    }

    @Test
    fun higherTeamWinsAfterTarget() {
        assertEquals(1, BalootRules.winner(152, 90))
        assertEquals(2, BalootRules.winner(120, 160))
    }

    @Test
    fun tiedScoresDoNotEndGame() {
        assertNull(BalootRules.winner(160, 160))
    }
}
