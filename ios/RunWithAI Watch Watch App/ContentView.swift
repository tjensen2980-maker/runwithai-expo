/**
 * ContentView.swift
 * 
 * Hoved UI for RunWithAI Apple Watch app.
 * Viser løbe-status og tillader start/stop fra håndleddet.
 */

import SwiftUI
import WatchKit

struct ContentView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @State private var showingRunView = false
    
    // RunWithAI brand farver
    let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4) // Grøn
    let accentColor = Color(red: 0.2, green: 0.5, blue: 0.9)  // Blå
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                // App logo/titel
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
                
                // Status indikator
                if !connectivityManager.isReachable {
                    HStack {
                        Image(systemName: "iphone.slash")
                            .foregroundColor(.orange)
                        Text("iPhone ikke forbundet")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.orange.opacity(0.2))
                    .cornerRadius(8)
                }
                
                // Start knap
                if connectivityManager.isRunning {
                    NavigationLink(destination: RunningView()) {
                        VStack {
                            Image(systemName: "figure.run")
                                .font(.system(size: 24))
                            Text("Se løb")
                                .font(.caption)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(primaryColor)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                } else {
                    Button(action: {
                        connectivityManager.startRun()
                        showingRunView = true
                    }) {
                        VStack {
                            Image(systemName: "play.fill")
                                .font(.system(size: 24))
                            Text("Start løb")
                                .font(.caption)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(primaryColor)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .disabled(!connectivityManager.isReachable)
                    .opacity(connectivityManager.isReachable ? 1 : 0.5)
                }
                
                // Dagens stats
                VStack(spacing: 8) {
                    Text("I dag")
                        .font(.caption2)
                        .foregroundColor(.gray)
                    
                    HStack {
                        StatBox(
                            icon: "figure.walk",
                            value: "0",
                            unit: "km"
                        )
                        StatBox(
                            icon: "flame.fill",
                            value: "0",
                            unit: "kcal"
                        )
                    }
                }
                .padding(.top, 8)
                
                Spacer()
            }
            .padding()
            .navigationDestination(isPresented: $showingRunView) {
                RunningView()
            }
        }
    }
}

// MARK: - Stat Box Component

struct StatBox: View {
    let icon: String
    let value: String
    let unit: String
    
    var body: some View {
        VStack(spacing: 2) {
            Image(systemName: icon)
                .font(.caption2)
                .foregroundColor(.gray)
            Text(value)
                .font(.system(.body, design: .rounded))
                .fontWeight(.semibold)
            Text(unit)
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color.gray.opacity(0.2))
        .cornerRadius(8)
    }
}

// MARK: - Preview

#Preview {
    ContentView()
        .environmentObject(WatchConnectivityManager.shared)
}
