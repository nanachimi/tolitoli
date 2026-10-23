package expo.modules.audioencoder

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/**
 * Foreground service of type `dataSync` while a transcription runs (step 3, owner's answer A).
 * Without it the CPU sleeps once the screen is off and Whisper stops. It holds a partial wake
 * lock, shows a translated notification, and stops with the task: a swiped-away app resumes
 * its transcription at the next launch, from the saved cursor.
 */
class TranscriptionService : Service() {
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val notification = buildNotification(this, intent)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    if (wakeLock == null) {
      val power = getSystemService(Context.POWER_SERVICE) as PowerManager
      wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "tolitoli:transcription").apply {
        setReferenceCounted(false)
        acquire(WAKE_LOCK_MAX_MS)
      }
    }
    return START_NOT_STICKY
  }

  /** Android 15: `dataSync` gets 6 h per 24 h; the queue then waits for the next launch. */
  override fun onTimeout(startId: Int, fgsType: Int) {
    onTimeoutListener?.invoke()
    stopSelf()
  }

  override fun onDestroy() {
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    super.onDestroy()
  }

  companion object {
    private const val CHANNEL_ID = "transcription"
    /** Distinct from the recording notification of react-native-audio-api. */
    private const val NOTIFICATION_ID = 0x7a5c
    /** Same 6 h as Android 15's `dataSync` budget. */
    private const val WAKE_LOCK_MAX_MS = 6L * 60 * 60 * 1000
    private const val EXTRA_TITLE = "title"
    private const val EXTRA_BODY = "body"
    private const val EXTRA_CHANNEL = "channel"
    private const val EXTRA_COLOR = "color"
    /** Drawable added by plugins/withNotificationIcons.js (D-023). */
    private const val SMALL_ICON = "ic_stat_tolitoli"

    @Volatile
    var onTimeoutListener: (() -> Unit)? = null

    fun start(context: Context, title: String, body: String, channelName: String, color: Int?) {
      val intent = Intent(context, TranscriptionService::class.java)
        .putExtra(EXTRA_TITLE, title)
        .putExtra(EXTRA_BODY, body)
        .putExtra(EXTRA_CHANNEL, channelName)
      color?.let { intent.putExtra(EXTRA_COLOR, it) }
      ContextCompat.startForegroundService(context, intent)
    }

    /** New text on the running notification (progress); no effect once stopped. */
    fun update(context: Context, title: String, body: String, channelName: String, color: Int?) {
      val intent = Intent()
        .putExtra(EXTRA_TITLE, title)
        .putExtra(EXTRA_BODY, body)
        .putExtra(EXTRA_CHANNEL, channelName)
      color?.let { intent.putExtra(EXTRA_COLOR, it) }
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (manager.activeNotifications.any { it.id == NOTIFICATION_ID }) {
        manager.notify(NOTIFICATION_ID, buildNotification(context, intent))
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, TranscriptionService::class.java))
    }

    private fun buildNotification(context: Context, intent: Intent?): Notification {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val name = intent?.getStringExtra(EXTRA_CHANNEL) ?: CHANNEL_ID
        manager.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_LOW),
        )
      }
      val icon = context.resources.getIdentifier(SMALL_ICON, "drawable", context.packageName)
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      val content = launch?.let {
        PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      }
      return NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(if (icon != 0) icon else android.R.drawable.stat_sys_download)
        .setContentTitle(intent?.getStringExtra(EXTRA_TITLE))
        .setContentText(intent?.getStringExtra(EXTRA_BODY))
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setContentIntent(content)
        .apply { if (intent?.hasExtra(EXTRA_COLOR) == true) setColor(intent.getIntExtra(EXTRA_COLOR, 0)) }
        .build()
    }
  }
}
