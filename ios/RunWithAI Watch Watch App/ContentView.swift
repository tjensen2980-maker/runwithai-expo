//
//  ContentView.swift
//  RunWithAI Watch Watch App
//
//  Watch UI - virker som Garmin:
//  1. Se dagens træning (hentet fra iPhone på forhånd)
//  2. Start løb direkte på uret
//  3. Live stats: tid, km, pace, puls
//  4. Stop og gem - synkroniserer til iPhone bagefter
//

import SwiftUI
import HealthKit

struct ContentView: View {
    @EnvironmentObject var workoutManager: WorkoutManager
    @EnvironmentObject var connectivityManager: WatchConnectivityManager

    var body: some View {
        if workoutManager.isRunning || workoutManager.workoutComplete {
            ActiveWorkoutView()
                .environmentObject(workoutManager)
                .environmentObject(connectivityManager)
        } else {
            HomeView()
                .environmentObject(workoutManager)
                .environmentObject(connectivityManager)
        }
    }
}

// MARK: - Startskærm (som Garmin's Today-skærm)
struct HomeView: View {
    @EnvironmentObject var workoutManager: WorkoutManager
    @EnvironmentObject var connectivityManager: WatchConnectivityManager

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {

                // App navn
                HStack {
                    Image(systemName: "figure.run")
                        .foregroundColor(.green)
                    Text("RunWithAI")
                        .font(.headline)
                        .foregroundColor(.green)
                }
                .padding(.top, 4)

                // Dagens træning (fra iPhone)
                if let training = connectivityManager.todayTraining {
                    TodayTrainingCard(training: training)
                } else {
                    NoTrainingCard()
                }

                // Start løb knap
                Button(action: {
                    workoutManager.startWorkout()
                }) {
                    HStack {
                        Image(systemName: "play.fill")
                        Text("Start løb")
                            .fontWeight(.bold)
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)

            }
            .padding(.horizontal, 8)
        }
        .onAppear {
            connectivityManager.requestTodayTraining()
        }
    }
}

// MARK: - Dagens træning kort
struct TodayTrainingCard: View {
    let training: [String: Any]

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("DAGENS TRÆNING")
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.green)
                .kerning(1)

            if let type = training["type"] as? String {
                Text(type)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
            }

            HStack(spacing: 12) {
                if let distance = training["distance"] as? Double {
                    Label(String(format: "%.1f km", distance), systemImage: "map")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                if let duration = training["duration"] as? String {
                    Label(duration, systemImage: "clock")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }

            if let description = training["description"] as? String {
                Text(description)
                    .font(.system(size: 11))
                    .foregroundColor(.gray)
                    .lineLimit(2)
            }
        }
        .padding(10)
        .background(Color.gray.opacity(0.2))
        .cornerRadius(10)
    }
}

// MARK: - Ingen træning sat op
struct NoTrainingCard: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "iphone.slash")
                .font(.title2)
                .foregroundColor(.gray)
            Text("Ingen træning i dag")
                .font(.caption)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
            Button("Hent fra iPhone") {
                connectivityManager.requestTodayTraining()
            }
            .font(.caption2)
            .buttonStyle(.bordered)
            .tint(.blue)
        }
        .padding(10)
        .background(Color.gray.opacity(0.15))
        .cornerRadius(10)
    }
}

// MARK: - Aktivt løb (Garmin-stil live skærm)
struct ActiveWorkoutView: View {
    @EnvironmentObject var workoutManager: WorkoutManager
    @EnvironmentObject var connectivityManager: WatchConnectivityManager

    var body: some View {
        if workoutManager.workoutComplete {
            WorkoutSummaryView()
                .environmentObject(workoutManager)
        } else {
            TabView {
                // Side 1: Hoved-stats
                MainStatsView()
                    .environmentObject(workoutManager)

                // Side 2: Puls + kalorier
                HeartRateView()
                    .environmentObject(workoutManager)

                // Side 3: Stop/pause
                ControlView()
                    .environmentObject(workoutManager)
            }
            .tabViewStyle(.page)
        }
    }
}

// MARK: - Hoved live stats (tid + km + pace)
struct MainStatsView: View {
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        VStack(spacing: 2) {
            // Tid
            Text(workoutManager.formattedTime())
                .font(.system(size: 32, weight: .bold, design: .monospaced))
                .foregroundColor(.green)

            Divider()

            HStack(spacing: 0) {
                // Distance
                VStack(spacing: 0) {
                    Text(workoutManager.formattedDistance())
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                    Text("KM")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)

                Divider().frame(height: 30)

                // Pace
                VStack(spacing: 0) {
                    Text(workoutManager.formattedPace())
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                    Text("MIN/KM")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
            }

            // Pause knap
            Button(action: { workoutManager.togglePause() }) {
                Image(systemName: workoutManager.isPaused ? "play.fill" : "pause.fill")
                    .foregroundColor(.black)
            }
            .buttonStyle(.borderedProminent)
            .tint(workoutManager.isPaused ? .green : .orange)
            .padding(.top, 4)
        }
        .padding(.horizontal, 6)
    }
}

// MARK: - Puls skærm
struct HeartRateView: View {
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "heart.fill")
                .foregroundColor(.red)
                .font(.title3)

            Text("\(Int(workoutManager.heartRate))")
                .font(.system(size: 40, weight: .bold))
                .foregroundColor(.red)

            Text("BPM")
                .font(.caption)
                .foregroundColor(.gray)

            Divider()

            HStack {
                VStack {
                    Text("\(Int(workoutManager.calories))")
                        .font(.title3)
                        .fontWeight(.semibold)
                    Text("KCAL")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                }
            }
        }
    }
}

// MARK: - Stop kontrol
struct ControlView: View {
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        VStack(spacing: 10) {
            Button(action: { workoutManager.stopWorkout() }) {
                HStack {
                    Image(systemName: "stop.fill")
                    Text("Stop løb")
                        .fontWeight(.bold)
                }
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)

            Button(action: { workoutManager.togglePause() }) {
                Text(workoutManager.isPaused ? "Fortsæt" : "Pause")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(workoutManager.isPaused ? .green : .orange)
        }
        .padding(.horizontal, 8)
    }
}

// MARK: - Opsummering efter løb (som Garmin's result screen)
struct WorkoutSummaryView: View {
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title)
                    .foregroundColor(.green)

                Text("Løb afsluttet!")
                    .font(.headline)
                    .foregroundColor(.green)

                Divider()

                SummaryRow(icon: "clock", label: "Tid", value: workoutManager.formattedTime())
                SummaryRow(icon: "map", label: "Distance", value: "\(workoutManager.formattedDistance()) km")
                SummaryRow(icon: "speedometer", label: "Pace", value: "\(workoutManager.formattedPace()) /km")
                SummaryRow(icon: "heart.fill", label: "Puls", value: "\(Int(workoutManager.heartRate)) bpm", color: .red)
                SummaryRow(icon: "flame.fill", label: "Kalorier", value: "\(Int(workoutManager.calories)) kcal", color: .orange)

                Text("Synkroniserer til iPhone...")
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .padding(.top, 4)

                Button("Ny træning") {
                    workoutManager.resetWorkout()
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
            }
            .padding(.horizontal, 8)
        }
    }
}

struct SummaryRow: View {
    let icon: String
    let label: String
    let value: String
    var color: Color = .white

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 20)
            Text(label)
                .font(.caption)
                .foregroundColor(.gray)
            Spacer()
            Text(value)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(color == .white ? .white : color)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(WorkoutManager.shared)
        .environmentObject(WatchConnectivityManager.shared)
}
