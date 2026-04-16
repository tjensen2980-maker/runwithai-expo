import SwiftUI
import HealthKit

struct ContentView: View {
            @StateObject private var workoutManager = WorkoutManager.shared
            @State private var showingRunView = false
            @State private var showingTrainingPicker = false
            @State private var selectedPlan: TrainingPlan?

            let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)

            var body: some View {
                            NavigationStack {
                                                ScrollView {
                                                                        VStack(spacing: 10) {
                                                                                                    // Logo
                                                                                                    Image(systemName: "figure.run")
                                                                                                        .font(.system(size: 32))
                                                                                                        .foregroundColor(primaryColor)
                                                                                                    
                                                                                                    Text("RunWithAI")
                                                                                                        .font(.headline)
                                                                                                        .foregroundColor(.white)
                                                                                                    
                                                                                                    // Quick start - free run
                                                                                                    Button(action: {
                                                                                                                                    selectedPlan = nil
                                                                                                                                    showingRunView = true
                                                                                                    }) {
                                                                                                                                    HStack {
                                                                                                                                                                        Image(systemName: "play.fill")
                                                                                                                                                                            .font(.caption)
                                                                                                                                                                        Text("Start frit løb")
                                                                                                                                    }
                                                                                                                                    .frame(maxWidth: .infinity)
                                                                                                                                    .padding(.vertical, 10)
                                                                                                                                    .background(primaryColor)
                                                                                                                                    .foregroundColor(.white)
                                                                                                                                    .cornerRadius(12)
                                                                                                    }
                                                                                                    .buttonStyle(PlainButtonStyle())
                                                                                                    
                                                                                                    // Choose training
                                                                                                    Button(action: {
                                                                                                                                    showingTrainingPicker = true
                                                                                                    }) {
                                                                                                                                    HStack {
                                                                                                                                                                        Image(systemName: "list.bullet")
                                                                                                                                                                            .font(.caption)
                                                                                                                                                                        Text("Vælg træning")
                                                                                                                                    }
                                                                                                                                    .frame(maxWidth: .infinity)
                                                                                                                                    .padding(.vertical, 10)
                                                                                                                                    .background(Color.orange.opacity(0.2))
                                                                                                                                    .foregroundColor(.orange)
                                                                                                                                    .cornerRadius(12)
                                                                                                    }
                                                                                                    .buttonStyle(PlainButtonStyle())
                                                                                                    
                                                                                                    // Permission warning
                                                                                                    if !workoutManager.hasHealthPermission {
                                                                                                                                    VStack(spacing: 4) {
                                                                                                                                                                        Image(systemName: "exclamationmark.triangle.fill")
                                                                                                                                                                            .foregroundColor(.yellow)
                                                                                                                                                                            .font(.caption)
                                                                                                                                                                        Text("Tilladelser kræves")
                                                                                                                                                                            .font(.caption2)
                                                                                                                                                                            .foregroundColor(.yellow)
                                                                                                                                    }
                                                                                                                                    .padding(.top, 4)
                                                                                                    }
                                                                        }
                                                                        .padding(.horizontal, 8)
                                                }
                                                .navigationDestination(isPresented: $showingRunView) {
                                                                        RunningView()
                                                }
                                                .navigationDestination(isPresented: $showingTrainingPicker) {
                                                                        TrainingPickerView(
                                                                                                    selectedPlan: $selectedPlan,
                                                                                                    showRunning: $showingRunView
                                                                        )
                                                }
                            }
                            .onAppear {
                                                workoutManager.requestPermissions()
                            }
            }
}
