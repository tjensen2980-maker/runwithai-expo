import SwiftUI
import HealthKit

struct ContentView: View {
        @StateObject private var workoutManager = WorkoutManager.shared
        @State private var showingRunView = false
        @State private var permissionsRequested = false

        let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)

        var body: some View {
                    NavigationStack {
                                    VStack(spacing: 12) {
                                                        Image(systemName: "figure.run")
                                                            .font(.system(size: 36))
                                                            .foregroundColor(primaryColor)

                                                        Text("RunWithAI")
                                                            .font(.headline)
                                                            .foregroundColor(.white)

                                                        Spacer()

                                                        // Permission status
                                                        if !workoutManager.hasHealthPermission && permissionsRequested {
                                                                                VStack(spacing: 4) {
                                                                                                            Image(systemName: "exclamationmark.triangle.fill")
                                                                                                                .foregroundColor(.yellow)
                                                                                                                .font(.caption)
                                                                                                            Text("Tilladelser kræves")
                                                                                                                .font(.caption2)
                                                                                                                .foregroundColor(.yellow)
                                                                                                            Text("Åbn Indstillinger > Sundhed")
                                                                                                                .font(.caption2)
                                                                                                                .foregroundColor(.gray)
                                                                                }
                                                        }

                                                        // Start button
                                                        Button(action: {
                                                                                if !permissionsRequested {
                                                                                                            workoutManager.requestPermissions()
                                                                                                            permissionsRequested = true
                                                                                }
                                                                                showingRunView = true
                                                        }) {
                                                                                HStack {
                                                                                                            Image(systemName: "play.fill")
                                                                                                            Text("Start løb")
                                                                                }
                                                                                .frame(maxWidth: .infinity)
                                                                                .padding(.vertical, 10)
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
                    .onAppear {
                                    workoutManager.requestPermissions()
                                    permissionsRequested = true
                    }
        }
}
