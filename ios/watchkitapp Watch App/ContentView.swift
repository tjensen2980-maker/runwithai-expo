import SwiftUI

struct StandardWorkout: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let icon: String
    let description: String
    let color: String
}

let standardWorkouts: [StandardWorkout] = [
    StandardWorkout(name: "Løb", icon: "figure.run", description: "Frit løb", color: "green"),
    StandardWorkout(name: "Interval", icon: "bolt.fill", description: "Høj intensitet", color: "red"),
    StandardWorkout(name: "Langt løb", icon: "map", description: "Lav intensitet", color: "blue"),
    StandardWorkout(name: "Restitution", icon: "leaf.fill", description: "Let løb", color: "mint"),
    StandardWorkout(name: "Gå/Løb", icon: "figure.walk", description: "Vekslende", color: "cyan"),
    StandardWorkout(name: "Tempo", icon: "speedometer", description: "Fart træning", color: "orange"),
]

func colorFromName(_ n: String) -> Color {
    switch n {
    case "red": return .red
    case "blue": return .blue
    case "mint": return .mint
    case "cyan": return .cyan
    case "orange": return .orange
    default: return .green
    }
}



func todayLongDa() -> String {
    let days = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"]
    let idx = Calendar.current.component(.weekday, from: Date()) - 1
    return days[(idx + 7) % 7]
}

struct ContentView: View {
    @StateObject private var workout = WorkoutManager.shared
    @StateObject private var store = WorkoutStore.shared
    @StateObject private var auth = AuthManager.shared
    @StateObject private var sync = SyncManager.shared
    @StateObject private var training = TrainingManager.shared
    @State private var showPicker: Bool = false
    
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
                    Button(action: { showPicker = true }) {
                        Label("Vælg anden træning", systemImage: "list.bullet")
                            .font(.system(size: 11))
                            .frame(maxWidth: .infinity)
                    }
                    .tint(.blue)
                }
            }
            .padding(.horizontal, 4)
    }
    .sheet(isPresented: $showPicker) {
        WorkoutPickerView(workout: workout, isPresented: $showPicker)
    }
}

}



struct WorkoutPickerView: View {
    @ObservedObject var workout: WorkoutManager
    @Binding var isPresented: Bool
    @State private var selectedWorkout: StandardWorkout? = nil
    var body: some View {
        NavigationStack {
        ScrollView {
            VStack(spacing: 6) {
                ForEach(standardWorkouts) { w in
                    NavigationLink {
                        WorkoutGoalView(workout: workout, selected: w, isPresented: $isPresented)
                    } label: {
                        HStack {
                            Image(systemName: w.icon)
                                .foregroundColor(colorFromName(w.color))
                                .frame(width: 24)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(w.name)
                                    .font(.system(size: 13, weight: .semibold))
                                Text(w.description)
                                    .font(.system(size: 9))
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                        }
                    }
                }
            }
            .padding(6)
        }
        .navigationTitle("Vælg")
        }
    }
}

struct WorkoutGoalView: View {
    @ObservedObject var workout: WorkoutManager
    let selected: StandardWorkout
    @Binding var isPresented: Bool
    @ObservedObject private var sync = SyncManager.shared
    @State private var targetKm: Double = 0
    @State private var targetMin: Int = 0
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                Image(systemName: selected.icon)
                    .font(.system(size: 30))
                    .foregroundColor(colorFromName(selected.color))
                Text(selected.name)
                    .font(.headline)
                if sync.aiLoading {
                    ProgressView().scaleEffect(0.7)
                    Text("AI taenker...").font(.system(size: 9)).foregroundColor(.gray)
                } else if let sugg = sync.aiSuggestion {
                    VStack(alignment: .leading, spacing: 4) {
                        if let intro = sugg["intro"] as? String {
                            Text(intro).font(.system(size: 10)).foregroundColor(.cyan)
                        }
                        if let steps = sugg["steps"] as? [String] {
                            ForEach(steps, id: \.self) { step in
                                Text("• \(step)").font(.system(size: 9)).foregroundColor(.white)
                            }
                        }
                        if let intensity = sugg["intensity"] as? String {
                            Text("Intensitet: \(intensity)").font(.system(size: 9, weight: .bold)).foregroundColor(.orange)
                        }
                    }
                    .padding(6)
                    .background(Color.gray.opacity(0.15))
                    .cornerRadius(6)
                }
                VStack(spacing: 2) {
                    Text("Distance: \(String(format: "%.1f", targetKm)) km")
                        .font(.system(size: 11))
                    Stepper("", value: $targetKm, in: 0...50, step: 0.5)
                        .labelsHidden()
                }
                VStack(spacing: 2) {
                    Text("Tid: \(targetMin) min")
                        .font(.system(size: 11))
                    Stepper("", value: $targetMin, in: 0...180, step: 5)
                        .labelsHidden()
                }
                Text(targetKm == 0 && targetMin == 0 ? "Frit (intet mål)" : "")
                    .font(.system(size: 9))
                    .foregroundColor(.gray)
                Button(action: {
                    workout.start(type: selected.name, targetKm: targetKm, targetMinutes: targetMin)
                    isPresented = false
                }) {
                    Label("Start", systemImage: "play.fill")
                        .frame(maxWidth: .infinity)
                }
                .tint(.green)
                .controlSize(.large)
            }
            .padding(8)
        }
        .navigationTitle("Mål")
        .onAppear { sync.fetchWorkoutSuggestion(type: selected.name) }
        .onChange(of: sync.aiLoading) { _ in
            if let sugg = sync.aiSuggestion {
                if targetKm == 0 {
                    if let v = sugg["total_km"] as? Double { targetKm = v }
                    else if let v = sugg["total_km"] as? Int { targetKm = Double(v) }
                    else if let v = sugg["total_km"] as? NSNumber { targetKm = v.doubleValue }
                }
                if targetMin == 0 {
                    if let v = sugg["total_min"] as? Int { targetMin = v }
                    else if let v = sugg["total_min"] as? Double { targetMin = Int(v) }
                    else if let v = sugg["total_min"] as? NSNumber { targetMin = v.intValue }
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
