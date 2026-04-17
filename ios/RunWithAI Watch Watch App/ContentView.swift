//
//  ContentView.swift
//  RunWithAI Watch Watch App
//
//  Watch UI - virker som Garmin:
//  - Se dagens træning (hentet fra iPhone, gemt lokalt)
//  - Manuel synk-knap (som Garmin Connect sync)
//  - Start løb direkte på uret
//  - Live stats: tid, km, pace, puls
//  - Stop og gem - synkroniserer til iPhone bagefter
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
    @State private var isSyncing = false

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {

                // Header med sync-knap (som Garmin Connect)
                HStack {
                    Image(systemName: "figure.run")
                        .foregroundColor(.green)
                    Text("RunWithAI")
                        .font(.headline)
                        .foregroundColor(.green)
                    Spacer()
                    Button(action: {
                        isSyncing = true
                        connectivityManager.requestTodayTraining()
                        // Vis spinner i 2 sek
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            isSyncing = false
                        }
                    }) {
                        if isSyncing {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .frame(width: 18, height: 18)
                        } else {
                            Image(systemName: "arrow.clockwise")
                                .foregroundColor(connectivityManager.isReachable ? .blue : .gray)
                                .font(.system(size: 14))
                        }
                    }
                    .buttonStyle(.plain)
                    .disabled(!connectivityManager.isReachable || isSyncing)
                }
                .padding(.top, 4)

                // Reachability status
                if !connectivityManager.isReachable {
                    HStack(spacing: 4) {
                        Image(systemName: "iphone.slash")
                            .font(.caption2)
                        Text("iPhone ikke tilgængelig")
                            .font(.caption2)
                    }
                    .foregroundColor(.gray)
                }

                // Dagens træning
                if let training = connectivityManager.todayTraining {
                    TodayTrainingCard(training: training)
                } else {
                    NoTrainingCard()
                        .environmentObject(connectivityManager)
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
            // Auto-sync ved opstart hvis iPhone er tilgængelig
            if connectivityManager.isReachable {
                connectivityManager.requestTodayTraining()
            }
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

// MARK: - Ingen træning
struct NoTrainingCard: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: connectivityManager.isReachable ? "calendar.badge.exclamationmark" : "iphone.slash")
                .font(.title2)
                .foregroundColor(.gray)
            Text(connectivityManager.isReachable ? "Ingen træning sat op" : "Åbn iPhone-appen for at synkronisere")
                .font(.caption2)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
        .padding(10)
        .background(Color.gray.opacity(0.15))
        .cornerRadius(10)
    }
}

// MARK: - Aktivt løb
struct ActiveWorkoutView: View {
    @EnvironmentObject var workoutManager: WorkoutManager
    @EnvironmentObject var connectivityManager: WatchConnectivityManager

    var body: some View {
        if workoutManager.workoutComplete {
            WorkoutSummaryView()
                .environmentObject(workoutManager)
        } else {
            TabView {
                MainStatsView().environmentObject(workoutManager)
                HeartRateView().environmentObject(workoutManager)
                ControlView().environmentObject(workoutManager)
            }
            .tabViewStyle(.page)
        }
    }
}

// MARK: - Live stats
struct MainStatsView: View {
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        VStack(spacing: 2) {
            Text(workoutManager.formattedTime())
                .font(.system(size: 32, weight: .bold, design: .monospaced))
                .foregroundColor(.green)

            Divider()

            HStack(spacing: 0) {
                VStack(spacing: 0) {
                    Text(workoutManager.formattedDistance())
                        .font(.system(size: 22, weight: .bold))
                    Text("KM").font(.system(size: 10)).foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)

                Divider().frame(height: 30)

                VStack(spacing: 0) {
                    Text(workoutManager.formattedPace())
                        .font(.system(size: 22, weight: .bold))
                    Text("MIN/KM").font(.system(size: 10)).foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
            }

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

// MARK: - Puls
struct HeartRateView: View {
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "heart.fill").foregroundColor(.red).font(.title3)
            Text("\(Int(workoutManager.heartRate))")
                .font(.system(size: 40, weight: .bold)).foregroundColor(.red)
            Text("BPM").font(.caption).foregroundColor(.gray)
            Divider()
            HStack {
                VStack {
                    Text("\(Int(workoutManager.calories))").font(.title3).fontWeight(.semibold)
                    Text("KCAL").font(.system(size: 10)).foregroundColor(.gray)
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
                    Text("Stop løb").fontWeight(.bold)
                }
                .foregroundColor(.black).frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent).tint(.red)

            Button(action: { workoutManager.togglePause() }) {
                Text(workoutManager.isPaused ? "Fortsæt" : "Pause").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(workoutManager.isPaused ? .green : .orange)
        }
        .padding(.horizontal, 8)
    }
}

// MARK: - Opsummering efter løb
struct WorkoutSummaryView: View {
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill").font(.title).foregroundColor(.green)
                Text("Løb gemt!").font(.headline).foregroundColor(.green)
                Text("Synkroniserer til iPhone...").font(.caption2).foregroundColor(.gray)

                Divider()

                SummaryRow(icon: "clock", label: "Tid", value: workoutManager.formattedTime())
                SummaryRow(icon: "map", label: "Distance", value: "\(workoutManager.formattedDistance()) km")
                SummaryRow(icon: "speedometer", label: "Pace", value: "\(workoutManager.formattedPace()) /km")
                SummaryRow(icon: "heart.fill", label: "Puls", value: "\(Int(workoutManager.heartRate)) bpm", color: .red)
                SummaryRow(icon: "flame.fill", label: "Kalorier", value: "\(Int(workoutManager.calories)) kcal", color: .orange)

                Button("Ny træning") { workoutManager.resetWorkout() }
                    .buttonStyle(.borderedProminent).tint(.green)
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
            Image(systemName: icon).foregroundColor(color).frame(width: 20)
            Text(label).font(.caption).foregroundColor(.gray)
            Spacer()
            Text(value).font(.caption).fontWeight(.semibold)
                .foregroundColor(color == .white ? .white : color)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(WorkoutManager.shared)
        .environmentObject(WatchConnectivityManager.shared)
}
