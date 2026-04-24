import SwiftUI


func todayLongDa() -> String {
    let days = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"]
    let idx = Calendar.current.component(.weekday, from: Date()) - 1
    return days[(idx + 7) % 7]
}

struct ContentView: View {
    @StateObject private var workout = WorkoutManager()
    @StateObject private var store = WorkoutStore.shared
    @StateObject private var auth = AuthManager.shared
    @StateObject private var sync = SyncManager.shared
    @StateObject private var training = TrainingManager.shared

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

                    if !auth.isAuthenticated {
                        HStack(spacing: 3) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                                .font(.system(size: 10))
                            Text("Log ind på mobil for sync")
                                .font(.system(size: 10))
                                .foregroundColor(.orange)
                        }
                    }


                    if let today = training.todayTraining {
                        VStack(spacing: 4) {
                            HStack(spacing: 4) {
                                Image(systemName: today.completed ? "checkmark.circle.fill" : "calendar")
                                    .font(.system(size: 11))
                                    .foregroundColor(today.completed ? .green : .cyan)
                                Text(today.completed ? "Gennemført i dag" : "Dagens træning")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(today.completed ? .green : .cyan)
                            }
                            Text(todayLongDa())
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                            Text(today.name)
                                .font(.system(size: 13, weight: .bold))
                                .multilineTextAlignment(.center)
                            if today.km > 0 {
                                Text(String(format: "%.1f km", today.km))
                                    .font(.system(size: 12))
                                    .foregroundColor(.white)
                            }
                            if !today.pace.isEmpty {
                                Text("Tempo: \(today.pace)")
                                    .font(.system(size: 10))
                                    .foregroundColor(.gray)
                            }
                            if !today.description.isEmpty {
                                Text(today.description)
                                    .font(.system(size: 9))
                                    .foregroundColor(.gray)
                                    .multilineTextAlignment(.center)
                                    .lineLimit(3)
                            }
                        }
                        .padding(.vertical, 6)
                        .padding(.horizontal, 8)
                        .background((today.completed ? Color.green : Color.cyan).opacity(0.15))
                        .cornerRadius(8)
                    }

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
