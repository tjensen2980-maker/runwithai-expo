import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Activity Attributes
// Disse felter er stabile gennem hele aktivitetens levetid.
struct RunActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var distanceMeters: Double
    var durationSeconds: Int
    var paceMinPerKm: Double  // 0 hvis ikke beregnet endnu
    var isPaused: Bool
  }

  var activityType: String  // "run" | "walk" | "bike"
  var startedAt: Date
}

// MARK: - Helpers
private func formatDistance(_ meters: Double) -> String {
  let km = meters / 1000.0
  return String(format: "%.2f", km)
}

private func formatDuration(_ seconds: Int) -> String {
  let h = seconds / 3600
  let m = (seconds % 3600) / 60
  let s = seconds % 60
  if h > 0 {
    return String(format: "%d:%02d:%02d", h, m, s)
  }
  return String(format: "%d:%02d", m, s)
}

private func formatPace(_ paceMinPerKm: Double, isBike: Bool, distanceMeters: Double, durationSeconds: Int) -> String {
  if isBike {
    // For cykel viser vi km/t i stedet for tempo
    guard durationSeconds > 0, distanceMeters > 10 else { return "--" }
    let kmh = (distanceMeters / 1000.0) / (Double(durationSeconds) / 3600.0)
    return String(format: "%.1f", kmh)
  }
  guard paceMinPerKm > 0 else { return "--:--" }
  let mins = Int(paceMinPerKm)
  let secs = Int((paceMinPerKm - Double(mins)) * 60)
  return String(format: "%d:%02d", mins, secs)
}

private func activityIcon(_ type: String) -> String {
  switch type {
  case "bike": return "bicycle"
  case "walk": return "figure.walk"
  default: return "figure.run"
  }
}

private func activityTitle(_ type: String) -> String {
  switch type {
  case "bike": return "Cykling"
  case "walk": return "Gåtur"
  default: return "Løb"
  }
}

private func paceLabel(_ type: String) -> String {
  return type == "bike" ? "KM/T" : "MIN/KM"
}

// MARK: - Lock Screen / Banner View
struct RunLockScreenView: View {
  let context: ActivityViewContext<RunActivityAttributes>

  var body: some View {
    let isBike = context.attributes.activityType == "bike"
    HStack(spacing: 16) {
      // Venstre: ikon + aktivitetstype
      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 6) {
          Image(systemName: activityIcon(context.attributes.activityType))
            .font(.system(size: 16, weight: .bold))
            .foregroundColor(Color(.sRGB, red: 200/255, green: 1.0, blue: 0, opacity: 1))
          Text(activityTitle(context.attributes.activityType))
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(.white.opacity(0.7))
        }
        if context.state.isPaused {
          Text("PAUSE")
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(.orange)
        } else {
          Text("LIVE")
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(Color(.sRGB, red: 200/255, green: 1.0, blue: 0, opacity: 1))
        }
      }
      Spacer()
      // Midt: km (stort)
      VStack(spacing: 2) {
        Text(formatDistance(context.state.distanceMeters))
          .font(.system(size: 32, weight: .bold, design: .rounded))
          .foregroundColor(.white)
        Text("KM")
          .font(.system(size: 10, weight: .semibold))
          .foregroundColor(.white.opacity(0.5))
      }
      Spacer()
      // Højre: tid + tempo
      VStack(alignment: .trailing, spacing: 6) {
        VStack(alignment: .trailing, spacing: 1) {
          Text(formatDuration(context.state.durationSeconds))
            .font(.system(size: 16, weight: .semibold, design: .monospaced))
            .foregroundColor(.white)
          Text("TID")
            .font(.system(size: 9, weight: .semibold))
            .foregroundColor(.white.opacity(0.5))
        }
        VStack(alignment: .trailing, spacing: 1) {
          Text(formatPace(context.state.paceMinPerKm, isBike: isBike, distanceMeters: context.state.distanceMeters, durationSeconds: context.state.durationSeconds))
            .font(.system(size: 16, weight: .semibold, design: .monospaced))
            .foregroundColor(.white)
          Text(paceLabel(context.attributes.activityType))
            .font(.system(size: 9, weight: .semibold))
            .foregroundColor(.white.opacity(0.5))
        }
      }
    }
    .padding(.horizontal, 18)
    .padding(.vertical, 14)
    .activityBackgroundTint(Color.black)
    .activitySystemActionForegroundColor(Color.white)
  }
}

// MARK: - Widget
@main
struct RunWithAIWidgets: WidgetBundle {
  var body: some Widget {
    RunLiveActivity()
  }
}

struct RunLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RunActivityAttributes.self) { context in
      RunLockScreenView(context: context)
    } dynamicIsland: { context in
      let isBike = context.attributes.activityType == "bike"
      return DynamicIsland {
        // Expanded
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 2) {
            Image(systemName: activityIcon(context.attributes.activityType))
              .font(.system(size: 14, weight: .bold))
              .foregroundColor(Color(.sRGB, red: 200/255, green: 1.0, blue: 0, opacity: 1))
            Text(formatDistance(context.state.distanceMeters))
              .font(.system(size: 22, weight: .bold, design: .rounded))
              .foregroundColor(.white)
            Text("KM")
              .font(.system(size: 9, weight: .semibold))
              .foregroundColor(.white.opacity(0.6))
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 6) {
            VStack(alignment: .trailing, spacing: 0) {
              Text(formatDuration(context.state.durationSeconds))
                .font(.system(size: 16, weight: .semibold, design: .monospaced))
                .foregroundColor(.white)
              Text("TID")
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(.white.opacity(0.6))
            }
            VStack(alignment: .trailing, spacing: 0) {
              Text(formatPace(context.state.paceMinPerKm, isBike: isBike, distanceMeters: context.state.distanceMeters, durationSeconds: context.state.durationSeconds))
                .font(.system(size: 16, weight: .semibold, design: .monospaced))
                .foregroundColor(.white)
              Text(paceLabel(context.attributes.activityType))
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(.white.opacity(0.6))
            }
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          if context.state.isPaused {
            Text("PAUSE")
              .font(.system(size: 12, weight: .bold))
              .foregroundColor(.orange)
              .frame(maxWidth: .infinity)
          }
        }
      } compactLeading: {
        Image(systemName: activityIcon(context.attributes.activityType))
          .foregroundColor(Color(.sRGB, red: 200/255, green: 1.0, blue: 0, opacity: 1))
      } compactTrailing: {
        Text(formatDistance(context.state.distanceMeters) + " km")
          .font(.system(size: 12, weight: .semibold, design: .rounded))
          .foregroundColor(.white)
      } minimal: {
        Image(systemName: activityIcon(context.attributes.activityType))
          .foregroundColor(Color(.sRGB, red: 200/255, green: 1.0, blue: 0, opacity: 1))
      }
      .keylineTint(Color(.sRGB, red: 200/255, green: 1.0, blue: 0, opacity: 1))
    }
  }
}
