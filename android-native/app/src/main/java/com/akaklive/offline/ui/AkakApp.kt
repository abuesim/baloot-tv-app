package com.akaklive.offline.ui

import android.content.Intent
import android.app.Activity
import android.media.MediaPlayer
import android.net.Uri
import android.graphics.BitmapFactory
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.Redo
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Casino
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.ManageAccounts
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material.icons.outlined.VolumeUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.akaklive.offline.MainViewModel
import com.akaklive.offline.R
import com.akaklive.offline.data.GameEntity
import com.akaklive.offline.data.BalootDatabase
import com.akaklive.offline.data.GameMode
import com.akaklive.offline.data.GameStatus
import com.akaklive.offline.data.GameWithRounds
import com.akaklive.offline.data.PlayerEntity
import com.akaklive.offline.data.RoundEntity
import com.akaklive.offline.data.TournamentEntity
import com.akaklive.offline.data.TournamentFormat
import com.akaklive.offline.data.TournamentStatus
import com.akaklive.offline.data.TournamentTeamEntity
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs

private enum class Screen {
    HOME, NEW_GAME, TOURNAMENTS, HISTORY, STATS, PROFILE, PLAYERS, CALCULATOR,
}

private data class NavItem(
    val screen: Screen,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
)

private val navItems = listOf(
    NavItem(Screen.HOME, "الرئيسية", Icons.Outlined.Home),
    NavItem(Screen.NEW_GAME, "صكة", Icons.Outlined.PlayCircle),
    NavItem(Screen.TOURNAMENTS, "بطولات", Icons.Outlined.EmojiEvents),
    NavItem(Screen.HISTORY, "السجل", Icons.Outlined.History),
    NavItem(Screen.STATS, "إحصائيات", Icons.Outlined.BarChart),
    NavItem(Screen.PROFILE, "ملفي", Icons.Outlined.Person),
)

@Composable
fun AkakApp(vm: MainViewModel) {
    val latestGame by vm.latestGame.collectAsState()
    val games by vm.games.collectAsState()
    val gameDetails by vm.gameDetails.collectAsState()
    val tournaments by vm.tournaments.collectAsState()
    val tournamentTeams by vm.tournamentTeams.collectAsState()
    val players by vm.players.collectAsState()
    var screen by remember { mutableStateOf(Screen.HOME) }
    var requestedMode by remember { mutableStateOf(GameMode.NORMAL) }

    CompositionLocalProvider(
        LocalLayoutDirection provides LayoutDirection.Rtl,
        LocalContentColor provides Color.White,
    ) {
        Box(Modifier.fillMaxSize().background(DeepBlack)) {
            GlowBackground()
            Scaffold(
                containerColor = Color.Transparent,
                contentColor = Color.White,
                contentWindowInsets = WindowInsets(0, 0, 0, 0),
                topBar = {
                    if (screen != Screen.CALCULATOR) {
                        AppHeader(onHome = { screen = Screen.HOME })
                    }
                },
                bottomBar = {
                    if (screen != Screen.CALCULATOR) {
                        AppBottomNav(screen) { screen = it }
                    }
                },
            ) { padding ->
                Box(Modifier.fillMaxSize().padding(padding)) {
                    when (screen) {
                        Screen.HOME -> HomeScreen(
                            latestGame = latestGame,
                            games = games,
                            playersCount = players.size,
                            tournamentsCount = tournaments.size,
                            onNavigate = { screen = it },
                        )
                        Screen.NEW_GAME -> NewGameScreen(
                            players = players,
                            onStart = { mode, team1, team2 ->
                                requestedMode = mode
                                vm.startGame(mode, team1, team2)
                                screen = Screen.CALCULATOR
                            },
                        )
                        Screen.TOURNAMENTS -> TournamentsScreen(tournaments, tournamentTeams, players, vm::createTournament, vm::drawTournament)
                        Screen.HISTORY -> HistoryScreen(games) { screen = Screen.CALCULATOR }
                        Screen.STATS -> StatsScreen(gameDetails, players)
                        Screen.PROFILE -> ProfileScreen(
                            playersCount = players.size,
                            onPlayers = { screen = Screen.PLAYERS },
                        )
                        Screen.PLAYERS -> PlayersScreen(players, gameDetails, vm::addPlayer, vm::deletePlayer, vm::setPlayerImage) {
                            screen = Screen.PROFILE
                        }
                        Screen.CALCULATOR -> CalculatorScreen(
                            game = latestGame,
                            players = players,
                            fallbackMode = requestedMode,
                            onRecord = vm::recordRound,
                            onUndo = vm::undo,
                            onEditRound = vm::editRound,
                            onExit = { screen = Screen.HOME },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun GlowBackground() {
    Canvas(Modifier.fillMaxSize()) {
        drawCircle(
            brush = Brush.radialGradient(listOf(Color(0x332A0D55), Color.Transparent)),
            radius = size.minDimension * .75f,
            center = androidx.compose.ui.geometry.Offset(0f, size.height * .18f),
        )
        drawCircle(
            brush = Brush.radialGradient(listOf(Color(0x24FF5E3A), Color.Transparent)),
            radius = size.minDimension * .7f,
            center = androidx.compose.ui.geometry.Offset(size.width, size.height * .78f),
        )
        val gap = 22.dp.toPx()
        var y = gap
        while (y < size.height) {
            var x = gap
            while (x < size.width) {
                drawCircle(Color.White.copy(alpha = .025f), 1.dp.toPx(), androidx.compose.ui.geometry.Offset(x, y))
                x += gap
            }
            y += gap
        }
    }
}

@Composable
private fun AppHeader(onHome: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().background(Color(0xE815151C)).statusBarsPadding().height(68.dp)
            .border(1.dp, Color.White.copy(alpha = .06f)).padding(horizontal = 18.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(Modifier.clickable(onClick = onHome), verticalAlignment = Alignment.CenterVertically) {
            Image(
                painterResource(R.drawable.akak_logo),
                contentDescription = "شعار أكك لايف",
                modifier = Modifier.size(42.dp).clip(CircleShape),
                contentScale = ContentScale.Crop,
            )
            Spacer(Modifier.width(10.dp))
            Text("أكك لايف", fontSize = 24.sp, fontWeight = FontWeight.Black)
        }
        OutlinedButton(
            onClick = {},
            border = null,
            colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White.copy(alpha = .1f)),
            shape = RoundedCornerShape(12.dp),
            contentPadding = PaddingValues(horizontal = 15.dp, vertical = 9.dp),
        ) {
            Icon(Icons.AutoMirrored.Outlined.Logout, null, Modifier.size(17.dp))
            Spacer(Modifier.width(6.dp))
            Text("خروج")
        }
    }
}

@Composable
private fun AppBottomNav(selected: Screen, onSelect: (Screen) -> Unit) {
    NavigationBar(
        containerColor = Color(0xFF15151C),
        tonalElevation = 0.dp,
        modifier = Modifier.border(1.dp, Color.White.copy(alpha = .09f)).navigationBarsPadding(),
    ) {
        navItems.forEach { item ->
            val active = selected == item.screen || (selected == Screen.PLAYERS && item.screen == Screen.PROFILE)
            NavigationBarItem(
                selected = active,
                onClick = { onSelect(item.screen) },
                icon = { Icon(item.icon, item.label, Modifier.size(23.dp)) },
                label = { Text(item.label, fontSize = 10.sp, maxLines = 1) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Gold,
                    selectedTextColor = Gold,
                    unselectedIconColor = Color.White.copy(alpha = .72f),
                    unselectedTextColor = Color.White.copy(alpha = .72f),
                    indicatorColor = Color.Transparent,
                ),
            )
        }
    }
}

@Composable
private fun HomeScreen(
    latestGame: GameWithRounds?,
    games: List<GameEntity>,
    playersCount: Int,
    tournamentsCount: Int,
    onNavigate: (Screen) -> Unit,
) {
    val monthGames = games.count { it.status == GameStatus.COMPLETED }
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 28.dp, 16.dp, 30.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text("أهلاً، استراحة 2020", fontSize = 30.sp, fontWeight = FontWeight.Black)
            Text("جاهز لصكة جديدة؟", color = Color.White.copy(alpha = .55f), fontSize = 17.sp)
        }
        if (latestGame?.game?.status == GameStatus.IN_PROGRESS) {
            item {
                ElevatedAppCard(
                    modifier = Modifier.fillMaxWidth().clickable { onNavigate(Screen.CALCULATOR) },
                    borderColor = Gold.copy(alpha = .45f),
                    background = Color(0xFF261E12),
                ) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text("صكة جارية", color = Gold, fontWeight = FontWeight.Bold)
                            Text("اضغط للمتابعة", color = Color.White.copy(alpha = .45f), fontSize = 12.sp)
                        }
                        Text("${latestGame.game.team1Score} — ${latestGame.game.team2Score}", fontSize = 24.sp, fontWeight = FontWeight.Black)
                    }
                }
            }
        }
        item {
            HomeBigCard(
                icon = "🎴",
                title = "صكة جديدة",
                gradient = true,
                onClick = { onNavigate(Screen.NEW_GAME) },
            )
        }
        item { HomeBigCard("👥", "اللاعبون ($playersCount)", onClick = { onNavigate(Screen.PLAYERS) }) }
        item { HomeBigCard("📊", "إحصائيات الشهر ($monthGames)", onClick = { onNavigate(Screen.STATS) }) }
        item { HomeBigCard("🏆", "البطولات ($tournamentsCount)", compact = true, onClick = { onNavigate(Screen.TOURNAMENTS) }) }
        item { HomeBigCard("🎲", "دق الولد", compact = true, onClick = { onNavigate(Screen.TOURNAMENTS) }) }
        item {
            Text("آخر الصكات", fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
            if (games.isEmpty()) EmptyCard("🎴", "لا توجد صكات حتى الآن")
            else games.take(3).forEach { GameRow(it) }
        }
    }
}

@Composable
private fun HomeBigCard(
    icon: String,
    title: String,
    gradient: Boolean = false,
    compact: Boolean = false,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(24.dp)
    val modifier = Modifier.fillMaxWidth().height(if (compact) 120.dp else 168.dp).clip(shape).clickable(onClick = onClick)
    val brush = if (gradient) Brush.linearGradient(listOf(Color(0xFFFF5E3A), Color(0xFFF31968)))
    else Brush.linearGradient(listOf(Color(0xFF17171E), Color(0xFF15151C)))
    Column(
        modifier.background(brush).border(1.dp, if (gradient) Color.Transparent else Color.White.copy(alpha = .11f), shape),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(icon, fontSize = if (compact) 38.sp else 50.sp)
        Spacer(Modifier.height(8.dp))
        Text(title, fontSize = if (compact) 20.sp else 23.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun NewGameScreen(players: List<PlayerEntity>, onStart: (GameMode, List<String>, List<String>) -> Unit) {
    var mode by remember { mutableStateOf(GameMode.NORMAL) }
    var activeTeam by remember { mutableIntStateOf(1) }
    var team1 by remember { mutableStateOf(listOf<String>()) }
    var team2 by remember { mutableStateOf(listOf<String>()) }
    var error by remember { mutableStateOf<String?>(null) }
    val byId = players.associateBy { it.id }
    fun choose(playerId: String) {
        error = null
        when {
            playerId in team1 -> team1 = team1 - playerId
            playerId in team2 -> team2 = team2 - playerId
            activeTeam == 1 && team1.size < 2 -> {
                team1 = team1 + playerId
                if (team1.size == 2) activeTeam = 2
            }
            activeTeam == 2 && team2.size < 2 -> {
                team2 = team2 + playerId
                if (team2.size == 2) activeTeam = 1
            }
            else -> error = "الفريق مكتمل — أزل لاعباً أو اختر الفريق الثاني"
        }
    }
    LazyColumn(
        Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 26.dp, 16.dp, 30.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        item {
            Text("صكة جديدة", fontSize = 31.sp, fontWeight = FontWeight.Black)
            Text("اختر نوع اللعب وابدأ — اللاعبون اختياريون", color = Color.White.copy(alpha = .55f), fontSize = 16.sp)
        }
        item {
            Text("نوع اللعب", color = Color.White.copy(alpha = .78f), modifier = Modifier.padding(bottom = 10.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                ModeCard("عادي", "البداية من ٠ والوصول إلى ١٥٢", mode == GameMode.NORMAL, Modifier.weight(1f)) { mode = GameMode.NORMAL }
                ModeCard("مشدود", "البداية من ٥٢ والوصول إلى ١٥٢", mode == GameMode.MASHDOOD, Modifier.weight(1f)) { mode = GameMode.MASHDOOD }
            }
        }
        item {
            ElevatedAppCard(Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("👥", fontSize = 20.sp)
                    Spacer(Modifier.width(8.dp))
                    Text("اللاعبون", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.width(8.dp))
                    Pill("اختياري")
                }
                Spacer(Modifier.height(14.dp))
                if (players.size < 4) {
                    Text("ما عندك ما يكفي من اللاعبين بعد. ابدأ الصكة الآن وأضفهم لاحقاً.", color = Color.White.copy(alpha = .55f), fontSize = 13.sp)
                } else {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        TeamSelectionCard("لنا", TeamOrange, team1.mapNotNull(byId::get), activeTeam == 1, Modifier.weight(1f)) { activeTeam = 1 }
                        TeamSelectionCard("لهم", TeamBlue, team2.mapNotNull(byId::get), activeTeam == 2, Modifier.weight(1f)) { activeTeam = 2 }
                    }
                    Spacer(Modifier.height(14.dp))
                    Text("تختار لـ ${if (activeTeam == 1) "لنا" else "لهم"} — اضغط اللاعب للإضافة أو الإزالة", color = if (activeTeam == 1) TeamOrange else TeamBlue, fontSize = 12.sp)
                    Spacer(Modifier.height(10.dp))
                    players.chunked(3).forEach { rowPlayers ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            rowPlayers.forEach { player ->
                                val team = when (player.id) { in team1 -> 1; in team2 -> 2; else -> 0 }
                                PlayerChoiceCard(player, team, Modifier.weight(1f)) { choose(player.id) }
                            }
                            repeat(3 - rowPlayers.size) { Spacer(Modifier.weight(1f)) }
                        }
                        Spacer(Modifier.height(8.dp))
                    }
                }
            }
        }
        if (error != null) item { Text(error!!, color = Color(0xFFFF9A9A), modifier = Modifier.fillMaxWidth().background(Danger.copy(alpha = .15f), RoundedCornerShape(12.dp)).padding(12.dp)) }
        item {
            val valid = (team1.isEmpty() && team2.isEmpty()) || (team1.size == 2 && team2.size == 2)
            GradientButton(if (team1.isEmpty() && team2.isEmpty()) "ابدأ بدون لاعبين" else "ابدأ الصكة") {
                if (valid) onStart(mode, team1, team2) else error = "اختر أربعة لاعبين كاملين أو اترك الفريقين فارغين"
            }
        }
    }
}

@Composable
private fun ModeCard(title: String, desc: String, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val shape = RoundedCornerShape(22.dp)
    Column(
        modifier.height(122.dp).clip(shape).clickable(onClick = onClick)
            .background(if (selected) Color(0xFF2B2116) else Navy)
            .border(2.dp, if (selected) Gold else Color.White.copy(alpha = .1f), shape).padding(16.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(title, fontSize = 22.sp, fontWeight = FontWeight.Black)
        Text(desc, color = Color.White.copy(alpha = .55f), fontSize = 12.sp, lineHeight = 18.sp)
    }
}

@Composable
private fun TeamSelectionCard(label: String, color: Color, members: List<PlayerEntity>, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Column(
        modifier.height(102.dp).clip(RoundedCornerShape(18.dp)).background(color.copy(alpha = if (selected) .14f else .06f))
            .border(2.dp, if (selected) color else Color.White.copy(alpha = .1f), RoundedCornerShape(18.dp)).clickable(onClick = onClick).padding(13.dp),
    ) {
        Text(label, color = color, fontSize = 18.sp, fontWeight = FontWeight.Black)
        Text("${members.size}/2", color = color, fontWeight = FontWeight.Bold)
        Text(if (members.isEmpty()) "اضغط لاختيار اللاعبين" else members.joinToString(" + ") { it.name }, color = Color.White.copy(alpha = if (members.isEmpty()) .35f else .75f), fontSize = 10.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun PlayerChoiceCard(player: PlayerEntity, team: Int, modifier: Modifier, onClick: () -> Unit) {
    val color = when (team) { 1 -> TeamOrange; 2 -> TeamBlue; else -> Color.White.copy(alpha = .08f) }
    Column(
        modifier.height(112.dp).clip(RoundedCornerShape(15.dp)).background(if (team == 0) Color.White.copy(alpha = .02f) else color.copy(alpha = .12f))
            .border(2.dp, color, RoundedCornerShape(15.dp)).clickable(onClick = onClick).padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(Modifier.size(48.dp).clip(CircleShape).background(Color(0xFF252531)), contentAlignment = Alignment.Center) {
            PlayerPhoto(player, 48)
        }
        Spacer(Modifier.height(5.dp))
        Text(player.name, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (team != 0) Text(if (team == 1) "لنا" else "لهم", color = color, fontSize = 9.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun CalculatorScreen(
    game: GameWithRounds?,
    players: List<PlayerEntity>,
    fallbackMode: GameMode,
    onRecord: (String, Int, Int) -> Unit,
    onUndo: (String) -> Unit,
    onEditRound: (String, String, Int, Int) -> Unit,
    onExit: () -> Unit,
) {
    if (game == null || game.game.status == GameStatus.ABANDONED) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("جاري تجهيز الحاسبة…", fontWeight = FontWeight.Bold)
                Text(if (fallbackMode == GameMode.MASHDOOD) "مشدود" else "عادي", color = Gold)
            }
        }
        return
    }
    var usInput by remember(game.game.id) { mutableStateOf("") }
    var themInput by remember(game.game.id) { mutableStateOf("") }
    var active by remember { mutableStateOf<Int?>(null) }
    var showSettings by remember { mutableStateOf(false) }
    var confirmExit by remember { mutableStateOf(false) }
    var editingRound by remember { mutableStateOf<RoundEntity?>(null) }
    val usLive = game.game.team1Score + (usInput.toIntOrNull() ?: 0)
    val themLive = game.game.team2Score + (themInput.toIntOrNull() ?: 0)
    val difference = abs(usLive - themLive)
    val diffColor = if (usLive > themLive) Gold else Color.White
    var elapsed by remember(game.game.id) { mutableStateOf(formatElapsed(game.game)) }
    LaunchedEffect(game.game.id, game.game.status) {
        while (game.game.status == GameStatus.IN_PROGRESS) {
            elapsed = formatElapsed(game.game)
            delay(1000)
        }
    }
    val canRecord = (usInput.toIntOrNull() ?: 0) + (themInput.toIntOrNull() ?: 0) > 0
    val context = LocalContext.current
    val appPrefs = remember { context.getSharedPreferences("app_settings", android.content.Context.MODE_PRIVATE) }
    var advanced by remember { mutableStateOf(appPrefs.getBoolean("advanced_calculator", true)) }
    DisposableEffect(Unit) {
        val activity = context as? Activity
        val controller = activity?.window?.let { WindowInsetsControllerCompat(it, it.decorView) }
        controller?.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller?.hide(WindowInsetsCompat.Type.statusBars())
        onDispose { controller?.show(WindowInsetsCompat.Type.statusBars()) }
    }
    val cuePrefs = remember { context.getSharedPreferences("voice_cues", android.content.Context.MODE_PRIVATE) }
    val firedCues = remember(game.game.id) { mutableSetOf<String>() }
    var previousScore by remember(game.game.id) { mutableStateOf(game.game.team1Score to game.game.team2Score) }

    LaunchedEffect(game.game.updatedAt) {
        if (!cuePrefs.getBoolean("enabled", true)) return@LaunchedEffect
        if (game.rounds.isEmpty()) return@LaunchedEffect
        val oldDifference = abs(previousScore.first - previousScore.second)
        val newDifference = abs(game.game.team1Score - game.game.team2Score)
        val diffCue = listOf(50 to "cue_diff50", 40 to "cue_diff40", 35 to "cue_diff35")
            .firstOrNull { (threshold, _) -> oldDifference < threshold && newDifference >= threshold }?.second
        val rounds = game.rounds.sortedByDescending { it.number }
        val zeroTwice = rounds.size >= 2 &&
            ((rounds[0].team1Score == 0 && rounds[1].team1Score == 0) ||
                (rounds[0].team2Score == 0 && rounds[1].team2Score == 0))
        val crossed100 = ((previousScore.first < 100 && game.game.team1Score >= 100 && game.game.team2Score < 100) ||
            (previousScore.second < 100 && game.game.team2Score >= 100 && game.game.team1Score < 100))
        listOfNotNull(diffCue, if (zeroTwice) "cue_zero_twice" else null, if (crossed100) "cue_cross99" else null).forEach { key ->
            if (firedCues.add(key)) playStoredCue(cuePrefs.getString(key, null), context)
        }
        previousScore = game.game.team1Score to game.game.team2Score
    }

    LaunchedEffect(game.game.id) {
        val remaining = (10 * 60 * 1000L - (System.currentTimeMillis() - game.game.startedAt)).coerceAtLeast(0L)
        delay(remaining)
        if (cuePrefs.getBoolean("enabled", true) && game.game.status == GameStatus.IN_PROGRESS && firedCues.add("cue_time10")) {
            playStoredCue(cuePrefs.getString("cue_time10", null), context)
        }
    }

    LaunchedEffect(game.game.winner) {
        if (game.game.winner != null && cuePrefs.getBoolean("enabled", true) && firedCues.add("win_song")) {
            val songs = (1..5).mapNotNull { cuePrefs.getString("win_song$it", null) }
            if (songs.isNotEmpty()) playStoredCue(songs.random(), context)
        }
    }
    fun submit() {
        if (!canRecord) return
        onRecord(game.game.id, usInput.toIntOrNull() ?: 0, themInput.toIntOrNull() ?: 0)
        usInput = ""
        themInput = ""
        active = null
    }

    Box(Modifier.fillMaxSize().background(Color.Black).imePadding()) {
        CalculatorGlow()
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 14.dp, bottom = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            item {
                Row(Modifier.fillMaxWidth().statusBarsPadding(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    IconButton(onClick = { confirmExit = true }) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "خروج", tint = Color.White.copy(alpha = .75f)) }
                    Text(if (advanced) (if (game.game.mode == GameMode.MASHDOOD) "بلوت — مشدود" else "حاسبة بلوت") else "حاسبة — كلاسيك", fontSize = 22.sp, fontWeight = FontWeight.Black)
                    Row {
                        RoundIconButton(true) { Icon(Icons.Outlined.VolumeUp, "الصوت", Modifier.size(19.dp), tint = Gold) }
                        Spacer(Modifier.width(7.dp))
                        RoundIconButton(false, onClick = { showSettings = true }) { Icon(Icons.Outlined.Settings, "الإعدادات", Modifier.size(19.dp)) }
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Start) {
                    Text(if (advanced) "متقدمة" else "كلاسيكية", color = Gold, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.background(Gold.copy(alpha = .14f), CircleShape).padding(horizontal = 9.dp, vertical = 4.dp))
                }
                Spacer(Modifier.height(30.dp))
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    IconButton(onClick = { onUndo(game.game.id) }, enabled = game.rounds.isNotEmpty()) {
                        Icon(Icons.AutoMirrored.Outlined.Redo, "تراجع", tint = Color.White.copy(alpha = if (game.rounds.isEmpty()) .2f else .8f))
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Timer, null, Modifier.size(23.dp))
                        Spacer(Modifier.width(7.dp))
                        Text(elapsed, fontSize = 28.sp, fontWeight = FontWeight.Medium)
                        Box(Modifier.padding(horizontal = 13.dp).width(1.dp).height(30.dp).background(Color.White.copy(alpha = .2f)))
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("الفرق", color = Color.White.copy(alpha = .52f), fontSize = 11.sp)
                            Text(difference.toString(), color = diffColor, fontSize = 23.sp, fontWeight = FontWeight.Black)
                        }
                    }
                    Spacer(Modifier.width(48.dp))
                }
                Spacer(Modifier.height(24.dp))
                if (advanced) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(26.dp), verticalAlignment = Alignment.Bottom) {
                    ScorePanel("لنا", usLive, Gold, game.participants.filter { it.team == 1 }.mapNotNull { p -> players.find { it.id == p.playerId } }, Modifier.weight(1f))
                    ScorePanel("لهم", themLive, Color.White, game.participants.filter { it.team == 2 }.mapNotNull { p -> players.find { it.id == p.playerId } }, Modifier.weight(1f))
                }
                Spacer(Modifier.height(34.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ScoreInput("لنا", usInput, active == 1, Modifier.weight(1f)) { usInput = it; active = 1 }
                    Box(
                        Modifier.weight(2.4f).height(68.dp).clip(RoundedCornerShape(19.dp)).background(Color.Black)
                            .border(1.dp, Color.White.copy(alpha = .14f), RoundedCornerShape(19.dp)).clickable(enabled = canRecord, onClick = ::submit),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("سجل", color = if (canRecord) Color(0xFFFF9C35) else Color(0xFF7B3D09), fontSize = 34.sp, fontWeight = FontWeight.Black)
                    }
                    ScoreInput("لهم", themInput, active == 2, Modifier.weight(1f)) { themInput = it; active = 2 }
                }
                AnimatedVisibility(active != null) {
                    Row(Modifier.fillMaxWidth().padding(top = 18.dp), horizontalArrangement = Arrangement.Center) {
                        listOf(16, 18, 26, 30).forEach { value ->
                            Box(
                                Modifier.padding(horizontal = 5.dp).size(49.dp).clip(CircleShape)
                                    .background(Color(0xCC29241F)).border(1.dp, Color(0xFF805322), CircleShape)
                                    .clickable { if (active == 1) usInput = value.toString() else themInput = value.toString() },
                                contentAlignment = Alignment.Center,
                            ) { Text(value.toString(), color = Color(0xFFFFD39A), fontWeight = FontWeight.Bold) }
                        }
                    }
                }
                } else {
                    ClassicScoreBoard(game, players, difference)
                    Spacer(Modifier.height(20.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                        ScoreInput("لنا", usInput, active == 1, Modifier.weight(1f)) { usInput = it; active = 1 }
                        ScoreInput("لهم", themInput, active == 2, Modifier.weight(1f)) { themInput = it; active = 2 }
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = ::submit,
                        enabled = canRecord,
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = DeepBlack),
                        shape = RoundedCornerShape(15.dp),
                    ) { Text("تسجيل الجولة", fontSize = 18.sp, fontWeight = FontWeight.Black) }
                }
                if (game.game.winner != null) {
                    Spacer(Modifier.height(18.dp))
                    Text("🏆 الفوز لفريق ${if (game.game.winner == 1) "لنا" else "لهم"}", color = Gold, fontSize = 20.sp, fontWeight = FontWeight.Black, modifier = Modifier.fillMaxWidth().background(Gold.copy(alpha = .15f), RoundedCornerShape(18.dp)).padding(16.dp), textAlign = TextAlign.Center)
                }
                if (game.rounds.isNotEmpty()) {
                    Spacer(Modifier.height(28.dp))
                    RoundsCard(game, onEdit = { editingRound = it })
                }
            }
        }
    }
    if (confirmExit) {
        AlertDialog(
            onDismissRequest = { confirmExit = false },
            title = { Text("الخروج من الصكة؟") },
            text = { Text("الصكة محفوظة وتقدر ترجع لها لاحقاً.") },
            confirmButton = { TextButton(onClick = onExit) { Text("خروج", color = Gold) } },
            dismissButton = { TextButton(onClick = { confirmExit = false }) { Text("إلغاء") } },
            containerColor = Navy,
        )
    }
    if (showSettings) {
        CalculatorSettings(
            mode = game.game.mode,
            advanced = advanced,
            onStyleChange = {
                advanced = it
                appPrefs.edit().putBoolean("advanced_calculator", it).apply()
            },
            onClose = { showSettings = false },
        )
    }
    if (editingRound != null) {
        EditRoundDialog(
            round = editingRound!!,
            onDismiss = { editingRound = null },
            onSave = { team1, team2 ->
                onEditRound(game.game.id, editingRound!!.id, team1, team2)
                editingRound = null
            },
        )
    }
}

@Composable
private fun CalculatorGlow() {
    Canvas(Modifier.fillMaxSize()) {
        drawRect(Brush.radialGradient(listOf(Color(0x5A3E3E52), Color.Transparent), center = androidx.compose.ui.geometry.Offset(-size.width * .12f, size.height * .38f), radius = size.width * .7f))
        drawRect(Brush.radialGradient(listOf(Color(0x4D3E3E52), Color.Transparent), center = androidx.compose.ui.geometry.Offset(size.width * 1.12f, size.height * .38f), radius = size.width * .7f))
    }
}

@Composable
private fun RoundIconButton(active: Boolean, onClick: () -> Unit = {}, content: @Composable () -> Unit) {
    Box(
        Modifier.size(42.dp).clip(CircleShape).background(if (active) Gold.copy(alpha = .12f) else Color.White.copy(alpha = .04f))
            .border(1.dp, if (active) Gold.copy(alpha = .55f) else Color.White.copy(alpha = .15f), CircleShape).clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { content() }
}

@Composable
private fun ScorePanel(label: String, score: Int, color: Color, members: List<PlayerEntity>, modifier: Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        if (members.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy((-8).dp)) { members.forEach { PlayerPhoto(it, 38) } }
            Spacer(Modifier.height(5.dp))
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            Icon(Icons.Outlined.Edit, null, Modifier.size(13.dp), tint = color.copy(alpha = .35f))
            Text(label, color = color.copy(alpha = .96f), fontSize = 21.sp, fontWeight = FontWeight.SemiBold)
        }
        if (members.isNotEmpty()) Text(members.joinToString(" + ") { it.name }, color = color.copy(alpha = .55f), fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(score.toString(), color = color, fontSize = 84.sp, lineHeight = 90.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun ScoreInput(label: String, value: String, selected: Boolean, modifier: Modifier, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = { onChange(it.filter(Char::isDigit).take(3)) },
        placeholder = { Text(label, Modifier.fillMaxWidth(), color = Color.White.copy(alpha = .25f), fontSize = 11.sp, textAlign = TextAlign.Center) },
        singleLine = true,
        textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        modifier = modifier.height(68.dp),
        shape = RoundedCornerShape(19.dp),
        colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Gold,
            unfocusedBorderColor = if (selected) Gold else Color.White.copy(alpha = .15f),
            focusedContainerColor = Color.Black,
            unfocusedContainerColor = Color.Black,
        ),
    )
}

@Composable
private fun RoundsCard(game: GameWithRounds, onEdit: (RoundEntity) -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color(0xFF0D0D0D)).border(1.dp, Color.White.copy(alpha = .06f), RoundedCornerShape(18.dp))) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("#", color = Color.White.copy(alpha = .45f)); Text("لنا", color = Color.White.copy(alpha = .55f)); Text("لهم", color = Color.White.copy(alpha = .55f)); Text("تعديل", color = Color.White.copy(alpha = .35f), fontSize = 10.sp)
        }
        game.rounds.sortedByDescending { it.number }.forEach { round ->
            HorizontalDivider(color = Color.White.copy(alpha = .05f))
            Row(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(round.number.toString(), color = Color.White.copy(alpha = .4f), modifier = Modifier.width(25.dp))
                Text(round.team1Score.toString(), color = if (round.isEdited) TeamBlue else Gold, fontWeight = FontWeight.Bold, modifier = Modifier.width(45.dp), textAlign = TextAlign.Center)
                Text(round.team2Score.toString(), color = if (round.isEdited) TeamBlue else Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.width(45.dp), textAlign = TextAlign.Center)
                if (round.number > 0) {
                    IconButton(onClick = { onEdit(round) }, modifier = Modifier.size(34.dp)) { Icon(Icons.Outlined.Edit, "تعديل الجولة", tint = TeamBlue, modifier = Modifier.size(17.dp)) }
                } else Spacer(Modifier.size(34.dp))
            }
        }
    }
}

@Composable
private fun EditRoundDialog(round: RoundEntity, onDismiss: () -> Unit, onSave: (Int, Int) -> Unit) {
    var team1 by remember(round.id) { mutableStateOf(round.team1Score.toString()) }
    var team2 by remember(round.id) { mutableStateOf(round.team2Score.toString()) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("تعديل الجولة ${round.number}", fontWeight = FontWeight.Black) },
        text = {
            Column {
                Text("بعد الحفظ يُعاد حساب المجموع والفائز تلقائيًا", color = Color.White.copy(alpha = .5f), fontSize = 12.sp)
                Spacer(Modifier.height(14.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ScoreInput("لنا", team1, true, Modifier.weight(1f)) { team1 = it }
                    ScoreInput("لهم", team2, false, Modifier.weight(1f)) { team2 = it }
                }
                Spacer(Modifier.height(10.dp))
                Text("ستظهر الأرقام المعدلة باللون الأزرق", color = TeamBlue, fontSize = 11.sp)
            }
        },
        confirmButton = { TextButton(onClick = { onSave(team1.toIntOrNull() ?: 0, team2.toIntOrNull() ?: 0) }) { Text("حفظ التعديل", color = TeamBlue) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("إلغاء") } },
        containerColor = Color(0xFF171717),
        shape = RoundedCornerShape(24.dp),
    )
}

@Composable
private fun CalculatorSettings(mode: GameMode, advanced: Boolean, onStyleChange: (Boolean) -> Unit, onClose: () -> Unit) {
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text("إعدادات الصكة", fontWeight = FontWeight.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                SettingRow("🔊", "النشرة الصوتية", "تشغيل نطق الجولة والمجموع", true)
                HorizontalDivider(color = Color.White.copy(alpha = .08f))
                SettingRow("✨", "الحاسبة المتقدمة", "أوقفها لاستخدام التصميم الكلاسيكي", advanced, onStyleChange)
                Text("نوع اللعب: ${if (mode == GameMode.NORMAL) "عادي" else "مشدود"}", color = Gold)
            }
        },
        confirmButton = { TextButton(onClick = onClose) { Text("تم", color = Gold) } },
        containerColor = Color(0xFF171717),
        shape = RoundedCornerShape(26.dp),
    )
}

@Composable
private fun ClassicScoreBoard(game: GameWithRounds, players: List<PlayerEntity>, difference: Int) {
    val ours = game.participants.filter { it.team == 1 }.mapNotNull { p -> players.find { it.id == p.playerId }?.name }
    val theirs = game.participants.filter { it.team == 2 }.mapNotNull { p -> players.find { it.id == p.playerId }?.name }
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(26.dp)).background(Navy)
            .border(1.dp, Color.White.copy(alpha = .1f), RoundedCornerShape(26.dp)).padding(horizontal = 12.dp, vertical = 24.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("لنا", color = Gold, fontWeight = FontWeight.Bold)
            if (ours.isNotEmpty()) Text(ours.joinToString(" + "), color = Gold.copy(alpha = .55f), fontSize = 9.sp, maxLines = 1)
            Text(game.game.team1Score.toString(), color = Gold, fontSize = 54.sp, fontWeight = FontWeight.Black)
        }
        Column(
            Modifier.clip(RoundedCornerShape(16.dp)).background(NavyLight).border(1.dp, Color.White.copy(alpha = .1f), RoundedCornerShape(16.dp)).padding(horizontal = 13.dp, vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("الفرق", color = Color.White.copy(alpha = .4f), fontSize = 9.sp)
            Text(if (difference == 0) "=" else difference.toString(), color = if (game.game.team1Score > game.game.team2Score) Gold else Color.White, fontSize = 25.sp, fontWeight = FontWeight.Black)
        }
        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("لهم", color = Color.White.copy(alpha = .8f), fontWeight = FontWeight.Bold)
            if (theirs.isNotEmpty()) Text(theirs.joinToString(" + "), color = Color.White.copy(alpha = .45f), fontSize = 9.sp, maxLines = 1)
            Text(game.game.team2Score.toString(), color = Color.White, fontSize = 54.sp, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun HistoryScreen(games: List<GameEntity>, onGame: (GameEntity) -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 26.dp, 16.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { PageTitle("السجل", "كل الصكات محفوظة على جهازك") }
        if (games.isEmpty()) item { EmptyCard("🎴", "لا توجد صكات في هذه الفترة") }
        else items(games, key = { it.id }) { game -> Box(Modifier.clickable { onGame(game) }) { GameRow(game) } }
    }
}

@Composable
private fun GameRow(game: GameEntity) {
    ElevatedAppCard(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("لنا", color = Gold, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Text("  vs  ", color = Color.White.copy(alpha = .22f), fontSize = 11.sp)
                    Text("لهم", color = Color.White.copy(alpha = .55f), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
                Text(SimpleDateFormat("d MMM • h:mm a", Locale("ar", "SA")).format(Date(game.startedAt)), color = Color.White.copy(alpha = .38f), fontSize = 11.sp)
                Pill(
                    when {
                        game.status == GameStatus.IN_PROGRESS -> "جارية"
                        game.status == GameStatus.ABANDONED -> "ملغاة"
                        game.winner == 1 -> "فزنا"
                        else -> "خسرنا"
                    },
                )
            }
            Text("${game.team1Score}  -  ${game.team2Score}", fontSize = 25.sp, fontWeight = FontWeight.Black, color = if (game.winner == 1) Gold else Color.White)
        }
    }
}

@Composable
private fun StatsScreen(games: List<GameWithRounds>, players: List<PlayerEntity>) {
    val complete = games.filter { it.game.status == GameStatus.COMPLETED }
    val wins = complete.count { it.game.winner == 1 }
    val losses = complete.size - wins
    val rate = if (complete.isEmpty()) 0 else wins * 100 / complete.size
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 26.dp, 16.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        item { PageTitle("الإحصائيات", "${complete.size} صكة • محفوظة محليًا") }
        item {
            ElevatedAppCard(Modifier.fillMaxWidth(), borderColor = Gold.copy(alpha = .55f), background = Color(0xFF493416)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround, verticalAlignment = Alignment.CenterVertically) {
                    Text("🏆", fontSize = 58.sp)
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("نسبة الفوز", color = Gold, fontSize = 19.sp)
                        Text("$rate%", fontSize = 52.sp, fontWeight = FontWeight.Black)
                        Text("$wins فوز من ${complete.size} صكة", color = Color.White.copy(alpha = .58f))
                    }
                }
            }
        }
        item {
            Text("ترتيب اللاعبين", fontSize = 27.sp, fontWeight = FontWeight.Black)
            val standings = players.map { player ->
                val played = complete.filter { game -> game.participants.any { it.playerId == player.id } }
                val playerWins = played.count { game -> game.participants.any { it.playerId == player.id && it.team == game.game.winner } }
                Triple(player, playerWins, played.size - playerWins)
            }.filter { it.second + it.third > 0 }.sortedByDescending { it.second }
            if (standings.isEmpty()) EmptyCard("📊", "اختر اللاعبين في الصكات لتظهر إحصائياتهم")
            else ElevatedAppCard(Modifier.fillMaxWidth()) {
                standings.forEachIndexed { index, (player, playerWins, playerLosses) ->
                    val total = playerWins + playerLosses
                    Row(Modifier.fillMaxWidth().padding(vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("#${index + 1}", color = Gold, fontWeight = FontWeight.Black, modifier = Modifier.width(38.dp))
                        Box(Modifier.size(38.dp).clip(CircleShape).background(NavyLight), contentAlignment = Alignment.Center) { Text(player.name.take(1), color = Gold, fontWeight = FontWeight.Black) }
                        Text(player.name, Modifier.weight(1f).padding(horizontal = 10.dp), fontWeight = FontWeight.Bold)
                        Text("$playerWins", color = Success, fontWeight = FontWeight.Black)
                        Text(" فوز  ", color = Color.White.copy(alpha = .35f), fontSize = 10.sp)
                        Text("${playerWins * 100 / total}%", color = Color.White.copy(alpha = .65f))
                    }
                    if (index != standings.lastIndex) HorizontalDivider(color = Color.White.copy(alpha = .06f))
                }
            }
        }
        item {
            Text("الإنجاز الفردي", fontSize = 27.sp, fontWeight = FontWeight.Black)
            ElevatedAppCard(Modifier.fillMaxWidth()) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                    StatValue("فوز", wins.toString(), Success)
                    StatValue("خسارة", losses.toString(), Danger)
                    StatValue("النسبة", "$rate%", Color.White.copy(alpha = .7f))
                }
            }
        }
    }
}

@Composable
private fun TournamentsScreen(
    tournaments: List<TournamentEntity>,
    teams: List<TournamentTeamEntity>,
    players: List<PlayerEntity>,
    onCreate: (String, TournamentFormat, List<String>) -> Unit,
    onDraw: (String) -> Unit,
) {
    var creating by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var format by remember { mutableStateOf(TournamentFormat.KNOCKOUT) }
    var selected by remember { mutableStateOf(listOf<String>()) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 26.dp, 16.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        item { PageTitle("البطولات", "نظّم بطولات البلوت على جهازك") }
        item { GradientButton(if (creating) "إغلاق نموذج البطولة" else "🏆 إنشاء بطولة جديدة") { creating = !creating } }
        if (creating) {
            item {
                ElevatedAppCard(Modifier.fillMaxWidth(), borderColor = Gold.copy(alpha = .35f)) {
                    Text("بطولة جديدة", fontSize = 21.sp, fontWeight = FontWeight.Black)
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(name, { name = it }, label = { Text("اسم البطولة") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), singleLine = true)
                    Spacer(Modifier.height(12.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        TournamentFormatButton("خروج المغلوب", format == TournamentFormat.KNOCKOUT, Modifier.weight(1f)) { format = TournamentFormat.KNOCKOUT }
                        TournamentFormatButton("تجميع النقاط", format == TournamentFormat.POINTS, Modifier.weight(1f)) { format = TournamentFormat.POINTS }
                    }
                    Spacer(Modifier.height(14.dp))
                    Text("اختر عددًا زوجيًا من اللاعبين (4 على الأقل)", color = Color.White.copy(alpha = .5f), fontSize = 12.sp)
                    Spacer(Modifier.height(8.dp))
                    players.chunked(2).forEach { pair ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            pair.forEach { player ->
                                val chosen = player.id in selected
                                OutlinedButton(
                                    onClick = { selected = if (chosen) selected - player.id else selected + player.id },
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.outlinedButtonColors(containerColor = if (chosen) Gold.copy(alpha = .15f) else Color.Transparent, contentColor = if (chosen) Gold else Color.White),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, if (chosen) Gold else Color.White.copy(alpha = .15f)),
                                    shape = RoundedCornerShape(12.dp),
                                ) { Text((if (chosen) "✓ " else "") + player.name, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                            }
                            if (pair.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = {
                            onCreate(name, format, selected)
                            name = ""; selected = emptyList(); creating = false
                        },
                        enabled = name.isNotBlank() && selected.size >= 4 && selected.size % 2 == 0,
                        modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = DeepBlack),
                    ) { Text("إنشاء البطولة والفرق", fontWeight = FontWeight.Black) }
                }
            }
        }
        if (tournaments.isEmpty()) item { EmptyCard("🏆", "لا توجد بطولات بعد") }
        items(tournaments, key = { it.id }) { tournament ->
            val tournamentTeams = teams.filter { it.tournamentId == tournament.id }.sortedBy { it.seed }
            ElevatedAppCard(Modifier.fillMaxWidth(), borderColor = if (tournament.status == TournamentStatus.DRAWN) Gold.copy(alpha = .4f) else Color.White.copy(alpha = .1f)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text(tournament.name, fontSize = 21.sp, fontWeight = FontWeight.Black)
                        Text(if (tournament.format == TournamentFormat.KNOCKOUT) "خروج المغلوب" else "تجميع النقاط", color = Gold, fontSize = 12.sp)
                    }
                    Pill(if (tournament.status == TournamentStatus.DRAWN) "تمت القرعة" else "إعداد")
                }
                Spacer(Modifier.height(12.dp))
                tournamentTeams.forEach { team ->
                    val p1 = players.find { it.id == team.player1Id }?.name ?: "لاعب"
                    val p2 = players.find { it.id == team.player2Id }?.name ?: "لاعب"
                    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(if (tournament.status == TournamentStatus.DRAWN) "#${team.seed}  ${team.name}" else team.name, fontWeight = FontWeight.Bold)
                        Text("$p1 + $p2", color = Color.White.copy(alpha = .55f), fontSize = 12.sp)
                    }
                }
                if (tournamentTeams.size >= 2) {
                    OutlinedButton(onClick = { onDraw(tournament.id) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                        Icon(Icons.Outlined.Casino, null, tint = Gold); Spacer(Modifier.width(7.dp)); Text(if (tournament.status == TournamentStatus.DRAWN) "إعادة القرعة" else "إجراء القرعة", color = Gold)
                    }
                }
            }
        }
        item {
            ElevatedAppCard(Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Casino, null, tint = Gold, modifier = Modifier.size(34.dp))
                    Spacer(Modifier.width(13.dp))
                    Column { Text("دق الولد", fontSize = 20.sp, fontWeight = FontWeight.Black); Text("قرعة فرق سريعة", color = Color.White.copy(alpha = .45f)) }
                }
            }
        }
    }
}

@Composable
private fun TournamentFormatButton(text: String, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.height(55.dp),
        colors = ButtonDefaults.outlinedButtonColors(containerColor = if (selected) Gold.copy(alpha = .14f) else Color.Transparent, contentColor = if (selected) Gold else Color.White.copy(alpha = .65f)),
        border = androidx.compose.foundation.BorderStroke(1.dp, if (selected) Gold else Color.White.copy(alpha = .12f)),
        shape = RoundedCornerShape(13.dp),
    ) { Text(text, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
}

@Composable
private fun ProfileScreen(playersCount: Int, onPlayers: () -> Unit) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("voice_cues", android.content.Context.MODE_PRIVATE) }
    var sounds by remember { mutableStateOf(prefs.getBoolean("enabled", true)) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 26.dp, 16.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { PageTitle("ملفي الشخصي", "استراحة 2020 • التطبيق المستقل") }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ProfileTab("👤", "ملفي", true, Modifier.weight(1f)); ProfileTab("🎙", "الصوت", false, Modifier.weight(1f)); ProfileTab("🎬", "الاستوديو", false, Modifier.weight(1f))
            }
        }
        item {
            ElevatedAppCard(Modifier.fillMaxWidth()) {
                Text("المعلومات الأساسية", fontSize = 20.sp, fontWeight = FontWeight.Black)
                Spacer(Modifier.height(14.dp))
                Text("اسم العرض", color = Color.White.copy(alpha = .55f), fontSize = 12.sp)
                Box(Modifier.fillMaxWidth().background(NavyLight, RoundedCornerShape(12.dp)).padding(14.dp)) { Text("استراحة 2020") }
                Spacer(Modifier.height(14.dp))
                OutlinedButton(onClick = onPlayers, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                    Icon(Icons.Outlined.ManageAccounts, null); Spacer(Modifier.width(8.dp)); Text("إدارة اللاعبين ($playersCount)")
                }
            }
        }
        item {
            ElevatedAppCard(Modifier.fillMaxWidth()) {
                Text("🔔 التوجيهات الصوتية", fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text("مؤثرات صوتية تشتغل تلقائياً عند شروط معيّنة أثناء الصكة", color = Color.White.copy(alpha = .48f), fontSize = 12.sp)
                Spacer(Modifier.height(12.dp))
                SettingRow("🔊", "تشغيل الأصوات", "النشرة والمؤثرات", sounds) { sounds = it; prefs.edit().putBoolean("enabled", it).apply() }
                VoiceFileRow("35+", "الفرق +35", "cue_diff35", prefs)
                VoiceFileRow("40+", "الفرق +40", "cue_diff40", prefs)
                VoiceFileRow("50+", "الفرق +50", "cue_diff50", prefs)
                VoiceFileRow("00", "صفر مرتين متتاليتين", "cue_zero_twice", prefs)
                VoiceFileRow("100", "تجاوز 100", "cue_cross99", prefs)
                VoiceFileRow("10د", "بعد 10 دقائق", "cue_time10", prefs)
            }
        }
        item {
            ElevatedAppCard(Modifier.fillMaxWidth()) {
                Text("🎉 أغاني الفوز MP3", fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text("تُشغّل واحدة عشوائياً عند إعلان الفوز — الملفات تبقى داخل جهازك", color = Color.White.copy(alpha = .48f), fontSize = 12.sp)
                Spacer(Modifier.height(12.dp))
                (1..5).forEach { number ->
                    VoiceFileRow("♪", "أغنية الفوز $number", "win_song$number", prefs, maxBytes = 10 * 1024 * 1024)
                }
            }
        }
        item { BackupSection() }
    }
}

@Composable
private fun PlayersScreen(
    players: List<PlayerEntity>, games: List<GameWithRounds>,
    add: (String, (Boolean) -> Unit) -> Unit,
    delete: (PlayerEntity) -> Unit,
    setImage: (PlayerEntity, String?) -> Unit,
    onBack: () -> Unit,
) {
    var name by remember { mutableStateOf("") }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 22.dp, 16.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "رجوع") }
            PageTitle("اللاعبون (${players.size})", "قائمة لاعبيك الخاصة")
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(name, { name = it }, placeholder = { Text("اسم لاعب جديد") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(15.dp), singleLine = true)
                Button(onClick = { if (name.isNotBlank()) add(name) { if (it) name = "" } }, modifier = Modifier.height(56.dp), colors = ButtonDefaults.buttonColors(containerColor = Pink), shape = RoundedCornerShape(15.dp)) { Text("إضافة") }
            }
        }
        if (players.isEmpty()) item { EmptyCard("👥", "أضف أول لاعب") }
        items(players, key = { it.id }) { p ->
            PlayerRow(p, games.count { game -> game.participants.any { it.playerId == p.id } }, delete, setImage)
        }
    }
}

@Composable
private fun PlayerRow(player: PlayerEntity, gamesCount: Int, delete: (PlayerEntity) -> Unit, setImage: (PlayerEntity, String?) -> Unit) {
    val context = LocalContext.current
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { source ->
        if (source != null) savePlayerImage(context, source, player.id).onSuccess { setImage(player, it) }
    }
    ElevatedAppCard(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                PlayerPhoto(player, 66)
                Spacer(Modifier.width(13.dp))
                Column {
                    Text(player.name, fontSize = 19.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("📊 $gamesCount صكة", color = Color.White.copy(alpha = .42f), fontSize = 12.sp)
                    TextButton(onClick = { picker.launch(arrayOf("image/*")) }, contentPadding = PaddingValues(0.dp)) { Text(if (player.imagePath == null) "إضافة صورة" else "تغيير الصورة", color = Gold, fontSize = 11.sp) }
                }
            }
            Column {
                if (player.imagePath != null) TextButton(onClick = { deleteStoredImage(player.imagePath); setImage(player, null) }) { Text("حذف الصورة", color = Color.White.copy(alpha = .45f), fontSize = 10.sp) }
                TextButton(onClick = { delete(player) }) { Text("حذف اللاعب", color = Danger.copy(alpha = .7f), fontSize = 11.sp) }
            }
        }
    }
}

@Composable
private fun PlayerAvatar(name: String) {
    Box(Modifier.size(66.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFF50331B), Color(0xFF1F2029)))).border(2.dp, Color.White.copy(alpha = .2f), CircleShape), contentAlignment = Alignment.Center) {
        Text(name.take(1), color = Gold, fontSize = 27.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun PlayerPhoto(player: PlayerEntity, size: Int) {
    val bitmap = remember(player.imagePath, player.updatedAt) { player.imagePath?.let { BitmapFactory.decodeFile(it)?.asImageBitmap() } }
    Box(
        Modifier.size(size.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFF50331B), Color(0xFF1F2029))))
            .border(2.dp, Color.White.copy(alpha = .2f), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (bitmap != null) Image(bitmap, player.name, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        else Text(player.name.take(1), color = Gold, fontSize = (size * .42f).sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun PageTitle(title: String, subtitle: String) {
    Column(Modifier.fillMaxWidth()) {
        Text(title, fontSize = 30.sp, fontWeight = FontWeight.Black)
        Text(subtitle, color = Color.White.copy(alpha = .52f), fontSize = 14.sp)
    }
}

@Composable
private fun ElevatedAppCard(
    modifier: Modifier = Modifier,
    borderColor: Color = Color.White.copy(alpha = .1f),
    background: Color = Navy,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(modifier.clip(RoundedCornerShape(22.dp)).background(background).border(1.dp, borderColor, RoundedCornerShape(22.dp)).padding(18.dp), content = content)
}

@Composable
private fun EmptyCard(icon: String, text: String) {
    Column(Modifier.fillMaxWidth().padding(top = 12.dp).clip(RoundedCornerShape(22.dp)).background(Navy).border(1.dp, Color.White.copy(alpha = .1f), RoundedCornerShape(22.dp)).padding(42.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(icon, fontSize = 42.sp); Spacer(Modifier.height(8.dp)); Text(text, color = Color.White.copy(alpha = .42f), textAlign = TextAlign.Center)
    }
}

@Composable
private fun GradientButton(text: String, onClick: () -> Unit) {
    Box(Modifier.fillMaxWidth().height(58.dp).clip(RoundedCornerShape(15.dp)).background(Brush.horizontalGradient(listOf(Orange, Pink))).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
        Text(text, fontSize = 18.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun Pill(text: String) {
    Text(text, fontSize = 10.sp, color = Color.White.copy(alpha = .6f), modifier = Modifier.background(Color.White.copy(alpha = .09f), CircleShape).padding(horizontal = 8.dp, vertical = 3.dp))
}

@Composable
private fun ProfileTab(icon: String, text: String, active: Boolean, modifier: Modifier) {
    Column(modifier.padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(icon); Text(text, color = if (active) Color.White else Color.White.copy(alpha = .42f), fontSize = 12.sp)
        Spacer(Modifier.height(7.dp)); Box(Modifier.fillMaxWidth().height(2.dp).background(if (active) Orange else Color.Transparent))
    }
}

@Composable
private fun SettingRow(icon: String, title: String, subtitle: String, checked: Boolean, onChecked: (Boolean) -> Unit = {}) {
    Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
        Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
            Text(icon, color = Gold, fontWeight = FontWeight.Black, fontSize = 15.sp)
            Spacer(Modifier.width(10.dp))
            Column { Text(title, fontWeight = FontWeight.Bold); Text(subtitle, color = Color.White.copy(alpha = .4f), fontSize = 11.sp) }
        }
        Switch(checked = checked, onCheckedChange = onChecked)
    }
}

@Composable
private fun VoiceFileRow(
    icon: String,
    title: String,
    key: String,
    prefs: android.content.SharedPreferences,
    maxBytes: Int = 5 * 1024 * 1024,
) {
    val context = LocalContext.current
    var uri by remember(key) { mutableStateOf(prefs.getString(key, null)) }
    var error by remember(key) { mutableStateOf<String?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { selected ->
        if (selected != null) {
            val result = saveAudioFile(context, selected, key, maxBytes)
            result.onSuccess { savedPath ->
                uri = savedPath
                error = null
                prefs.edit().putString(key, savedPath).apply()
            }.onFailure {
                error = it.message ?: "تعذر حفظ الملف"
            }
        }
    }
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(icon, color = Gold, fontWeight = FontWeight.Black, modifier = Modifier.width(38.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.Bold)
            Text(error ?: if (uri == null) "اختر ملف MP3" else "تم حفظ ملف MP3 على الجهاز", color = if (error != null) Danger else if (uri == null) Color.White.copy(alpha = .38f) else Success, fontSize = 11.sp)
        }
        if (uri != null) {
            TextButton(onClick = { playStoredCue(uri, context) }) { Text("تشغيل", color = Gold) }
            TextButton(onClick = {
                uri?.let { deleteStoredAudio(it) }
                uri = null
                error = null
                prefs.edit().remove(key).apply()
            }) { Text("حذف", color = Danger.copy(alpha = .8f)) }
        } else {
            OutlinedButton(onClick = { picker.launch(arrayOf("audio/mpeg", "audio/mp3", "audio/*")) }, shape = RoundedCornerShape(11.dp), contentPadding = PaddingValues(horizontal = 11.dp, vertical = 5.dp)) { Text("رفع MP3") }
        }
    }
}

@Composable
private fun BackupSection() {
    val context = LocalContext.current
    var message by remember { mutableStateOf<String?>(null) }
    val exporter = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/zip")) { target ->
        if (target != null) {
            val result = exportLocalBackup(context, target)
            message = if (result.isSuccess) "✅ تم حفظ النسخة الاحتياطية" else "تعذر إنشاء النسخة: ${result.exceptionOrNull()?.message.orEmpty()}"
        }
    }
    val importer = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { source ->
        if (source != null) {
            val result = importLocalBackup(context, source)
            if (result.isSuccess) {
                message = "✅ تمت الاستعادة — أعد فتح التطبيق"
                (context as? Activity)?.let { activity ->
                    activity.window.decorView.postDelayed({ android.os.Process.killProcess(android.os.Process.myPid()) }, 900)
                }
            } else message = "تعذر الاستعادة: ${result.exceptionOrNull()?.message.orEmpty()}"
        }
    }
    ElevatedAppCard(Modifier.fillMaxWidth()) {
        Text("💾 النسخة الاحتياطية", fontSize = 20.sp, fontWeight = FontWeight.Black)
        Text("تشمل اللاعبين والصكات والبطولات والجولات وملفات MP3", color = Color.White.copy(alpha = .48f), fontSize = 12.sp)
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
            Button(
                onClick = { exporter.launch("AkakLive-Backup-${System.currentTimeMillis()}.zip") },
                modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = DeepBlack), shape = RoundedCornerShape(12.dp),
            ) { Text("تصدير نسخة", fontWeight = FontWeight.Black) }
            OutlinedButton(
                onClick = { importer.launch(arrayOf("application/zip", "application/octet-stream")) },
                modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp),
            ) { Text("استيراد نسخة") }
        }
        if (message != null) Text(message!!, color = if (message!!.startsWith("✅")) Success else Danger, fontSize = 12.sp, modifier = Modifier.padding(top = 10.dp))
    }
}

@Composable
private fun StatValue(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) { Text(label, color = Color.White.copy(alpha = .48f), fontSize = 12.sp); Text(value, color = color, fontSize = 28.sp, fontWeight = FontWeight.Black) }
}

private fun formatElapsed(game: GameEntity): String {
    val end = game.endedAt ?: System.currentTimeMillis()
    val seconds = ((end - game.startedAt) / 1000).coerceAtLeast(0)
    return "%02d:%02d".format(Locale.US, seconds / 60, seconds % 60)
}

private fun playStoredCue(rawUri: String?, context: android.content.Context) {
    if (rawUri.isNullOrBlank()) return
    runCatching {
        val parsed = if (rawUri.startsWith("/")) Uri.fromFile(File(rawUri)) else Uri.parse(rawUri)
        MediaPlayer.create(context, parsed)?.apply {
            setOnCompletionListener { finished -> finished.release() }
            setOnErrorListener { failed, _, _ -> failed.release(); true }
            start()
        }
    }
}

private fun saveAudioFile(
    context: android.content.Context,
    source: Uri,
    key: String,
    maxBytes: Int,
): Result<String> = runCatching {
    val mime = context.contentResolver.getType(source).orEmpty()
    require(mime.startsWith("audio/") || mime.isBlank()) { "الملف المختار ليس صوتياً" }
    val directory = File(context.filesDir, "voice").apply { mkdirs() }
    val destination = File(directory, "$key.mp3")
    context.contentResolver.openInputStream(source).use { input ->
        requireNotNull(input) { "تعذر قراءة الملف" }
        destination.outputStream().use { output ->
            val buffer = ByteArray(16 * 1024)
            var total = 0
            while (true) {
                val count = input.read(buffer)
                if (count <= 0) break
                total += count
                require(total <= maxBytes) { "حجم الملف أكبر من ${maxBytes / 1024 / 1024} ميجا" }
                output.write(buffer, 0, count)
            }
        }
    }
    destination.absolutePath
}.onFailure {
    File(context.filesDir, "voice/$key.mp3").delete()
}

private fun deleteStoredAudio(rawUri: String) {
    if (rawUri.startsWith("/")) runCatching { File(rawUri).delete() }
}

private fun savePlayerImage(context: android.content.Context, source: Uri, playerId: String): Result<String> = runCatching {
    val directory = File(context.filesDir, "players").apply { mkdirs() }
    val destination = File(directory, "$playerId.jpg")
    context.contentResolver.openInputStream(source).use { input ->
        requireNotNull(input) { "تعذر قراءة الصورة" }
        destination.outputStream().use { output -> input.copyTo(output) }
    }
    require(destination.length() <= 8 * 1024 * 1024) { "الصورة أكبر من 8 ميجا" }
    requireNotNull(BitmapFactory.decodeFile(destination.path)) { "ملف الصورة غير صالح" }
    destination.absolutePath
}.onFailure { File(context.filesDir, "players/$playerId.jpg").delete() }

private fun deleteStoredImage(rawPath: String?) {
    if (!rawPath.isNullOrBlank()) runCatching { File(rawPath).delete() }
}

private fun exportLocalBackup(context: android.content.Context, target: Uri): Result<Unit> = runCatching {
    BalootDatabase.get(context).openHelper.writableDatabase.query("PRAGMA wal_checkpoint(FULL)").use { it.moveToFirst() }
    context.contentResolver.openOutputStream(target, "w").use { raw ->
        requireNotNull(raw) { "تعذر فتح الملف" }
        ZipOutputStream(raw.buffered()).use { zip ->
            val database = context.getDatabasePath("akak-live-offline.db")
            require(database.exists()) { "قاعدة البيانات غير موجودة" }
            zipFile(zip, database, "database.db")
            File(context.filesDir, "voice").listFiles()?.filter { it.isFile }?.forEach { file -> zipFile(zip, file, "voice/${file.name}") }
            File(context.filesDir, "players").listFiles()?.filter { it.isFile }?.forEach { file -> zipFile(zip, file, "players/${file.name}") }
            val prefsDir = File(context.applicationInfo.dataDir, "shared_prefs")
            listOf("voice_cues.xml", "app_settings.xml").forEach { name ->
                File(prefsDir, name).takeIf(File::exists)?.let { zipFile(zip, it, "prefs/$name") }
            }
        }
    }
}

private fun importLocalBackup(context: android.content.Context, source: Uri): Result<Unit> = runCatching {
    val temp = File(context.cacheDir, "backup-restore").apply { deleteRecursively(); mkdirs() }
    context.contentResolver.openInputStream(source).use { raw ->
        requireNotNull(raw) { "تعذر قراءة الملف" }
        ZipInputStream(raw.buffered()).use { zip ->
            while (true) {
                val entry = zip.nextEntry ?: break
                val destination = File(temp, entry.name).canonicalFile
                require(destination.path.startsWith(temp.canonicalPath)) { "ملف غير صالح" }
                if (!entry.isDirectory) {
                    destination.parentFile?.mkdirs()
                    FileOutputStream(destination).use { zip.copyTo(it) }
                }
                zip.closeEntry()
            }
        }
    }
    val restoredDb = File(temp, "database.db")
    require(restoredDb.exists() && restoredDb.length() > 100) { "النسخة لا تحتوي قاعدة بيانات صالحة" }
    BalootDatabase.get(context).openHelper.writableDatabase.query("PRAGMA wal_checkpoint(FULL)").use { it.moveToFirst() }
    BalootDatabase.closeInstance()
    val liveDb = context.getDatabasePath("akak-live-offline.db")
    File(liveDb.path + "-wal").delete(); File(liveDb.path + "-shm").delete()
    restoredDb.copyTo(liveDb, overwrite = true)
    val restoredVoice = File(temp, "voice")
    if (restoredVoice.exists()) {
        val liveVoice = File(context.filesDir, "voice").apply { deleteRecursively(); mkdirs() }
        restoredVoice.listFiles()?.forEach { it.copyTo(File(liveVoice, it.name), overwrite = true) }
    }
    val restoredPlayers = File(temp, "players")
    if (restoredPlayers.exists()) {
        val livePlayers = File(context.filesDir, "players").apply { deleteRecursively(); mkdirs() }
        restoredPlayers.listFiles()?.forEach { it.copyTo(File(livePlayers, it.name), overwrite = true) }
    }
    val restoredPrefs = File(temp, "prefs")
    if (restoredPrefs.exists()) {
        val livePrefs = File(context.applicationInfo.dataDir, "shared_prefs").apply { mkdirs() }
        restoredPrefs.listFiles()?.forEach { it.copyTo(File(livePrefs, it.name), overwrite = true) }
    }
    temp.deleteRecursively()
}

private fun zipFile(zip: ZipOutputStream, file: File, path: String) {
    zip.putNextEntry(ZipEntry(path))
    FileInputStream(file).use { it.copyTo(zip) }
    zip.closeEntry()
}
