package app.runwithai

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale
import kotlin.math.floor
import kotlin.math.roundToInt

class RunTrackingNotificationModule(
  private val context: ReactApplicationContext
) : ReactContextBaseJavaModule(context) {

  override fun getName() = "RunTrackingNotificationModule"

  @ReactMethod
  fun start(
    activityType: String,
    distanceMeters: Double,
    durationSeconds: Double,
    paceMinPerKm: Double,
    isPaused: Boolean,
    promise: Promise
  ) {
    try {
      show(activityType, distanceMeters, durationSeconds, paceMinPerKm, isPaused)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("RUN_NOTIFICATION_START", error)
    }
  }

  @ReactMethod
  fun update(
    activityType: String,
    distanceMeters: Double,
    durationSeconds: Double,
    paceMinPerKm: Double,
    isPaused: Boolean,
    promise: Promise
  ) {
    try {
      show(activityType, distanceMeters, durationSeconds, paceMinPerKm, isPaused)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("RUN_NOTIFICATION_UPDATE", error)
    }
  }

  @ReactMethod
  fun end(promise: Promise) {
    try {
      notificationManager().cancel(NOTIFICATION_ID)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("RUN_NOTIFICATION_END", error)
    }
  }

  private fun show(
    activityType: String,
    distanceMeters: Double,
    durationSeconds: Double,
    paceMinPerKm: Double,
    isPaused: Boolean
  ) {
    ensureChannel()

    val label = when (activityType) {
      "walk" -> "Gang"
      "bike" -> "Cykling"
      else -> "Løb"
    }
    val title = if (isPaused) "$label (pause)" else "$label i gang"
    val distance = String.format(Locale.US, "%.2f km", distanceMeters.coerceAtLeast(0.0) / 1000.0)
    val pace = formatPace(paceMinPerKm)
    val duration = formatDuration(durationSeconds)
    val body = if (isPaused) "$distance  •  $duration  •  $pace /km" else "$distance  •  $pace /km"

    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val pendingIntent = launchIntent?.let {
      PendingIntent.getActivity(
        context,
        0,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(body)
      .setCategory(Notification.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setShowWhen(true)
      .setColor(0xffff4500.toInt())

    pendingIntent?.let { builder.setContentIntent(it) }

    if (isPaused) {
      builder.setUsesChronometer(false)
      builder.setWhen(System.currentTimeMillis())
    } else {
      // Androids egen chronometer fortsaetter uden JS, ogsaa paa laaseskaermen.
      builder.setWhen(System.currentTimeMillis() - durationSeconds.coerceAtLeast(0.0).toLong() * 1000L)
      builder.setUsesChronometer(true)
      builder.setChronometerCountDown(false)
    }

    notificationManager().notify(NOTIFICATION_ID, builder.build())
  }

  private fun ensureChannel() {
    val manager = notificationManager()
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Aktivt løb", NotificationManager.IMPORTANCE_LOW).apply {
      description = "Løbende status for en aktiv RunWithAI-tur"
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }

  private fun notificationManager(): NotificationManager =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun formatDuration(value: Double): String {
    val seconds = value.coerceAtLeast(0.0).toLong()
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    val rest = seconds % 60
    return if (hours > 0) "%d:%02d:%02d".format(hours, minutes, rest) else "%d:%02d".format(minutes, rest)
  }

  private fun formatPace(value: Double): String {
    if (!value.isFinite() || value <= 0.0) return "--:--"
    val totalSeconds = (value * 60.0).roundToInt()
    return "%d:%02d".format(floor(totalSeconds / 60.0).toInt(), totalSeconds % 60)
  }

  companion object {
    private const val CHANNEL_ID = "run-live-activity-v3"
    private const val NOTIFICATION_ID = 42042
  }
}
