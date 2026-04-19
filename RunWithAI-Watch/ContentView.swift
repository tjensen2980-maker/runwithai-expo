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

                                                                      // ── Dagens træning fra iPhone ─────────────────────────────
                                                                      if let training = connectivityManager.todayTraining {
                                                                                                TodayTrainingCard(training: training, onStart: {
                                                                                                                              // Apply target pace from calendar training
                                                                                                                              applyTargetPaceFromTraining(training)
                                                                                                                              showingRunView = true
                                                                                                })
                                                                      } else {
                                                                                                // Refresh button when no training loaded
                                                                                                Button(action: {
                                                                                                                              connectivityManager.requestTodayTraining()
                                                                                                }) {
                                                                                                                              HStack {
                                                                                                                                                                Image(systemName: "arrow.clockwise")
                                                                                                                                                                    .font(.caption)
                                                                                                                                                                Text("Hent dagens træning")
                                                                                                                                                                    .font(.caption)
                                                                                                                              }
                                                                                                                              .frame(maxWidth: .infinity)
                                                                                                                              .padding(.vertical, 6)
                                                                                                                              .background(Color.blue.opacity(0.2))
                                                                                                                              .foregroundColor(.blue)
                                                                                                                              .cornerRadius(8)
                                                                                                }
                                                                      }

                                                                      // ── Start frit løb ────────────────────────────────────────
                                                                      Button(action: {
                                                                                                selectedPlan = nil
                                                                                                WorkoutManager.shared.setTargetPace(minPace: 0, maxPace: 0)
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

                                                                      // ── Vælg træning ──────────────────────────────────────────
                                                                      Button(action: { showingTrainingPicker = true }) {
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

                                                                      // ── Status ────────────────────────────────────────────────
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
                              workoutManager.requestPermissions()
                              connectivityManager.requestTodayTraining()
                }
      }

      // MARK: - Apply target pace from calendar training
      private func applyTargetPaceFromTraining(_ training: [String: Any]) {
                // Parse pace like "5:30" or "5:30-6:00" from training data
                if let paceStr = training["pace"] as? String, !paceStr.isEmpty {
                              // Try to parse "5:30-6:00" format
                              let parts = paceStr.components(separatedBy: "-")
                              func parsePace(_ s: String) -> Double {
                                                let trimmed = s.trimmingCharacters(in: .whitespaces)
                                                let components = trimmed.components(separatedBy: ":")
                                                if components.count == 2,
                                                   let min = Double(components[0]),
                                                   let sec = Double(components[1]) {
                                                                         return min * 60 + sec
                                                   }
                                                return 0
                              }
                              if parts.count == 2 {
                                                let minPace = parsePace(parts[0])
                                                let maxPace = parsePace(parts[1])
                                                WorkoutManager.shared.setTargetPace(minPace: minPace, maxPace: maxPace, label: paceStr)
                              } else if parts.count == 1 {
                                                let pace = parsePace(parts[0])
                                                // ±15 sec tolerance around single pace
                                                WorkoutManager.shared.setTargetPace(minPace: pace - 15, maxPace: pace + 15, label: paceStr)
                              }
                } else if let kmTarget = training["km"] as? Double, kmTarget > 0 {
                              // No specific pace – just set label
                              WorkoutManager.shared.setTargetPace(minPace: 0, maxPace: 0,
                                                                                  label: String(format: "%.1f km", kmTarget))
                } else {
                              WorkoutManager.shared.setTargetPace(minPace: 0, maxPace: 0)
                }
      }
}

// MARK: - Dagens Træning Kort
struct TodayTrainingCard: View {
      let training: [String: Any]
      let onStart: () -> Void
      let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)

      var workoutName: String { training["name"] as? String ?? "Dagens træning" }
      var workoutKm: Double { training["km"] as? Double ?? 0 }
      var workoutDescription: String { training["description"] as? String ?? "" }
      var workoutPace: String { training["pace"] as? String ?? "" }

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
                              HStack(spacing: 8) {
                                                if workoutKm > 0 {
                                                                      Label(String(format: "%.1f km", workoutKm), systemImage: "map")
                                                                          .font(.caption2)
                                                                          .foregroundColor(.secondary)
                                                }
                                                if !workoutPace.isEmpty {
                                                                      Label(workoutPace + " /km", systemImage: "speedometer")
                                                                          .font(.caption2)
                                                                          .foregroundColor(.orange)
                                                }
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
