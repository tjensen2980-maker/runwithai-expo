import SwiftUI
import HealthKit

struct ContentView: View {
                @StateObject private var workoutManager = WorkoutManager.shared
                @StateObject private var connectivityManager = WatchConnectivityManager.shared
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
                                                                                                                            .foregroundColor(primaryColor)
                                                                                                    
                                                                                                                        // ── Dagens træning fra iPhone ───────────────────
                                                                                                                        if let training = connectivityManager.todayTraining {
                                                                                                                                                            TodayTrainingCard(training: training, onStart: {
                                                                                                                                                                                                    showingRunView = true
                                                                                                                                                            })
                                                                                                                        }
                                                                                                    
                                                                                                                        // ── Start frit løb ──────────────────────────────
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
                                                                                                                                                            .padding(.vertical, 8)
                                                                                                                                                            .background(primaryColor)
                                                                                                                                                            .foregroundColor(.white)
                                                                                                                                                            .cornerRadius(8)
                                                                                                                        }
                                                                                                    
                                                                                                                        // ── Vælg træning ────────────────────────────────
                                                                                                                        Button(action: {
                                                                                                                                                            showingTrainingPicker = true
                                                                                                                        }) {
                                                                                                                                                            HStack {
                                                                                                                                                                                                    Image(systemName: "list.bullet")
                                                                                                                                                                                                        .font(.caption)
                                                                                                                                                                                                    Text("Vælg træning")
                                                                                                                                                            }
                                                                                                                                                            .frame(maxWidth: .infinity)
                                                                                                                                                            .padding(.vertical, 8)
                                                                                                                                                            .background(Color.blue)
                                                                                                                                                            .foregroundColor(.white)
                                                                                                                                                            .cornerRadius(8)
                                                                                                                        }
                                                                                                    
                                                                                                                        // ── Status ──────────────────────────────────────
                                                                                                                        if connectivityManager.isReachable {
                                                                                                                                                            Label("iPhone forbundet", systemImage: "iphone")
                                                                                                                                                                .font(.caption2)
                                                                                                                                                                .foregroundColor(.green)
                                                                                                                        } else {
                                                                                                                                                            Label("iPhone ikke tilgængelig", systemImage: "iphone.slash")
                                                                                                                                                                .font(.caption2)
                                                                                                                                                                .foregroundColor(.gray)
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
                                                            workoutManager.requestHealthKitAuthorization()
                                    }
                }
}

// MARK: - Dagens Træning Kort
struct TodayTrainingCard: View {
                let training: [String: Any]
                let onStart: () -> Void

                let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)

                var workoutName: String {
                                    training["name"] as? String ?? "Dagens træning"
                }
                var workoutKm: Double {
                                    training["km"] as? Double ?? 0
                }
                var workoutDescription: String {
                                    training["description"] as? String ?? ""
                }

                var body: some View {
                                    VStack(alignment: .leading, spacing: 4) {
                                                            HStack {
                                                                                        Image(systemName: "calendar")
                                                                                            .font(.caption)
                                                                                            .foregroundColor(primaryColor)
                                                                                        Text("I DAG")
                                                                                            .font(.caption2)
                                                                                            .fontWeight(.bold)
                                                                                            .foregroundColor(primaryColor)
                                                                                        Spacer()
                                                            }

                                                            Text(workoutName)
                                                                .font(.caption)
                                                                .fontWeight(.semibold)
                                                                .lineLimit(1)

                                                            if workoutKm > 0 {
                                                                                        Text(String(format: "%.1f km", workoutKm))
                                                                                            .font(.caption2)
                                                                                            .foregroundColor(.secondary)
                                                            }

                                                            if !workoutDescription.isEmpty {
                                                                                        Text(workoutDescription)
                                                                                            .font(.caption2)
                                                                                            .foregroundColor(.secondary)
                                                                                            .lineLimit(2)
                                                            }

                                                            Button(action: onStart) {
                                                                                        Text("Start")
                                                                                            .font(.caption)
                                                                                            .frame(maxWidth: .infinity)
                                                                                            .padding(.vertical, 6)
                                                                                            .background(primaryColor)
                                                                                            .foregroundColor(.white)
                                                                                            .cornerRadius(6)
                                                            }
                                    }
                                    .padding(8)
                                    .background(Color.white.opacity(0.1))
                                    .cornerRadius(10)
                                    .overlay(
                                                            RoundedRectangle(cornerRadius: 10)
                                                                .stroke(primaryColor.opacity(0.4), lineWidth: 1)
                                    )
                }
}
