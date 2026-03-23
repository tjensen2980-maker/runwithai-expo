import SwiftUI

struct ContentView: View {
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    @State private var showingRunView = false
    
    let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "figure.run")
                    .font(.system(size: 40))
                    .foregroundColor(primaryColor)
                
                Text("RunWithAI")
                    .font(.headline)
                
                Spacer()
                
                if !connectivityManager.isReachable {
                    Text("iPhone ikke forbundet")
                        .font(.caption2)
                        .foregroundColor(.orange)
                }
                
                Button(action: {
                    connectivityManager.startRun()
                    showingRunView = true
                }) {
                    Text("Start løb")
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
                    .environmentObject(connectivityManager)
            }
        }
    }
}
