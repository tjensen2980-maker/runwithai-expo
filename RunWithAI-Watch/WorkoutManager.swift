import Foundation
import HealthKit
import CoreLocation
import WatchConnectivity
import WatchKit

// MARK: - Split Data Model
struct KmSplit: Identifiable {
          let id = UUID()
          let km: Int
          let pace: Double // seconds per km
          let time: Int // elapsed seconds at this km
          let heartRate: Double // avg HR during this km
}

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
          @Published var currentPace: Double = 0
          @Published var averagePace: Double = 0
          @Published var currentCadence: Double = 0
          @Published var autoPaused = false
          @Published var hasLocationPermission = false
          @Published var hasHealthPermission = false

          // MARK: - Splits
          @Published var splits: [KmSplit] = []
          @Published var currentKmStartTime: Int = 0
          @Published var currentKmStartDistance: Double = 0
          @Published var currentKmHRSamples: [Double] = []

          // MARK: - Pace smoothing
          @Published var recentPaces: [Double] = []
          @Published var smoothedPace: Double = 0

          // MARK: - Elevation
          @Published var totalAscent: Double = 0
          @Published var totalDescent: Double = 0
          @Published var currentAltitude: Double = 0

          // MARK: - Workout complete flag
          @Published var workoutCompleted = false
          @Published var showSummary = false

          // MARK: - Step counting
          @Published var totalSteps: Int = 0
          private var stepCountAnchor: HKQueryAnchor?
          private var stepQuery: HKAnchoredObjectQuery?

          // MARK: - Private Properties
          private var timer: Timer?
          private var startDate: Date?
          private var pauseDate: Date?
          private var totalPausedTime: TimeInterval = 0
          private var lastLocations: [CLLocation] = []
          private var lastKmDistance: Double = 0
          private var previousAltitude: Double?

          // Auto-pause
          private var autoPauseEnabled = true
          private var lastMovementDate = Date()
          private let autoPauseSpeedThreshold: Double = 0.5

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
                                          HKObjectType.quantityType(forIdentifier: .runningSpeed)!,
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
                        resetWorkoutData()

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
                                                                                                                                                                         self.workoutCompleted = false
                                                                                                                                                                         self.showSummary = false
                                                                                                                                                                         self.startTimer()
                                                                                                                                                                         self.locationManager.startUpdatingLocation()
                                                                                                                                                                         self.startStepCounting()
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
                        stopStepCounting()

                        // Record final split if needed
                        recordPartialSplit()

                        workoutSession?.end()
                        workoutBuilder?.endCollection(withEnd: Date()) { success, error in
                                                                                    if success {
                                                                                                          self.workoutBuilder?.finishWorkout { workout, error in
                                                                                                                                                                  if let workout = workout, let routeBuilder = self.routeBuilder {
                                                                                                                                                                                                routeBuilder.finishRoute(with: workout, metadata: nil) { route, error in }
                                                                                                                                                                  }
                                                                                                                                                                  DispatchQueue.main.async {
                                                                                                                                                                                                self.isRunning = false
                                                                                                                                                                                                self.isPaused = false
                                                                                                                                                                                                self.workoutCompleted = true
                                                                                                                                                                                                self.showSummary = true
                                                                                                                                                                                                self.sendWorkoutSummaryToPhone()
                                                                                                                                                                  }
                                                                                                                                             }
                                                                                    }
                                                                       }
          }

          private func resetWorkoutData() {
                        elapsedSeconds = 0
                        heartRate = 0
                        activeCalories = 0
                        totalCalories = 0
                        distance = 0
                        currentPace = 0
                        averagePace = 0
                        currentCadence = 0
                        splits = []
                        currentKmStartTime = 0
                        currentKmStartDistance = 0
                        currentKmHRSamples = []
                        recentPaces = []
                        smoothedPace = 0
                        totalAscent = 0
                        totalDescent = 0
                        totalSteps = 0
                        totalPausedTime = 0
                        lastKmDistance = 0
                        lastLocations = []
                        previousAltitude = nil
                        autoPaused = false
                        workoutCompleted = false
                        showSummary = false
          }

          // MARK: - Timer
          private func startTimer() {
                        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
                                                                                                      guard let self = self else { return }
                                                                                                      if let startDate = self.startDate {
                                                                                                                            let elapsed = Date().timeIntervalSince(startDate) - self.totalPausedTime
                                                                                                                            DispatchQueue.main.async {
                                                                                                                                                      self.elapsedSeconds = Int(elapsed)
                                                                                                                                                      self.updateCadence()
                                                                                                                            }
                                                                                                      }
                                                                                         }
          }

          private func stopTimer() {
                        timer?.invalidate()
                        timer = nil
          }

          // MARK: - Step Counting & Cadence
          private func startStepCounting() {
                        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }

                        let query = HKAnchoredObjectQuery(
                                          type: stepType,
                                          predicate: HKQuery.predicateForSamples(withStart: startDate, end: nil),
                                          anchor: stepCountAnchor,
                                          limit: HKObjectQueryNoLimit
                        ) { [weak self] query, samples, deleted, anchor, error in
                                       self?.processStepSamples(samples)
                                       self?.stepCountAnchor = anchor
                          }

                        query.updateHandler = { [weak self] query, samples, deleted, anchor, error in
                                                           self?.processStepSamples(samples)
                                                           self?.stepCountAnchor = anchor
                                              }

                        stepQuery = query
                        healthStore.execute(query)
          }

          private func stopStepCounting() {
                        if let query = stepQuery {
                                          healthStore.stop(query)
                        }
          }

          private func processStepSamples(_ samples: [HKSample]?) {
                        guard let samples = samples as? [HKQuantitySample] else { return }
                        let steps = samples.reduce(0) { $0 + Int($1.quantity.doubleValue(for: .count())) }
                        DispatchQueue.main.async {
                                          self.totalSteps += steps
                        }
          }

          private func updateCadence() {
                        guard elapsedSeconds > 0, totalSteps > 0 else { return }
                        // Steps per minute (cadence = steps/min, running usually shows both feet)
                        currentCadence = Double(totalSteps) / (Double(elapsedSeconds) / 60.0)
          }

          // MARK: - Auto Pause
          private func checkAutoPause(speed: Double) {
                        guard autoPauseEnabled, isRunning else { return }

                        if speed < autoPauseSpeedThreshold {
                                          if !autoPaused && !isPaused {
                                                                let timeSinceLastMovement = Date().timeIntervalSince(lastMovementDate)
                                                                if timeSinceLastMovement > 3.0 {
                                                                                          DispatchQueue.main.async { self.autoPaused = true }
                                                                                          pauseWorkout()
                                                                                          WKInterfaceDevice.current().play(.stop)
                                                                }
                                          }
                        } else {
                                          lastMovementDate = Date()
                                          if autoPaused {
                                                                resumeWorkout()
                                                                WKInterfaceDevice.current().play(.start)
                                          }
                        }
          }

          // MARK: - Splits Management
          func checkKmSplit() {
                        let currentKm = Int(floor(distance / 1000))
                        let previousKm = splits.count

                        if currentKm > previousKm && currentKm > 0 {
                                          let splitTime = elapsedSeconds - currentKmStartTime
                                          let splitDistance = distance - currentKmStartDistance
                                          let splitPace = splitDistance > 0 ? (Double(splitTime) / splitDistance) * 1000 : 0
                                          let avgHR = currentKmHRSamples.isEmpty ? heartRate : currentKmHRSamples.reduce(0, +) / Double(currentKmHRSamples.count)

                                          let split = KmSplit(
                                                                km: currentKm,
                                                                pace: splitPace,
                                                                time: elapsedSeconds,
                                                                heartRate: avgHR
                                          )

                                          splits.append(split)

                                          // Reset for next km
                                          currentKmStartTime = elapsedSeconds
                                          currentKmStartDistance = distance
                                          currentKmHRSamples = []

                                          // Haptic feedback
                                          WKInterfaceDevice.current().play(.notification)
                        }

                        // Track HR samples for current km
                        if heartRate > 0 {
                                          currentKmHRSamples.append(heartRate)
                        }
          }

          private func recordPartialSplit() {
                        let currentKm = splits.count + 1
                        let splitTime = elapsedSeconds - currentKmStartTime
                        let splitDistance = distance - currentKmStartDistance

                        guard splitDistance > 50 else { return } // Minimum 50m

                        let splitPace = splitDistance > 0 ? (Double(splitTime) / splitDistance) * 1000 : 0
                        let avgHR = currentKmHRSamples.isEmpty ? heartRate : currentKmHRSamples.reduce(0, +) / Double(currentKmHRSamples.count)

                        let split = KmSplit(
                                          km: currentKm,
                                          pace: splitPace,
                                          time: elapsedSeconds,
                                          heartRate: avgHR
                        )
                        splits.append(split)
          }

          // MARK: - Pace Smoothing
          private func updateSmoothedPace(_ rawPace: Double) {
                        guard rawPace > 0, !rawPace.isInfinite, !rawPace.isNaN else { return }
                        guard rawPace > 120 && rawPace < 1200 else { return } // 2min/km to 20min/km range

                        recentPaces.append(rawPace)
                        if recentPaces.count > 5 {
                                          recentPaces.removeFirst()
                        }

                        smoothedPace = recentPaces.reduce(0, +) / Double(recentPaces.count)
          }

          // MARK: - Formatting Helpers
          func formatPace(_ secondsPerKm: Double) -> String {
                        guard secondsPerKm > 0, !secondsPerKm.isInfinite, !secondsPerKm.isNaN else { return "--:--" }
                        let clamped = min(secondsPerKm, 5999)
                        let minutes = Int(clamped) / 60
                        let seconds = Int(clamped) % 60
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

          func formatCadence() -> String {
                        return currentCadence > 0 ? "\(Int(currentCadence))" : "--"
          }

          func formatElevation(_ meters: Double) -> String {
                        return String(format: "%.0f m", meters)
          }

          // MARK: - Heart Rate Zone
          func heartRateZone() -> Int {
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

          func heartRateZoneName() -> String {
                        switch heartRateZone() {
                                      case 1: return "Let"
                                      case 2: return "Moderat"
                                      case 3: return "Aerob"
                                      case 4: return "Anaerob"
                                      case 5: return "Maks"
                                      default: return ""
                        }
          }

          // MARK: - Splits helpers
          func currentKmSplit() -> Int {
                        return Int(distance / 1000) + 1
          }

          func fastestSplit() -> KmSplit? {
                        return splits.min(by: { $0.pace < $1.pace })
          }

          func slowestSplit() -> KmSplit? {
                        return splits.max(by: { $0.pace < $1.pace })
          }

          func averageSplitPace() -> Double {
                        guard !splits.isEmpty else { return 0 }
                        return splits.map { $0.pace }.reduce(0, +) / Double(splits.count)
          }

          // MARK: - Phone Communication
          private func sendWorkoutSummaryToPhone() {
                        guard WCSession.default.isReachable else { return }

                        let splitData = splits.map { split -> [String: Any] in
                                                                return [
                                                                                      "km": split.km,
                                                                                      "pace": split.pace,
                                                                                      "time": split.time,
                                                                                      "heartRate": split.heartRate
                                                                ]
                                                   }

                        let summary: [String: Any] = [
                                          "type": "WORKOUT_COMPLETE",
                                          "distance": distance,
                                          "duration": elapsedSeconds,
                                          "calories": activeCalories,
                                          "avgHeartRate": heartRate,
                                          "avgPace": averagePace,
                                          "totalSteps": totalSteps,
                                          "cadence": currentCadence,
                                          "totalAscent": totalAscent,
                                          "splits": splitData,
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
                                          "pace": formatPace(smoothedPace > 0 ? smoothedPace : currentPace),
                                          "calories": Int(activeCalories),
                                          "cadence": Int(currentCadence),
                                          "isRunning": isRunning
                        ]

                        WCSession.default.sendMessage(data, replyHandler: nil, errorHandler: nil)
          }
}

// MARK: - HKWorkoutSessionDelegate
extension WorkoutManager: HKWorkoutSessionDelegate {
          func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {}

          func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
                        print("Workout session failed: \(error.localizedDescription)")
          }
}

// MARK: - HKLiveWorkoutBuilderDelegate
extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
          func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

          func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
                        for type in collectedTypes {
                                          guard let quantityType = type as? HKQuantityType else { continue }
                                          let statistics = workoutBuilder.statistics(for: quantityType)

                                          DispatchQueue.main.async {
                                                                switch quantityType {
                                                                                      case HKQuantityType.quantityType(forIdentifier: .heartRate):
                                                                                          let unit = HKUnit.count().unitDivided(by: .minute())
                                                                                          self.heartRate = statistics?.mostRecentQuantity()?.doubleValue(for: unit) ?? 0

                                                                                      case HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned):
                                                                                          self.activeCalories = statistics?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0

                                                                                      case HKQuantityType.quantityType(forIdentifier: .basalEnergyBurned):
                                                                                          self.totalCalories = self.activeCalories + (statistics?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0)

                                                                                      case HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning):
                                                                                          self.distance = statistics?.sumQuantity()?.doubleValue(for: .meter()) ?? 0

                                                                                          if self.distance > 0 && self.elapsedSeconds > 0 {
                                                                                                                        self.averagePace = (Double(self.elapsedSeconds) / self.distance) * 1000
                                                                                          }

                                                                                          self.checkKmSplit()
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

                        routeBuilder?.insertRouteData(filteredLocations) { _, _ in }

                        // Elevation tracking
                        if let latest = filteredLocations.last {
                                          let altitude = latest.altitude
                                          if let prev = previousAltitude {
                                                                let diff = altitude - prev
                                                                if diff > 0 {
                                                                                          DispatchQueue.main.async { self.totalAscent += diff }
                                                                } else {
                                                                                          DispatchQueue.main.async { self.totalDescent += abs(diff) }
                                                                }
                                          }
                                          previousAltitude = altitude
                                          DispatchQueue.main.async { self.currentAltitude = altitude }
                        }

                        // Current pace from GPS
                        if let latest = filteredLocations.last, let previous = lastLocations.last {
                                          let timeDiff = latest.timestamp.timeIntervalSince(previous.timestamp)
                                          let distDiff = latest.distance(from: previous)

                                          if timeDiff > 0 && distDiff > 0 {
                                                                let speed = distDiff / timeDiff
                                                                let rawPace = 1000.0 / speed
                                                                DispatchQueue.main.async {
                                                                                          self.currentPace = rawPace
                                                                                          self.updateSmoothedPace(rawPace)
                                                                }
                                                                checkAutoPause(speed: speed)
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
