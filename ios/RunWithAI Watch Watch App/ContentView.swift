//
// ContentView.swift
// RunWithAI Watch Watch App
//
// Created by Thomas Jensen on 4/17/26.
//

import SwiftUI
import WatchKit

struct ContentView: View {
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    @State private var isRunning = false
    @State private var elapsedTime: TimeInterval = 0
    @State private var distance: Double = 0
    @State private var heartRate: Int = 0
    @State private var pace: String = "0:00"
    @State private var timer: Timer? = nil

    var body: some View {
        TabView {
            // MARK: - Tab 1: Dagens træning
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    if let training = connectivityManager.todayTraining {
                        HStack {
                            Image(systemName: "figure.run")
                                .foregroundColor(.green)
                            Text("Dagens træning")
                                .font(.headline)
                                .foregroundColor(.green)
                        }
                        
                        if let type = training["type"] as? String {
                            Text(type)
                                .font(.title3)
                                .fontWeight(.bold)
                        }
                        
                        if let description = training["description"] as? String {
                            Text(description)
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        
                        if let distance = training["distance"] as? Double {
                            HStack {
                                Image(systemName: "map")
                                    .foregroundColor(.blue)
                                Text(String(format: "%.1f km", distance))
                                    .font(.callout)
                            }
                        }
                        
                        if let duration = training["duration"] as? String {
                            HStack {
                                Image(systemName: "clock")
                                    .foregroundColor(.orange)
                                Text(duration)
                                    .font(.callout)
                            }
                        }
                        
                        Button(action: startWorkout) {
                            HStack {
                                Image(systemName: isRunning ? "pause.fill" : "play.fill")
                                Text(isRunning ? "Pause" : "Start løb")
                            }
                            .foregroundColor(.black)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                        .padding(.top, 4)
                        
                    } else {
                        VStack(spacing: 8) {
                            Image(systemName: "iphone")
                                .font(.largeTitle)
                                .foregroundColor(.gray)
                            Text("Henter træning...")
                                .font(.caption)
                                .foregroundColor(.gray)
                            Button("Opdater") {
                                connectivityManager.requestTodayTraining()
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.blue)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                    }
                }
                .padding()
            }
            .tabItem {
                Label("Træning", systemImage: "figure.run")
            }
            
            // MARK: - Tab 2: Live tracking
            VStack(spacing: 6) {
                if isRunning {
                    Text(formatTime(elapsedTime))
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                    
                    HStack(spacing: 16) {
                        VStack {
                            Text(String(format: "%.2f", distance))
                                .font(.title3)
                                .fontWeight(.semibold)
                            Text("km")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        
                        VStack {
                            Text(pace)
                                .font(.title3)
                                .fontWeight(.semibold)
                            Text("min/km")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        
                        VStack {
                            Text("\(heartRate)")
                                .font(.title3)
                                .fontWeight(.semibold)
                                .foregroundColor(.red)
                            Text("bpm")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                    
                    Button(action: stopWorkout) {
                        HStack {
                            Image(systemName: "stop.fill")
                            Text("Stop")
                        }
                        .foregroundColor(.black)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                } else {
                    Image(systemName: "figure.run.circle")
                        .font(.largeTitle)
                        .foregroundColor(.gray)
                    Text("Ikke aktiv")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text("Start fra Træning-fanen")
                        .font(.caption2)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
            }
            .tabItem {
                Label("Live", systemImage: "waveform.path.ecg")
            }
        }
        .onAppear {
            connectivityManager.requestTodayTraining()
        }
    }
    
    // MARK: - Workout control
    private func startWorkout() {
        isRunning = true
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            elapsedTime += 1
            // Simulate pace update
            if distance > 0 {
                let paceSeconds = elapsedTime / distance
                let paceMin = Int(paceSeconds) / 60
                let paceSec = Int(paceSeconds) % 60
                pace = String(format: "%d:%02d", paceMin, paceSec)
            }
            // Send live data to iPhone every 10 seconds
            if Int(elapsedTime) % 10 == 0 {
                connectivityManager.sendWorkoutData([
                    "elapsedTime": elapsedTime,
                    "distance": distance,
                    "heartRate": heartRate,
                    "pace": pace
                ])
            }
        }
    }
    
    private func stopWorkout() {
        isRunning = false
        timer?.invalidate()
        timer = nil
        // Send final workout data to iPhone
        connectivityManager.sendWorkoutData([
            "type": "WORKOUT_COMPLETE",
            "elapsedTime": elapsedTime,
            "distance": distance,
            "heartRate": heartRate,
            "pace": pace
        ])
        // Reset
        elapsedTime = 0
        distance = 0
        heartRate = 0
        pace = "0:00"
    }
    
    private func formatTime(_ seconds: TimeInterval) -> String {
        let h = Int(seconds) / 3600
        let m = (Int(seconds) % 3600) / 60
        let s = Int(seconds) % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        } else {
            return String(format: "%d:%02d", m, s)
        }
    }
}

#Preview {
    ContentView()
}
