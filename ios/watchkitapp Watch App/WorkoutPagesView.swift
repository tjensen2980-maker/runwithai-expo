import SwiftUI
import MapKit
import CoreLocation

struct WorkoutPagesView: View {
    @ObservedObject var workout: WorkoutManager
    @State private var showStopConfirm = false

    var body: some View {
        TabView {
            page1
            page2
            page3
            page4
        }
        .tabViewStyle(.page(indexDisplayMode: .always))
        .alert("Stop traening?", isPresented: $showStopConfirm) {
            Button("Stop", role: .destructive) { workout.stop() }
            Button("Fortsaet", role: .cancel) {}
        }
    }

    // MARK: Side 1 - Tid, Distance, Tempo
    private var page1: some View {
        VStack(spacing: 4) {
            Text(workout.formattedTime)
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundColor(.green)
            Text(workout.locationManager.formattedDistance)
                .font(.system(size: 30, weight: .heavy, design: .rounded))
                .monospacedDigit()
            Text("km")
                .font(.caption2)
                .foregroundColor(.gray)
            Text(workout.locationManager.formattedPace)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.cyan)
            Text("min/km")
                .font(.caption2)
                .foregroundColor(.gray)
            controlButtons
        }
        .padding(.horizontal, 8)
    }

    // MARK: Side 2 - Puls + Zone
    private var page2: some View {
        VStack(spacing: 4) {
            Text("BPM")
                .font(.caption2)
                .foregroundColor(.gray)
            Text("\(workout.currentBpm)")
                .font(.system(size: 48, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundColor(zoneColor(for: workout.currentBpm))
            Text(zoneLabel(for: workout.currentBpm))
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(zoneColor(for: workout.currentBpm))
            controlButtons
        }
        .padding(.horizontal, 8)
    }

    // MARK: Side 3 - Kadence, Kalorier, Hoejde
    private var page3: some View {
        VStack(spacing: 6) {
            HStack {
                metricBox(label: "SPM", value: "\(workout.currentSpm)", color: .blue)
                metricBox(label: "kcal", value: "\(Int(workout.activeKcal))", color: .orange)
            }
            VStack(spacing: 0) {
                Text("Hoejde")
                    .font(.caption2)
                    .foregroundColor(.gray)
                Text("+\(Int(workout.totalAscent))m")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.green)
                Text("-\(Int(workout.totalDescent))m")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.red)
            }
            controlButtons
        }
        .padding(.horizontal, 8)
    }

    // MARK: Side 4 - Map med rute
    private var page4: some View {
        ZStack(alignment: .bottom) {
            if workout.locationManager.route.isEmpty {
                VStack {
                    Image(systemName: "map")
                        .font(.system(size: 36))
                        .foregroundColor(.gray)
                    Text("Venter paa GPS")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Map {
                    MapPolyline(coordinates: workout.locationManager.route.map { $0.coordinate })
                        .stroke(.green, lineWidth: 3)
                }
            }
            controlButtons
                .padding(.bottom, 4)
        }
    }

    private var controlButtons: some View {
        HStack(spacing: 6) {
            if workout.isPaused {
                Button(action: { workout.resume() }) {
                    Image(systemName: "play.fill")
                        .font(.system(size: 14))
                        .frame(maxWidth: .infinity)
                }
                .tint(.green)
            } else {
                Button(action: { workout.pause() }) {
                    Image(systemName: "pause.fill")
                        .font(.system(size: 14))
                        .frame(maxWidth: .infinity)
                }
                .tint(.orange)
            }
            Button(action: { showStopConfirm = true }) {
                Image(systemName: "stop.fill")
                    .font(.system(size: 14))
                    .frame(maxWidth: .infinity)
            }
            .tint(.red)
        }
    }

    private func metricBox(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.gray)
            Text(value)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
    }

    private var maxHr: Double { 190.0 }

    private func zoneLabel(for bpm: Int) -> String {
        if bpm <= 0 { return "..." }
        let pct = Double(bpm) / maxHr
        switch pct {
        case ..<0.6: return "Z1 Let"
        case ..<0.7: return "Z2 Aerob"
        case ..<0.8: return "Z3 Tempo"
        case ..<0.9: return "Z4 Taerskel"
        default: return "Z5 Max"
        }
    }

    private func zoneColor(for bpm: Int) -> Color {
        if bpm <= 0 { return .gray }
        let pct = Double(bpm) / maxHr
        switch pct {
        case ..<0.6: return .blue
        case ..<0.7: return .green
        case ..<0.8: return .yellow
        case ..<0.9: return .orange
        default: return .red
        }
    }
}
