import SwiftUI
import WatchKit

struct RunningView: View {
        @StateObject private var workoutManager = WorkoutManager.shared
        @Environment(\.dismiss) var dismiss

        let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)

        var body: some View {
                    TabView {
                                    // MARK: - Screen 1: Time, Distance, Pace
                                    mainDataScreen

                                    // MARK: - Screen 2: Heart Rate
                                    heartRateScreen

                                    // MARK: - Screen 3: Details
                                    detailsScreen
                    }
                    .tabViewStyle(.page)
                    .onAppear {
                                    workoutManager.startWorkout()
                    }
                    .onDisappear {
                                    if workoutManager.isRunning {
                                                        workoutManager.endWorkout()
                                    }
                    }
        }

        // MARK: - Main Data Screen
        private var mainDataScreen: some View {
                    VStack(spacing: 8) {
                                    // Auto-pause indicator
                                    if workoutManager.autoPaused {
                                                        Text("AUTO-PAUSE")
                                                            .font(.caption2)
                                                            .foregroundColor(.yellow)
                                                            .padding(.horizontal, 8)
                                                            .padding(.vertical, 2)
                                                            .background(Color.yellow.opacity(0.2))
                                                            .cornerRadius(4)
                                    }

                                    // Duration
                                    Text(workoutManager.formatDuration(workoutManager.elapsedSeconds))
                                        .font(.system(size: 36, weight: .bold, design: .rounded))
                                        .foregroundColor(.white)

                                    // Distance and Pace
                                    HStack(spacing: 16) {
                                                        VStack(spacing: 2) {
                                                                                Text(workoutManager.formatDistance(workoutManager.distance))
                                                                                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                                                                                    .foregroundColor(primaryColor)
                                                                                Text("km")
                                                                                    .font(.caption2)
                                                                                    .foregroundColor(.gray)
                                                        }

                                                        VStack(spacing: 2) {
                                                                                Text(workoutManager.formatPace(workoutManager.currentPace))
                                                                                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                                                                                    .foregroundColor(.orange)
                                                                                Text("min/km")
                                                                                    .font(.caption2)
                                                                                    .foregroundColor(.gray)
                                                        }
                                    }

                                    Spacer()

                                    // Control buttons
                                    controlButtons
                    }
                    .padding(.horizontal, 8)
                    .padding(.top, 4)
        }

        // MARK: - Heart Rate Screen
        private var heartRateScreen: some View {
                    VStack(spacing: 8) {
                                    Image(systemName: "heart.fill")
                                        .font(.title3)
                                        .foregroundColor(heartRateColor)

                                    Text(workoutManager.formatHeartRate())
                                        .font(.system(size: 48, weight: .bold, design: .rounded))
                                        .foregroundColor(heartRateColor)

                                    Text("bpm")
                                        .font(.caption)
                                        .foregroundColor(.gray)

                                    // Heart rate zone
                                    HStack(spacing: 4) {
                                                        ForEach(1...5, id: \.self) { zone in
                                                                                                        RoundedRectangle(cornerRadius: 2)
                                                                                                            .fill(zone <= workoutManager.heartRateZone() ? zoneColor(zone) : Color.gray.opacity(0.3))
                                                                                                            .frame(height: 6)
                                                                                   }
                                    }
                                    .padding(.horizontal, 20)

                                    Text("Zone \(workoutManager.heartRateZone())")
                                        .font(.caption2)
                                        .foregroundColor(heartRateColor)

                                    Spacer()
                                    controlButtons
                    }
                    .padding(.horizontal, 8)
                    .padding(.top, 8)
        }

        // MARK: - Details Screen
        private var detailsScreen: some View {
                    VStack(spacing: 6) {
                                    // Average Pace
                                    HStack {
                                                        Image(systemName: "gauge.medium")
                                                            .font(.caption)
                                                            .foregroundColor(.cyan)
                                                        Text("Avg Pace")
                                                            .font(.caption2)
                                                            .foregroundColor(.gray)
                                                        Spacer()
                                                        Text(workoutManager.formatPace(workoutManager.averagePace))
                                                            .font(.system(.body, design: .rounded))
                                                            .foregroundColor(.cyan)
                                    }

                                    Divider().background(Color.gray.opacity(0.3))

                                    // Calories
                                    HStack {
                                                        Image(systemName: "flame.fill")
                                                            .font(.caption)
                                                            .foregroundColor(.orange)
                                                        Text("Kalorier")
                                                            .font(.caption2)
                                                            .foregroundColor(.gray)
                                                        Spacer()
                                                        Text(workoutManager.formatCalories())
                                                            .font(.system(.body, design: .rounded))
                                                            .foregroundColor(.orange)
                                    }

                                    Divider().background(Color.gray.opacity(0.3))

                                    // Current km split
                                    HStack {
                                                        Image(systemName: "flag.fill")
                                                            .font(.caption)
                                                            .foregroundColor(primaryColor)
                                                        Text("Km split")
                                                            .font(.caption2)
                                                            .foregroundColor(.gray)
                                                        Spacer()
                                                        Text("\(workoutManager.currentKmSplit())")
                                                            .font(.system(.body, design: .rounded))
                                                            .foregroundColor(primaryColor)
                                    }

                                    Divider().background(Color.gray.opacity(0.3))

                                    // Heart Rate
                                    HStack {
                                                        Image(systemName: "heart.fill")
                                                            .font(.caption)
                                                            .foregroundColor(.red)
                                                        Text("Puls")
                                                            .font(.caption2)
                                                            .foregroundColor(.gray)
                                                        Spacer()
                                                        Text(workoutManager.formatHeartRate())
                                                            .font(.system(.body, design: .rounded))
                                                            .foregroundColor(.red)
                                    }

                                    Spacer()
                                    controlButtons
                    }
                    .padding(.horizontal, 8)
                    .padding(.top, 8)
        }

        // MARK: - Control Buttons
        private var controlButtons: some View {
                    HStack(spacing: 20) {
                                    // Pause/Resume button
                                    Button(action: {
                                                        if workoutManager.isPaused {
                                                                                workoutManager.resumeWorkout()
                                                        } else {
                                                                                workoutManager.pauseWorkout()
                                                        }
                                    }) {
                                                        Image(systemName: workoutManager.isPaused ? "play.fill" : "pause.fill")
                                                            .font(.title3)
                                                            .frame(width: 44, height: 44)
                                                            .background(Color.orange)
                                                            .foregroundColor(.white)
                                                            .clipShape(Circle())
                                    }
                                    .buttonStyle(PlainButtonStyle())

                                    // Stop button
                                    Button(action: {
                                                        workoutManager.endWorkout()
                                                        dismiss()
                                    }) {
                                                        Image(systemName: "stop.fill")
                                                            .font(.title3)
                                                            .frame(width: 44, height: 44)
                                                            .background(Color.red)
                                                            .foregroundColor(.white)
                                                            .clipShape(Circle())
                                    }
                                    .buttonStyle(PlainButtonStyle())
                    }
                    .padding(.bottom, 4)
        }

        // MARK: - Helpers
        private var heartRateColor: Color {
                    switch workoutManager.heartRateZone() {
                                case 1: return .gray
                                case 2: return .blue
                                case 3: return .green
                                case 4: return .orange
                                case 5: return .red
                                default: return .gray
                    }
        }

        private func zoneColor(_ zone: Int) -> Color {
                    switch zone {
                                case 1: return .gray
                                case 2: return .blue
                                case 3: return .green
                                case 4: return .orange
                                case 5: return .red
                                default: return .gray
                    }
        }
}
