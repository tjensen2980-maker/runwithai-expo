import SwiftUI
import WatchKit

struct ContentView: View {
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    @State private var showingRunView = false
    
    let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                VStack(spacing: 4) {
                    Image(systemName: "figure.run")
                        .font(.system(size: 40))
                        .foregroundColor(primaryColor)
                    
                    Text("RunWithAI")
                        .font(.headline)
                        .foregroundColor(.white)
                }
                .padding(.top, 8)
                
                Spacer()
                
                if !connectivityManager.isReachable {
                    HStack {
                        Image(systemName: "iphone.slash")
                            .foregroundColor(.orange)
                        Text("iPhone ikke forbundet")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                }
                
                Button(action: {
                    connectivityManager.startRun()
                    showingRunView = true
                }) {
                    VStack {
                        Image(systemName: connectivityManager.isRunning ? "figure.run" : "play.fill")
                            .font(.system(size: 24))
                        Text(connectivityManager.isRunning ? "Se løb" : "Start løb")
                            .font(.caption)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(primaryColor)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .buttonStyle(PlainButtonStyle())
                
                Spacer()
            }
            .padding()
            .navigationDestination(isPresented: $showingRunView) {
                RunningView()
            }
        }
    }
}
