import SwiftUI

struct ContentView: View {
    @StateObject private var workout = WorkoutManager()
    @StateObject private var store = WorkoutStore.shared

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
                    Text("Klar til løb")
                        .font(.caption)
                        .foregroundColor(.gray)

                    // Viser gemte + ikke-synkede workouts
                    if !store.workouts.isEmpty {
                        VStack(spacing: 2) {
                            Text("\(store.workouts.count) gemte løb")
                                .font(.system(size: 10))
                                .foregroundColor(.blue)
                            if !store.pendingSync.isEmpty {
                                Text("\(store.pendingSync.count) venter på sync")
                                    .font(.system(size: 9))
                                    .foregroundColor(.orange)
                            }
                        }
                    }

                    Text("Auth: \(workout.locationManager.authStatus.rawValue)")
                        .font(.system(size: 9))
                        .foregroundColor(.gray)

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
