import Foundation
import SwiftUI

// MARK: - Interval Type
enum IntervalType: String, Codable {
      case warmup = "Opvarmning"
      case work = "Arbejde"
      case recovery = "Pause"
      case cooldown = "Nedvarmning"
      case steady = "Jævnt tempo"

      var color: Color {
                switch self {
                          case .warmup: return .yellow
                          case .work: return .red
                          case .recovery: return .green
                          case .cooldown: return .blue
                          case .steady: return .orange
                }
      }

      var icon: String {
                switch self {
                          case .warmup: return "flame"
                          case .work: return "bolt.fill"
                          case .recovery: return "leaf.fill"
                          case .cooldown: return "snowflake"
                          case .steady: return "figure.run"
                }
      }
}

// MARK: - Pace Target
enum PaceTarget {
      case none
      case paceRange(min: Double, max: Double) // seconds per km
      case heartRateZone(zone: Int)

      var description: String {
                switch self {
                          case .none: return "Frit tempo"
                          case .paceRange(let min, let max):
                              let minStr = formatPaceValue(min)
                              let maxStr = formatPaceValue(max)
                              return "\(minStr) - \(maxStr) /km"
                          case .heartRateZone(let zone):
                              return "Zone \(zone)"
                }
      }

      private func formatPaceValue(_ seconds: Double) -> String {
                let m = Int(seconds) / 60
                let s = Int(seconds) % 60
                return String(format: "%d:%02d", m, s)
      }
}

// MARK: - Training Interval
struct TrainingInterval: Identifiable {
      let id = UUID()
      let type: IntervalType
      let durationSeconds: Int? // nil = distance based
      let distanceMeters: Double? // nil = time based
      let paceTarget: PaceTarget
      let repeatCount: Int // for interval sets

      var displayDuration: String {
                if let seconds = durationSeconds {
                              let m = seconds / 60
                              let s = seconds % 60
                              if s == 0 { return "\(m) min" }
                              return "\(m):\(String(format: "%02d", s))"
                }
                if let meters = distanceMeters {
                              if meters >= 1000 {
                                                return String(format: "%.1f km", meters / 1000)
                              }
                              return "\(Int(meters)) m"
                }
                return ""
      }
}

// MARK: - Training Plan
struct TrainingPlan: Identifiable {
      let id = UUID()
      let name: String
      let description: String
      let icon: String
      let color: Color
      let category: TrainingCategory
      let intervals: [TrainingInterval]
      let estimatedMinutes: Int
      let difficulty: Int // 1-5

      var totalIntervalSteps: Int {
                intervals.reduce(0) { total, interval in
                                                 total + interval.repeatCount
                                    }
      }
}

// MARK: - Training Category
enum TrainingCategory: String, CaseIterable {
      case easy = "Let"
      case tempo = "Tempo"
      case interval = "Interval"
      case long = "Lang tur"
      case race = "Konkurrence"

      var icon: String {
                switch self {
                          case .easy: return "tortoise.fill"
                          case .tempo: return "gauge.medium"
                          case .interval: return "bolt.horizontal.fill"
                          case .long: return "road.lanes"
                          case .race: return "flag.checkered"
                }
      }
}

// MARK: - Built-in Training Plans
struct TrainingPlans {

      static let easyRun = TrainingPlan(
                name: "Let løb",
                description: "Afslappet tempo, byg base",
                icon: "tortoise.fill",
                color: .green,
                category: .easy,
                intervals: [
                              TrainingInterval(type: .warmup, durationSeconds: 300, distanceMeters: nil, paceTarget: .none, repeatCount: 1),
                              TrainingInterval(type: .steady, durationSeconds: 1800, distanceMeters: nil, paceTarget: .heartRateZone(zone: 2), repeatCount: 1),
                              TrainingInterval(type: .cooldown, durationSeconds: 300, distanceMeters: nil, paceTarget: .none, repeatCount: 1)
                ],
                estimatedMinutes: 40,
                difficulty: 1
      )

      static let tempoRun = TrainingPlan(
                name: "Tempo løb",
                description: "Vedvarende hurtigt tempo",
                icon: "gauge.medium",
                color: .orange,
                category: .tempo,
                intervals: [
                              TrainingInterval(type: .warmup, durationSeconds: 600, distanceMeters: nil, paceTarget: .none, repeatCount: 1),
                              TrainingInterval(type: .work, durationSeconds: 1200, distanceMeters: nil, paceTarget: .heartRateZone(zone: 4), repeatCount: 1),
                              TrainingInterval(type: .cooldown, durationSeconds: 600, distanceMeters: nil, paceTarget: .none, repeatCount: 1)
                ],
                estimatedMinutes: 40,
                difficulty: 3
      )

      static let interval5x1000 = TrainingPlan(
                name: "5 x 1000m",
                description: "Klassisk intervaltræning",
                icon: "bolt.horizontal.fill",
                color: .red,
                category: .interval,
                intervals: [
                              TrainingInterval(type: .warmup, durationSeconds: 600, distanceMeters: nil, paceTarget: .none, repeatCount: 1),
                              TrainingInterval(type: .work, durationSeconds: nil, distanceMeters: 1000, paceTarget: .paceRange(min: 240, max: 270), repeatCount: 5),
                              TrainingInterval(type: .recovery, durationSeconds: 120, distanceMeters: nil, paceTarget: .none, repeatCount: 5),
                              TrainingInterval(type: .cooldown, durationSeconds: 600, distanceMeters: nil, paceTarget: .none, repeatCount: 1)
                ],
                estimatedMinutes: 45,
                difficulty: 4
      )

      static let interval8x400 = TrainingPlan(
                name: "8 x 400m",
                description: "Hurtige korte intervaller",
                icon: "bolt.fill",
                color: .red,
                category: .interval,
                intervals: [
                              TrainingInterval(type: .warmup, durationSeconds: 600, distanceMeters: nil, paceTarget: .none, repeatCount: 1),
                              TrainingInterval(type: .work, durationSeconds: nil, distanceMeters: 400, paceTarget: .paceRange(min: 210, max: 240), repeatCount: 8),
                              TrainingInterval(type: .recovery, durationSeconds: 90, distanceMeters: nil, paceTarget: .none, repeatCount: 8),
                              TrainingInterval(type: .cooldown, durationSeconds: 600, distanceMeters: nil, paceTarget: .none, repeatCount: 1)
                ],
                estimatedMinutes: 40,
                difficulty: 4
      )

      static let longRun = TrainingPlan(
                name: "Lang tur",
                description: "Langsom distance, byg udholdenhed",
                icon: "road.lanes",
                color: .blue,
                category: .long,
                intervals: [
                              TrainingInterval(type: .warmup, durationSeconds: 600, distanceMeters: nil, paceTarget: .none, repeatCount: 1),
                              TrainingInterval(type: .steady, durationSeconds: 3600, distanceMeters: nil, paceTarget: .heartRateZone(zone: 2), repeatCount: 1),
                              TrainingInterval(type: .cooldown, durationSeconds: 300, distanceMeters: nil, paceTarget: .none, repeatCount: 1)
                ],
                estimatedMinutes: 70,
                difficulty: 3
      )

      static let fartlek = TrainingPlan(
                name: "Fartlek",
                description: "Legende fartvariationer",
                icon: "wind",
                color: .purple,
                category: .interval,
                intervals: [
                              TrainingInterval(type: .warmup, durationSeconds: 600, distanceMeters: nil, paceTarget: .none, repeatCount: 1),
                              TrainingInterval(type: .work, durationSeconds: 60, distanceMeters: nil, paceTarget: .heartRateZone(zone: 4), repeatCount: 6),
                              TrainingInterval(type: .recovery, durationSeconds: 120, distanceMeters: nil, paceTarget: .heartRateZone(zone: 2), repeatCount: 6),
                              TrainingInterval(type: .cooldown, durationSeconds: 600, distanceMeters: nil, paceTarget: .none, repeatCount: 1)
                ],
                estimatedMinutes: 35,
                difficulty: 3
      )

      static let racePrep5k = TrainingPlan(
                name: "5K Forberedelse",
                description: "Race-pace intervaller",
                icon: "flag.checkered",
                color: .yellow,
                category: .race,
                intervals: [
                              TrainingInterval(type: .warmup, durationSeconds: 600, distanceMeters: nil, paceTarget: .none, repeatCount: 1),
                              TrainingInterval(type: .work, durationSeconds: nil, distanceMeters: 1000, paceTarget: .paceRange(min: 240, max: 260), repeatCount: 3),
                              TrainingInterval(type: .recovery, durationSeconds: 180, distanceMeters: nil, paceTarget: .none, repeatCount: 3),
                              TrainingInterval(type: .work, durationSeconds: nil, distanceMeters: 400, paceTarget: .paceRange(min: 220, max: 240), repeatCount: 4),
                              TrainingInterval(type: .recovery, durationSeconds: 90, distanceMeters: nil, paceTarget: .none, repeatCount: 4),
                              TrainingInterval(type: .cooldown, durationSeconds: 600, distanceMeters: nil, paceTarget: .none, repeatCount: 1)
                ],
                estimatedMinutes: 45,
                difficulty: 5
      )

      static let freeRun = TrainingPlan(
                name: "Frit løb",
                description: "Løb uden plan, bare nyd det",
                icon: "figure.run",
                color: Color(red: 0.3, green: 0.7, blue: 0.4),
                category: .easy,
                intervals: [],
                estimatedMinutes: 0,
                difficulty: 0
      )

      static let allPlans: [TrainingPlan] = [
                freeRun, easyRun, tempoRun, interval5x1000, interval8x400, fartlek, longRun, racePrep5k
      ]

      static func plans(for category: TrainingCategory) -> [TrainingPlan] {
                allPlans.filter { $0.category == category }
      }
}
