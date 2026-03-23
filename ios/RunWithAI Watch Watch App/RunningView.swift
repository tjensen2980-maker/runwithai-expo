/**
 * RunningView.swift
 * 
 * Viser live løbe-statistik på Apple Watch.
 * Distance, tempo, tid og puls.
 */

import SwiftUI
import WatchKit

struct RunningView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @Environment(\.dismiss) var dismiss
    
    @State private var elapsedTime: Int = 0
    @State private var timer: Timer?
    @State private var isPaused: Bool = false
    
    // Farver
    let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)
    let heartColor = Color.red
    let paceColor = Color.orange
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Tid (stort display)
                VStack(spacing: 2) {
                    Text(formatTime(connectivityManager.currentDuration > 0 ? connectivityManager.currentDuration : elapsedTime))
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    Text("Tid")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
                .padding(.top, 8)
                
                // Distance og Tempo
                HStack(spacing: 16) {
                    // Distance
                    VStack(spacing: 2) {
                        Text(connectivityManager.formatDistance(connectivityManager.currentDistance))
                            .font(.system(.title3, design: .rounded))
                            .fontWeight(.semibold)
                            .foregroundColor(primaryColor)
                        Text("Distance")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity)
                    
                    // Tempo
                    VStack(spacing: 2) {
                        Text(connectivityManager.currentPace)
                            .font(.system(.title3, design: .rounded))
                            .fontWeight(.semibold)
                            .foregroundColor(paceColor)
                        Text("min/km")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(.vertical, 8)
                
                // Puls
                if connectivityManager.currentHeartRate > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "heart.fill")
                            .foregroundColor(heartColor)
                        Text("\(connectivityManager.currentHeartRate)")
                            .font(.system(.title2, design: .rounded))
                            .fontWeight(.semibold)
                        Text("bpm")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity)
                    .background(heartColor.opacity(0.15))
                    .cornerRadius(8)
                }
                
                Spacer(minLength: 16)
                
                // Kontrol knapper
                HStack(spacing: 20) {
                    // Pause/Resume
                    Button(action: togglePause) {
                        Image(systemName: isPaused ? "play.fill" : "pause.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                            .frame(width: 50, height: 50)
                            .background(Color.orange)
                            .clipShape(Circle())
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // Stop
                    Button(action: stopRun) {
                        Image(systemName: "stop.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                            .frame(width: 50, height: 50)
                            .background(Color.red)
                            .clipShape(Circle())
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding()
        }
        .navigationTitle("Løber")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            startLocalTimer()
        }
        .onDisappear {
            stopLocalTimer()
        }
    }
    
    // MARK: - Timer
    
    private func startLocalTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if !isPaused {
                elapsedTime += 1
            }
        }
    }
    
    private func stopLocalTimer() {
        timer?.invalidate()
        timer = nil
    }
    
    // MARK: - Actions
    
    private func togglePause() {
        isPaused.toggle()
        if isPaused {
            connectivityManager.pauseRun()
            WKInterfaceDevice.current().play(.stop)
        } else {
            connectivityManager.sendCommand("RESUME_RUN")
            WKInterfaceDevice.current().play(.start)
        }
    }
    
    private func stopRun() {
        WKInterfaceDevice.current().play(.success)
        connectivityManager.stopRun()
        dismiss()
    }
    
    // MARK: - Helpers
    
    private func formatTime(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%02d:%02d", minutes, secs)
        }
    }
}

// MARK: - Preview

#Preview {
    RunningView()
        .environmentObject(WatchConnectivityManager.shared)
}
