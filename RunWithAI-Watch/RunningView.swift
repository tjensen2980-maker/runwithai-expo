import SwiftUI
import WatchKit

struct RunningView: View {
            @StateObject private var workoutManager = WorkoutManager.shared
            @Environment(\.dismiss) var dismiss
            @State private var showingSummary = false

            let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)

            var body: some View {
                            TabView {
                                                mainDataScreen
                                                heartRateScreen
                                                splitsScreen
                                                detailsScreen
                            }
                            .tabViewStyle(.page)
                            .onAppear {
                                                workoutManager.startWorkout()
                            }
                            .navigationDestination(isPresented: $showingSummary) {
                                                WorkoutSummaryView()
                            }
                            .onChange(of: workoutManager.showSummary) { newValue in
                                                                                   if newValue { showingSummary = true }
                                                                      }
            }

            // MARK: - Screen 1: Main Data
            private var mainDataScreen: some View {
                            VStack(spacing: 6) {
                                                if workoutManager.autoPaused {
                                                                        Text("AUTO-PAUSE")
                                                                            .font(.caption2)
                                                                            .foregroundColor(.yellow)
                                                                            .padding(.horizontal, 8)
                                                                            .padding(.vertical, 2)
                                                                            .background(Color.yellow.opacity(0.2))
                                                                            .cornerRadius(4)
                                                }

                                                // Duration
                                                Text(workoutManager.formatDuration(workoutManager.elapsedSeconds))
                                                    .font(.system(size: 34, weight: .bold, design: .rounded))
                                                    .foregroundColor(.white)

                                                // Distance & Pace
                                                HStack(spacing: 14) {
                                                                        VStack(spacing: 2) {
                                                                                                    Text(workoutManager.formatDistance(workoutManager.distance))
                                                                                                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                                                                                                        .foregroundColor(primaryColor)
                                                                                                    Text("km")
                                                                                                        .font(.system(size: 10))
                                                                                                        .foregroundColor(.gray)
                                                                        }

                                                                        Rectangle()
                                                                            .fill(Color.gray.opacity(0.3))
                                                                            .frame(width: 1, height: 30)

                                                                        VStack(spacing: 2) {
                                                                                                    Text(workoutManager.formatPace(workoutManager.smoothedPace > 0 ? workoutManager.smoothedPace : workoutManager.currentPace))
                                                                                                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                                                                                                        .foregroundColor(.orange)
                                                                                                    Text("pace")
                                                                                                        .font(.system(size: 10))
                                                                                                        .foregroundColor(.gray)
                                                                        }

                                                                        Rectangle()
                                                                            .fill(Color.gray.opacity(0.3))
                                                                            .frame(width: 1, height: 30)

                                                                        VStack(spacing: 2) {
                                                                                                    Text(workoutManager.formatHeartRate())
                                                                                                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                                                                                                        .foregroundColor(heartRateColor)
                                                                                                    HStack(spacing: 2) {
                                                                                                                                    Image(systemName: "heart.fill")
                                                                                                                                        .font(.system(size: 8))
                                                                                                                                    Text("bpm")
                                                                                                                                        .font(.system(size: 10))
                                                                                                    }
                                                                                                    .foregroundColor(.gray)
                                                                        }
                                                }

                                                Spacer()
                                                controlButtons
                            }
                            .padding(.horizontal, 6)
                            .padding(.top, 4)
            }

            // MARK: - Screen 2: Heart Rate
            private var heartRateScreen: some View {
                            VStack(spacing: 6) {
                                                Image(systemName: "heart.fill")
                                                    .font(.title3)
                                                    .foregroundColor(heartRateColor)

                                                Text(workoutManager.formatHeartRate())
                                                    .font(.system(size: 44, weight: .bold, design: .rounded))
                                                    .foregroundColor(heartRateColor)

                                                Text("bpm")
                                                    .font(.caption)
                                                    .foregroundColor(.gray)

                                                // Zone bar
                                                HStack(spacing: 3) {
                                                                        ForEach(1...5, id: \.self) { zone in
                                                                                                                        VStack(spacing: 2) {
                                                                                                                                                        RoundedRectangle(cornerRadius: 2)
                                                                                                                                                            .fill(zone <= workoutManager.heartRateZone() ? zoneColor(zone) : Color.gray.opacity(0.2))
                                                                                                                                                            .frame(height: 8)
                                                                                                                                                        if zone == workoutManager.heartRateZone() {
                                                                                                                                                                                            Text("Z\(zone)")
                                                                                                                                                                                                .font(.system(size: 8, weight: .bold))
                                                                                                                                                                                                .foregroundColor(zoneColor(zone))
                                                                                                                                                        }
                                                                                                                        }
                                                                                                   }
                                                }
                                                .padding(.horizontal, 16)

                                                Text(workoutManager.heartRateZoneName())
                                                    .font(.caption2)
                                                    .foregroundColor(heartRateColor)

                                                Spacer()
                                                controlButtons
                            }
                            .padding(.horizontal, 6)
                            .padding(.top, 6)
            }

            // MARK: - Screen 3: Splits
            private var splitsScreen: some View {
                            VStack(spacing: 4) {
                                                HStack {
                                                                        Text("Splits")
                                                                            .font(.caption)
                                                                            .fontWeight(.bold)
                                                                            .foregroundColor(.white)
                                                                        Spacer()
                                                                        Text("Km \(workoutManager.currentKmSplit())")
                                                                            .font(.caption2)
                                                                            .foregroundColor(primaryColor)
                                                }
                                                .padding(.horizontal, 4)

                                                if workoutManager.splits.isEmpty {
                                                                        Spacer()
                                                                        VStack(spacing: 4) {
                                                                                                    Image(systemName: "flag.fill")
                                                                                                        .font(.title3)
                                                                                                        .foregroundColor(.gray)
                                                                                                    Text("Splits vises efter 1 km")
                                                                                                        .font(.caption2)
                                                                                                        .foregroundColor(.gray)
                                                                        }
                                                                        Spacer()
                                                } else {
                                                                        ScrollView {
                                                                                                    VStack(spacing: 3) {
                                                                                                                                    ForEach(workoutManager.splits) { split in
                                                                                                                                                                                                splitRowCompact(split: split)
                                                                                                                                                                   }
                                                                                                    }
                                                                        }
                                                }

                                                // Average pace at bottom
                                                if !workoutManager.splits.isEmpty {
                                                                        Divider().background(Color.gray.opacity(0.3))
                                                                        HStack {
                                                                                                    Text("Gns.")
                                                                                                        .font(.caption2)
                                                                                                        .foregroundColor(.gray)
                                                                                                    Spacer()
                                                                                                    Text(workoutManager.formatPace(workoutManager.averageSplitPace()))
                                                                                                        .font(.system(.caption, design: .rounded))
                                                                                                        .fontWeight(.bold)
                                                                                                        .foregroundColor(.cyan)
                                                                        }
                                                                        .padding(.horizontal, 4)
                                                }

                                                controlButtons
                            }
                            .padding(.horizontal, 6)
                            .padding(.top, 6)
            }

            // MARK: - Screen 4: Details
            private var detailsScreen: some View {
                            VStack(spacing: 5) {
                                                detailRow(icon: "gauge.medium", label: "Gns. Pace", value: workoutManager.formatPace(workoutManager.averagePace), color: .cyan)
                                                detailRow(icon: "flame.fill", label: "Kalorier", value: workoutManager.formatCalories() + " kcal", color: .orange)
                                                detailRow(icon: "shoeprints.fill", label: "Kadence", value: workoutManager.formatCadence() + " spm", color: .mint)
                                                detailRow(icon: "arrow.up.right", label: "Stigning", value: workoutManager.formatElevation(workoutManager.totalAscent), color: .green)
                                                detailRow(icon: "arrow.down.right", label: "Fald", value: workoutManager.formatElevation(workoutManager.totalDescent), color: .purple)

                                                Spacer()
                                                controlButtons
                            }
                            .padding(.horizontal, 6)
                            .padding(.top, 6)
            }

            // MARK: - Control Buttons
            private var controlButtons: some View {
                            HStack(spacing: 20) {
                                                Button(action: {
                                                                        if workoutManager.isPaused {
                                                                                                    workoutManager.resumeWorkout()
                                                                        } else {
                                                                                                    workoutManager.pauseWorkout()
                                                                        }
                                                }) {
                                                                        Image(systemName: workoutManager.isPaused ? "play.fill" : "pause.fill")
                                                                            .font(.body)
                                                                            .frame(width: 40, height: 40)
                                                                            .background(Color.orange)
                                                                            .foregroundColor(.white)
                                                                            .clipShape(Circle())
                                                }
                                                .buttonStyle(PlainButtonStyle())

                                                Button(action: {
                                                                        workoutManager.endWorkout()
                                                }) {
                                                                        Image(systemName: "stop.fill")
                                                                            .font(.body)
                                                                            .frame(width: 40, height: 40)
                                                                            .background(Color.red)
                                                                            .foregroundColor(.white)
                                                                            .clipShape(Circle())
                                                }
                                                .buttonStyle(PlainButtonStyle())
                            }
                            .padding(.bottom, 2)
            }

            // MARK: - Helper Views
            private func detailRow(icon: String, label: String, value: String, color: Color) -> some View {
                            HStack {
                                                Image(systemName: icon)
                                                    .font(.caption2)
                                                    .foregroundColor(color)
                                                    .frame(width: 16)
                                                Text(label)
                                                    .font(.caption2)
                                                    .foregroundColor(.gray)
                                                Spacer()
                                                Text(value)
                                                    .font(.system(.caption, design: .rounded))
                                                    .fontWeight(.semibold)
                                                    .foregroundColor(color)
                            }
            }

            private func splitRowCompact(split: KmSplit) -> some View {
                            let isFastest = workoutManager.fastestSplit()?.km == split.km
                            let isSlowest = workoutManager.slowestSplit()?.km == split.km && workoutManager.splits.count > 1

                            return HStack {
                                                Text("\(split.km)")
                                                    .font(.caption2)
                                                    .foregroundColor(.gray)
                                                    .frame(width: 20, alignment: .trailing)

                                                // Pace bar visualization
                                                let avgPace = workoutManager.averageSplitPace()
                                                let ratio = avgPace > 0 ? min(avgPace / split.pace, 1.5) : 1.0

                                                GeometryReader { geo in
                                                                                RoundedRectangle(cornerRadius: 2)
                                                                                    .fill(isFastest ? Color.green : (isSlowest ? Color.red : primaryColor))
                                                                                    .frame(width: geo.size.width * CGFloat(min(ratio, 1.0)))
                                                               }
                                                .frame(height: 10)

                                                Text(workoutManager.formatPace(split.pace))
                                                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                                                    .foregroundColor(isFastest ? .green : (isSlowest ? .red : .white))
                                                    .frame(width: 40, alignment: .trailing)
                            }
            }

            // MARK: - Colors
            private var heartRateColor: Color {
                            switch workoutManager.heartRateZone() {
                                            case 1: return .gray
                                            case 2: return .blue
                                            case 3: return .green
                                            case 4: return .orange
                                            case 5: return .red
                                            default: return .gray
                            }
            }

            private func zoneColor(_ zone: Int) -> Color {
                            switch zone {
                                            case 1: return .gray
                                            case 2: return .blue
                                            case 3: return .green
                                            case 4: return .orange
                                            case 5: return .red
                                            default: return .gray
                            }
            }
}
