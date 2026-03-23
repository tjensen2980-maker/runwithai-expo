import SwiftUI
import WatchKit

struct RunningView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @Environment(\.dismiss) var dismiss
    
    @State private var elapsedTime: Int = 0
    @State private var timer: Timer?
    @State private var isPaused: Bool = false
    
    let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)
    let heartColor = Color.red
    let paceColor = Color.orange
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text(formatTime(elapsedTime))
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                
                HStack(spacing: 16) {
                    VStack(spacing: 2) {
                        Text(connectivityManager.formatDistance(connectivityManager.currentDistance))
                            .font(.system(.title3, design: .rounded))
                            .fontWeight(.semibold)
                            .foregroundColor(primaryColor)
                        Text("Distance")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                    
                    VStack(spacing: 2) {
                        Text(connectivityManager.currentPace)
                            .font(.system(.title3, design: .rounded))
                            .fontWeight(.semibold)
                            .foregroundColor(paceColor)
                        Text("min/km")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                }
                
                if connectivityManager.currentHeartRate > 0 {
                    HStack {
                        Image(systemName: "heart.fill")
                            .foregroundColor(heartColor)
                        Text("\(connectivityManager.currentHeartRate) bpm")
                            .fontWeight(.semibold)
                    }
                }
                
                HStack(spacing: 20) {
                    Button(action: togglePause) {
                        Image(systemName: isPaused ? "play.fill" : "pause.fill")
                            .font(.title2)
                            .frame(width: 50, height: 50)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .clipShape(Circle())
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Button(action: stopRun) {
                        Image(systemName: "stop.fill")
                            .font(.title2)
                            .frame(width: 50, height: 50)
                            .background(Color.red)
                            .foregroundColor(.white)
                            .clipShape(Circle())
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding()
        }
        .onAppear { startTimer() }
        .onDisappear { stopTimer() }
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if !isPaused { elapsedTime += 1 }
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
    
    private func togglePause() {
        isPaused.toggle()
        if isPaused { connectivityManager.pauseRun() }
    }
    
    private func stopRun() {
        connectivityManager.stopRun()
        dismiss()
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d", mins, secs)
    }
}
