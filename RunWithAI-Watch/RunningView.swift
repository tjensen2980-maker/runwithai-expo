import SwiftUI
import WatchKit

struct RunningView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @Environment(\.dismiss) var dismiss
    
    @State private var elapsedTime: Int = 0
    @State private var timer: Timer?
    @State private var isPaused: Bool = false
    
    let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text(formatTime(elapsedTime))
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                
                HStack(spacing: 16) {
                    VStack {
                        Text(connectivityManager.formatDistance(connectivityManager.currentDistance))
                            .font(.title3)
                            .foregroundColor(primaryColor)
                        Text("Distance")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                    
                    VStack {
                        Text(connectivityManager.currentPace)
                            .font(.title3)
                            .foregroundColor(.orange)
                        Text("min/km")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                }
                
                HStack(spacing: 20) {
                    Button(action: { isPaused.toggle() }) {
                        Image(systemName: isPaused ? "play.fill" : "pause.fill")
                            .font(.title2)
                            .frame(width: 50, height: 50)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .clipShape(Circle())
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Button(action: { connectivityManager.stopRun(); dismiss() }) {
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
        .onDisappear { timer?.invalidate() }
    }
    
    func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if !isPaused { elapsedTime += 1 }
        }
    }
    
    func formatTime(_ seconds: Int) -> String {
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        return String(format: "%02d:%02d", m, s)
    }
}
