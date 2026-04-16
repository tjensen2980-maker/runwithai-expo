import Foundation
import HealthKit
import CoreLocation
import WatchConnectivity

class WorkoutManager: NSObject, ObservableObject {
      static let shared = WorkoutManager()

      // MARK: - HealthKit
      let healthStore = HKHealthStore()
      private var workoutSession: HKWorkoutSession?
      private var workoutBuilder: HKLiveWorkoutBuilder?

      // MARK: - Location
      private let locationManager = CLLocationManager()
      private var routeBuilder: HKWorkoutRouteBuilder?

      // MARK: - Published Properties
      @Published var isRunning = false
      @Published var isPaused = false
      @Published var heartRate: Double = 0
      @Published var activeCalories: Double = 0
      @Published var totalCalories: Double = 0
      @Published var distance: Double = 0
      @Published var elapsedSeconds: Int = 0
      @Published var currentPace: Double = 0  // seconds per km
      @Published var averagePace: Double = 0  // seconds per km
      @Published var currentCadence: Double = 0
      @Published var autoPaused = false
      @Published var hasLocationPermission = false
      @Published var hasHealthPermission = false

      // MARK: - Private Properties
      private var timer: Timer?
      private var startDate: Date?
      private var pauseDate: Date?
      private var totalPausedTime: TimeInterval = 0
      private var lastLocations: [CLLocation] = []
      private var splitDistances: [Double] = []
      private var lastKmDistance: Double = 0

      // Auto-pause
      private var autoPauseEnabled = true
      private var lastMovementDate = Date()
      private let autoPauseSpeedThreshold: Double = 0.5 // m/s

      override init() {
                super.init()
                locationManager.delegate = self
                locationManager.desiredAccuracy = kCLLocationAccuracyBest
                locationManager.activityType = .fitness
      }

      // MARK: - Permissions
      func requestPermissions() {
                requestHealthKitPermissions()
                requestLocationPermissions()
      }

      private func requestHealthKitPermissions() {
                let typesToShare: Set<HKSampleType> = [
                              HKObjectType.workoutType()
                ]

                let typesToRead: Set<HKObjectType> = [
                              HKObjectType.quantityType(forIdentifier: .heartRate)!,
                              HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
                              HKObjectType.quantityType(forIdentifier: .basalEnergyBurned)!,
                              HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
                              HKObjectType.quantityType(forIdentifier: .stepCount)!,
                              HKObjectType.workoutType()
                ]

                healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { success, error in
                                                                                                        DispatchQueue.main.async {
                                                                                                                          self.hasHealthPermission = success
                                                                                                        }
                                                                                           }
      }

      private func requestLocationPermissions() {
                locationManager.requestWhenInUseAuthorization()
      }

      // MARK: - Workout Control
      func startWorkout() {
                let configuration = HKWorkoutConfiguration()
                configuration.activityType = .running
                configuration.locationType = .outdoor

                do {
                              workoutSession = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
                              workoutBuilder = workoutSession?.associatedWorkoutBuilder()

                              workoutSession?.delegate = self
                              workoutBuilder?.delegate = self

                              workoutBuilder?.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: configuration)

                              routeBuilder = HKWorkoutRouteBuilder(healthStore: healthStore, device: nil)

                              let startDate = Date()
                              self.startDate = startDate

                              workoutSession?.startActivity(with: startDate)
                              workoutBuilder?.beginCollection(withStart: startDate) { success, error in
                                                                                                     if success {
                                                                                                                           DispatchQueue.main.async {
                                                                                                                                                     self.isRunning = true
                                                                                                                                                     self.isPaused = false
                                                                                                                                                     self.startTimer()
                                                                                                                                                     self.locationManager.startUpdatingLocation()
                                                                                                                           }
                                                                                                     }
                                                                                    }
                } catch {
                              print("Failed to start workout: \(error.localizedDescription)")
                }
      }

      func pauseWorkout() {
                workoutSession?.pause()
                pauseDate = Date()
                DispatchQueue.main.async {
                              self.isPaused = true
                }
                stopTimer()
      }

      func resumeWorkout() {
                workoutSession?.resume()
                if let pauseDate = pauseDate {
                              totalPausedTime += Date().timeIntervalSince(pauseDate)
                }
                self.pauseDate = nil
                DispatchQueue.main.async {
                              self.isPaused = false
                              self.autoPaused = false
                }
                startTimer()
      }

      func endWorkout() {
                locationManager.stopUpdatingLocation()
                stopTimer()

                workoutSession?.end()
                workoutBuilder?.endCollection(withEnd: Date()) { success, error in
                                                                            if success {
                                                                                              self.workoutBuilder?.finishWorkout { workout, error in
                                                                                                                                                      if let workout = workout, let routeBuilder = self.routeBuilder {
                                                                                                                                                                                routeBuilder.finishRoute(with: workout, metadata: nil) { route, error in
                                                                                                                                                                                                                                                                    // Route saved
                                                                                                                                                                                                                                                                }
                                                                                                                                                      }
                                                                                                                                                      DispatchQueue.main.async {
                                                                                                                                                                                self.isRunning = false
                                                                                                                                                                                self.isPaused = false
                                                                                                                                                                                self.sendWorkoutSummaryToPhone()
                                                                                                                                                      }
                                                                                                                                 }
                                                                            }
                                                               }
      }

      // MARK: - Timer
      private func startTimer() {
                timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
                                                                                              guard let self = self else { return }
                                                                                              if let startDate = self.startDate {
                                                                                                                let elapsed = Date().timeIntervalSince(startDate) - self.totalPausedTime
                                                                                                                DispatchQueue.main.async {
                                                                                                                                      self.elapsedSeconds = Int(elapsed)
                                                                                                                }
                                                                                              }
                                                                                 }
      }

      private func stopTimer() {
                timer?.invalidate()
                timer = nil
      }

      // MARK: - Auto Pause
      private func checkAutoPause(speed: Double) {
                guard autoPauseEnabled, isRunning else { return }

                if speed < autoPauseSpeedThreshold {
                              if !autoPaused && !isPaused {
                                                let timeSinceLastMovement = Date().timeIntervalSince(lastMovementDate)
                                                if timeSinceLastMovement > 3.0 {
                                                                      DispatchQueue.main.async {
                                                                                                self.autoPaused = true
                                                                      }
                                                                      pauseWorkout()
                                                }
                              }
                } else {
                              lastMovementDate = Date()
                              if autoPaused {
                                                resumeWorkout()
                              }
                }
      }

      // MARK: - Formatting Helpers
      func formatPace(_ secondsPerKm: Double) -> String {
                guard secondsPerKm > 0, !secondsPerKm.isInfinite, !secondsPerKm.isNaN else { return "--:--" }
                let minutes = Int(secondsPerKm) / 60
                let seconds = Int(secondsPerKm) % 60
                return String(format: "%d:%02d", minutes, seconds)
      }

      func formatDuration(_ totalSeconds: Int) -> String {
                let hours = totalSeconds / 3600
                let minutes = (totalSeconds % 3600) / 60
                let seconds = totalSeconds % 60
                if hours > 0 {
                              return String(format: "%d:%02d:%02d", hours, minutes, seconds)
                }
                return String(format: "%02d:%02d", minutes, seconds)
      }

      func formatDistance(_ meters: Double) -> String {
                return String(format: "%.2f", meters / 1000)
      }

      func formatHeartRate() -> String {
                return heartRate > 0 ? "\(Int(heartRate))" : "--"
      }

      func formatCalories() -> String {
                return "\(Int(activeCalories))"
      }

      // MARK: - Heart Rate Zone
      func heartRateZone() -> Int {
                // Based on typical max HR of 190 (should be configurable)
                let maxHR = 190.0
                let percentage = heartRate / maxHR
                switch percentage {
                          case ..<0.6: return 1
                          case 0.6..<0.7: return 2
                          case 0.7..<0.8: return 3
                          case 0.8..<0.9: return 4
                          default: return 5
                }
      }

      func heartRateZoneColor() -> String {
                switch heartRateZone() {
                          case 1: return "gray"
                          case 2: return "blue"
                          case 3: return "green"
                          case 4: return "orange"
                          case 5: return "red"
                          default: return "gray"
                }
      }

      // MARK: - Splits
      func currentKmSplit() -> Int {
                return Int(distance / 1000) + 1
      }

      func checkKmSplit() {
                let currentKm = floor(distance / 1000)
                let lastKm = floor(lastKmDistance / 1000)
                if currentKm > lastKm && currentKm > 0 {
                              splitDistances.append(distance)
                              // Haptic feedback for km split
                              WKInterfaceDevice.current().play(.notification)
                }
                lastKmDistance = distance
      }

      // MARK: - Phone Communication
      private func sendWorkoutSummaryToPhone() {
                guard WCSession.default.isReachable else { return }

                let summary: [String: Any] = [
                              "type": "WORKOUT_COMPLETE",
                              "distance": distance,
                              "duration": elapsedSeconds,
                              "calories": activeCalories,
                              "avgHeartRate": heartRate,
                              "avgPace": averagePace,
                              "timestamp": Date().timeIntervalSince1970
                ]

                WCSession.default.sendMessage(summary, replyHandler: nil, errorHandler: nil)
      }

      func sendLiveDataToPhone() {
                guard WCSession.default.isReachable else { return }

                let data: [String: Any] = [
                              "type": "LIVE_UPDATE",
                              "distance": distance,
                              "duration": elapsedSeconds,
                              "heartRate": Int(heartRate),
                              "pace": formatPace(currentPace),
                              "calories": Int(activeCalories),
                              "isRunning": isRunning
                ]

                WCSession.default.sendMessage(data, replyHandler: nil, errorHandler: nil)
      }
}

// MARK: - HKWorkoutSessionDelegate
extension WorkoutManager: HKWorkoutSessionDelegate {
      func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
                // State changes handled in control methods
      }

      func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
                print("Workout session failed: \(error.localizedDescription)")
      }
}

// MARK: - HKLiveWorkoutBuilderDelegate
extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
      func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {
                // Handle workout events
      }

      func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
                for type in collectedTypes {
                              guard let quantityType = type as? HKQuantityType else { continue }

                              let statistics = workoutBuilder.statistics(for: quantityType)

                              DispatchQueue.main.async {
                                                switch quantityType {
                                                                  case HKQuantityType.quantityType(forIdentifier: .heartRate):
                                                                      let heartRateUnit = HKUnit.count().unitDivided(by: .minute())
                                                                      self.heartRate = statistics?.mostRecentQuantity()?.doubleValue(for: heartRateUnit) ?? 0

                                                                  case HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned):
                                                                      let energyUnit = HKUnit.kilocalorie()
                                                                      self.activeCalories = statistics?.sumQuantity()?.doubleValue(for: energyUnit) ?? 0

                                                                  case HKQuantityType.quantityType(forIdentifier: .basalEnergyBurned):
                                                                      let energyUnit = HKUnit.kilocalorie()
                                                                      self.totalCalories = self.activeCalories + (statistics?.sumQuantity()?.doubleValue(for: energyUnit) ?? 0)

                                                                  case HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning):
                                                                      let meterUnit = HKUnit.meter()
                                                                      self.distance = statistics?.sumQuantity()?.doubleValue(for: meterUnit) ?? 0

                                                                      // Calculate average pace
                                                                      if self.distance > 0 && self.elapsedSeconds > 0 {
                                                                                                self.averagePace = (Double(self.elapsedSeconds) / self.distance) * 1000
                                                                      }

                                                                      // Check km splits
                                                                      self.checkKmSplit()

                                                                      // Send live data to phone
                                                                      self.sendLiveDataToPhone()

                                                                  default:
                                                                      break
                                                }
                              }
                }
      }
}

// MARK: - CLLocationManagerDelegate
extension WorkoutManager: CLLocationManagerDelegate {
      func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
                guard isRunning else { return }

                let filteredLocations = locations.filter { $0.horizontalAccuracy < 20 }

                guard !filteredLocations.isEmpty else { return }

                // Add to route
                routeBuilder?.insertRouteData(filteredLocations) { success, error in
                                                                              // Route data inserted
                                                                 }

                // Calculate current pace from recent locations
                if let latest = filteredLocations.last {
                              if let previous = lastLocations.last {
                                                let timeDiff = latest.timestamp.timeIntervalSince(previous.timestamp)
                                                let distDiff = latest.distance(from: previous)

                                                if timeDiff > 0 && distDiff > 0 {
                                                                      let speed = distDiff / timeDiff // m/s
                                                                      DispatchQueue.main.async {
                                                                                                self.currentPace = 1000.0 / speed // seconds per km
                                                                      }

                                                                      // Check auto-pause
                                                                      checkAutoPause(speed: speed)
                                                }
                              }
                }

                lastLocations = Array(filteredLocations.suffix(5))
      }

      func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
                DispatchQueue.main.async {
                              self.hasLocationPermission = (manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways)
                }
      }
}
