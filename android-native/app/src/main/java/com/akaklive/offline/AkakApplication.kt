package com.akaklive.offline

import android.app.Application
import com.akaklive.offline.data.BalootDatabase
import com.akaklive.offline.data.BalootRepository

class AkakApplication : Application() {
    val repository by lazy { BalootRepository(BalootDatabase.get(this).balootDao()) }
}
