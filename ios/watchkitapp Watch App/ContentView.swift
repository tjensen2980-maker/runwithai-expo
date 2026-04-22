import SwiftUI

struct ContentView: View {
    @StateObject private var workout = WorkoutManager()
    @StateObject private var store = WorkoutStore.shared
    @StateObject private var auth = AuthManager.shared
    @StateObject private var sync = SyncManager.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                if workout.isRunning {
                    Text(workout.formattedTime)
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundColor(.green)

                    HStack(spacing: 12) {
                        VStack(spacing: 2) {
                            Text("Distance")
                                .font(.caption2)
                                .foregroundColor(.gray)
                            Text(workout.locationManager.formattedDistance)
                                .font(.system(size: 14, weight: .semibold))
                        }
                        VStack(spacing: 2) {
                            Text("Tempo")
                                .font(.caption2)
                                .foregroundColor(.gray)
                            Text(workout.locationManager.formattedPace)
                                .font(.system(size: 14, weight: .semibold))
                        }
                    }

                    Text(workout.locationManager.debugMessage)
                        .font(.system(size: 9))
                        .foregroundColor(.yellow)
                        .multilineTextAlignment(.center)

                    if workout.isPaused {
                        Button(action: { workout.resume() }) {
                            Label("Fortsæt", systemImage: "play.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .tint(.green)
                    } else {
                        Button(action: { workout.pause() }) {
                            Label("Pause", systemImage: "pause.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .tint(.orange)
                    }

                    Button(action: { workout.stop() }) {
                        Label("Stop", systemImage: "stop.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .tint(.red)

                } else {
                    Image(systemName: "figure.run")
                        .font(.system(size: 40))
                        .foregroundColor(.green)
                    Text("RunWithAI")
                        .font(.headline)

                    if auth.isAuthenticated {
                        HStack(spacing: 3) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                                .font(.system(size: 10))
                            Text("Logged in")
                                .font(.system(size: 10))
                                .foregroundColor(.green)
                        }
                    } else {
                        HStack(spacing: 3) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                                .font(.system(size: 10))
                            Text("Ikke logget ind")
                                .font(.system(size: 10))
                                .foregroundColor(.orange)
                        }
                    }

                    Text("Klar til løb")
                        .font(.caption)
                        .foregroundColor(.gray)

                    if !store.workouts.isEmpty {
                        VStack(spacing: 2) {
                            Text("\(store.workouts.count) gemte løb")
                                .font(.system(size: 10))
                                .foregroundColor(.blue)
                            if !store.pendingSync.isEmpty {
                                HStack(spacing: 3) {
                                    if sync.isSyncing {
                                        ProgressView()
                                            .scaleEffect(0.5)
                                    }
                                    Text("\(store.pendingSync.count) venter på sync")
                                        .font(.system(size: 9))
                                        .foregroundColor(.orange)
                                }

                                // Manuel sync-knap
                                Button(action: { sync.syncPending() }) {
                                    Label("Synk nu", systemImage: "arrow.triangle.2.circlepath")
                                        .font(.system(size: 10))
                                }
                                .buttonStyle(.bordered)
                                .controlSize(.mini)
                            }
                            Text(sync.lastSyncStatus)
                                .font(.system(size: 8))
                                .foregroundColor(.gray)
                        }
                    }

                    Text(auth.debugStatus)
                        .font(.system(size: 8))
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)

                    Button(action: { workout.start() }) {
                        Label("Start", systemImage: "play.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .tint(.green)
                    .controlSize(.large)
                }
            }
            .padding(.horizontal, 4)
        }
    }
}

#Preview {
    ContentView()
}
