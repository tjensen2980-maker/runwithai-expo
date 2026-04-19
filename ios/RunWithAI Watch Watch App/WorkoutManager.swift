// WorkoutManager.swift – ios/RunWithAI Watch Watch App
// Synkroniseret med RunWithAI-Watch/WorkoutManager.swift
// Inkluderer PaceStatus (Garmin-style), requestHealthKitAuthorization alias,
// korrekt distance i meter til sendWorkoutSummaryToPhone.

import Foundation
import HealthKit
import CoreLocation
import WatchConnectivity
import WatchKit

// MARK: - Split Data Model
struct KmSplit: Identifiable {
        let id = UUID()
        let km: Int
        let pace: Double
        let time: Int
        let heartRate: Double
}

// MARK: - Pace Status (Garmin-style)
enum PaceStatus {
        case tooFast, onTarget, tooSlow, noTarget
        var icon: String {
                    switch self {
                                case .tooFast:  return "arrow.up.circle.fill"
                                case .onTarget: return "checkmark.circle.fill"
                                case .tooSlow:  return "arrow.down.circle.fill"
                                case .noTarget: return ""
                    }
        }
        var label: String {
                    switch self {
                                case .tooFast:  return "For hurtigt"
                                case .onTarget: return "I mål-tempo"
                                case .tooSlow:  return "For langsomt"
                                case .noTarget: return ""
                    }
        }
}

class WorkoutManager: NSObject, ObservableObject {
        static let shared = WorkoutManager()

        let healthStore = HKHealthStore()
        private var workoutSession: HKWorkoutSession?
        private var workoutBuilder: HKLiveWorkoutBuilder?
        private let locationManager = CLLocationManager()
        private var routeBuilder: HKWorkoutRouteBuilder?

        @Published var isRunning = false
        @Published var isPaused = false
        @Published var heartRate: Double = 0
        @Published var activeCalories: Double = 0
        @Published var totalCalories: Double = 0
        @Published var distance: Double = 0          // meters
        @Published var elapsedSeconds: Int = 0
        @Published var currentPace: Double = 0
        @Published var averagePace: Double = 0
        @Published var currentCadence: Double = 0
        @Published var autoPaused = false
        @Published var hasLocationPermission = false
        @Published var hasHealthPermission = false
        @Published var splits: [KmSplit] = []
        @Published var currentKmStartTime: Int = 0
        @Published var currentKmStartDistance: Double = 0
        @Published var currentKmHRSamples: [Double] = []
        @Published var recentPaces: [Double] = []
        @Published var smoothedPace: Double = 0
        @Published var totalAscent: Double = 0
        @Published var totalDescent: Double = 0
        @Published var currentAltitude: Double = 0
        @Published var workoutCompleted = false
        @Published var showSummary = false
        @Published var totalSteps: Int = 0
        @Published var targetPaceMin: Double = 0
        @Published var targetPaceMax: Double = 0
        @Published var paceStatus: PaceStatus = .noTarget
        @Published var targetPaceLabel: String = ""

        private var timer: Timer?
        private var startDate: Date?
        private var pauseDate: Date?
        private var totalPausedTime: TimeInterval = 0
        private var lastLocations: [CLLocation] = []
        private var previousAltitude: Double?
        private var stepCountAnchor: HKQueryAnchor?
        private var stepQuery: HKAnchoredObjectQuery?
        private var autoPauseEnabled = true
        private var lastMovementDate = Date()
        private let autoPauseSpeedThreshold: Double = 0.3

        override init() {
                    super.init()
                    locationManager.delegate = self
                    locationManager.desiredAccuracy = kCLLocationAccuracyBest
                    locationManager.activityType = .fitness
        }

        func requestPermissions() {
                    let typesToShare: Set<HKSampleType> = [HKObjectType.workoutType()]
                    let typesToRead: Set<HKObjectType> = [
                                    HKObjectType.quantityType(forIdentifier: .heartRate)!,
                                    HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
                                    HKObjectType.quantityType(forIdentifier: .basalEnergyBurned)!,
                                    HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
                                    HKObjectType.quantityType(forIdentifier: .stepCount)!,
                                    HKObjectType.quantityType(forIdentifier: .runningSpeed)!,
                                    HKObjectType.workoutType()
                    ]
                    healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { success, _ in
                                                                                                            DispatchQueue.main.async { self.hasHealthPermission = success }
                                                                                               }
                    locationManager.requestWhenInUseAuthorization()
        }

        func requestHealthKitAuthorization() { requestPermissions() }

        func setTargetPace(minPace: Double, maxPace: Double, label: String = "") {
                    targetPaceMin = minPace
                    targetPaceMax = maxPace
                    targetPaceLabel = label
        }

        private func updatePaceStatus() {
                    guard targetPaceMax > 0, smoothedPace > 0 else { paceStatus = .noTarget; return }
                    let tolerance = 10.0
                    if smoothedPace < targetPaceMin - tolerance { paceStatus = .tooFast }
                    else if smoothedPace > targetPaceMax + tolerance { paceStatus = .tooSlow }
                    else { paceStatus = .onTarget }
        }

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
                                    workoutBuilder?.beginCollection(withStart: startDate) { success, _ in
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
                    } catch { print("Failed to start workout: \(error)") }
        }

        func pauseWorkout() {
                    workoutSession?.pause()
                    pauseDate = Date()
                    DispatchQueue.main.async { self.isPaused = true }
                    stopTimer()
        }

        func resumeWorkout() {
                    workoutSession?.resume()
                    if let pd = pauseDate { totalPausedTime += Date().timeIntervalSince(pd) }
                    pauseDate = nil
                    DispatchQueue.main.async { self.isPaused = false; self.autoPaused = false }
                    startTimer()
        }

        func endWorkout() {
                    locationManager.stopUpdatingLocation()
                    stopTimer()
                    stopStepCounting()
                    recordPartialSplit()
                    workoutSession?.end()
                    workoutBuilder?.endCollection(withEnd: Date()) { success, _ in
                                                                                if success {
                                                                                                    self.workoutBuilder?.finishWorkout { workout, _ in
                                                                                                                                                            if let workout = workout, let rb = self.routeBuilder {
                                                                                                                                                                                        rb.finishRoute(with: workout, metadata: nil) { _, _ in }
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
                    elapsedSeconds = 0; heartRate = 0; activeCalories = 0; totalCalories = 0
                    distance = 0; currentPace = 0; averagePace = 0; currentCadence = 0
                    splits = []; currentKmStartTime = 0; currentKmStartDistance = 0; currentKmHRSamples = []
                    recentPaces = []; smoothedPace = 0; totalAscent = 0; totalDescent = 0
                    totalSteps = 0; totalPausedTime = 0; lastLocations = []; previousAltitude = nil
                    autoPaused = false; workoutCompleted = false; showSummary = false; paceStatus = .noTarget
        }

        private func startTimer() {
                    timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
                                                                                                  guard let self, let sd = self.startDate else { return }
                                                                                                  let elapsed = Date().timeIntervalSince(sd) - self.totalPausedTime
                                                                                                  DispatchQueue.main.async {
                                                                                                                      self.elapsedSeconds = Int(elapsed)
                                                                                                                      self.updateCadence()
                                                                                                                      self.updatePaceStatus()
                                                                                                  }
                                                                                     }
        }

        private func stopTimer() { timer?.invalidate(); timer = nil }

        private func startStepCounting() {
                    guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }
                    let q = HKAnchoredObjectQuery(type: stepType,
                                                              predicate: HKQuery.predicateForSamples(withStart: startDate, end: nil),
                                                              anchor: stepCountAnchor, limit: HKObjectQueryNoLimit) { [weak self] _, s, _, a, _ in
                                                                                                                                 self?.processStepSamples(s); self?.stepCountAnchor = a
                                                                                                                    }
                    q.updateHandler = { [weak self] _, s, _, a, _ in self?.processStepSamples(s); self?.stepCountAnchor = a }
                    stepQuery = q; healthStore.execute(q)
        }

        private func stopStepCounting() { if let q = stepQuery { healthStore.stop(q) } }

        private func processStepSamples(_ samples: [HKSample]?) {
                    guard let s = samples as? [HKQuantitySample] else { return }
                    let steps = s.reduce(0) { $0 + Int($1.quantity.doubleValue(for: .count())) }
                    DispatchQueue.main.async { self.totalSteps += steps }
        }

        private func updateCadence() {
                    guard elapsedSeconds > 0, totalSteps > 0 else { return }
                    currentCadence = Double(totalSteps) / (Double(elapsedSeconds) / 60.0)
        }

        private func checkAutoPause(speed: Double) {
                    guard autoPauseEnabled, isRunning else { return }
                    if speed < autoPauseSpeedThreshold {
                                    if !autoPaused && !isPaused {
                                                        if Date().timeIntervalSince(lastMovementDate) > 8.0 {
                                                                                DispatchQueue.main.async { self.autoPaused = true }
                                                                                pauseWorkout(); WKInterfaceDevice.current().play(.stop)
                                                        }
                                    }
                    } else {
                                    lastMovementDate = Date()
                                    if autoPaused { resumeWorkout(); WKInterfaceDevice.current().play(.start) }
                    }
        }

        func checkKmSplit() {
                    let currentKm = Int(floor(distance / 1000))
                    if currentKm > splits.count && currentKm > 0 {
                                    let splitTime = elapsedSeconds - currentKmStartTime
                                    let splitDist = distance - currentKmStartDistance
                                    let splitPace = splitDist > 0 ? (Double(splitTime) / splitDist) * 1000 : 0
                                    let avgHR = currentKmHRSamples.isEmpty ? heartRate : currentKmHRSamples.reduce(0,+)/Double(currentKmHRSamples.count)
                                    splits.append(KmSplit(km: currentKm, pace: splitPace, time: elapsedSeconds, heartRate: avgHR))
                                    currentKmStartTime = elapsedSeconds; currentKmStartDistance = distance; currentKmHRSamples = []
                                    WKInterfaceDevice.current().play(.notification)
                    }
                    if heartRate > 0 { currentKmHRSamples.append(heartRate) }
        }

        private func recordPartialSplit() {
                    let splitDist = distance - currentKmStartDistance
                    guard splitDist > 50 else { return }
                    let splitPace = splitDist > 0 ? (Double(elapsedSeconds - currentKmStartTime) / splitDist) * 1000 : 0
                    let avgHR = currentKmHRSamples.isEmpty ? heartRate : currentKmHRSamples.reduce(0,+)/Double(currentKmHRSamples.count)
                    splits.append(KmSplit(km: splits.count + 1, pace: splitPace, time: elapsedSeconds, heartRate: avgHR))
        }

        private func updateSmoothedPace(_ rawPace: Double) {
                    guard rawPace > 120 && rawPace < 1200, !rawPace.isInfinite, !rawPace.isNaN else { return }
                    recentPaces.append(rawPace)
                    if recentPaces.count > 5 { recentPaces.removeFirst() }
                    smoothedPace = recentPaces.reduce(0,+) / Double(recentPaces.count)
        }

        func formatPace(_ s: Double) -> String {
                    guard s > 0, !s.isInfinite, !s.isNaN else { return "--:--" }
                    let c = min(s, 5999)
                    return String(format: "%d:%02d", Int(c)/60, Int(c)%60)
        }
        func formatDuration(_ t: Int) -> String {
                    let h = t/3600, m = (t%3600)/60, s = t%60
                    return h > 0 ? String(format: "%d:%02d:%02d",h,m,s) : String(format: "%02d:%02d",m,s)
        }
        func formatDistance(_ m: Double) -> String { String(format: "%.2f", m/1000) }
        func formatHeartRate() -> String { heartRate > 0 ? "\(Int(heartRate))" : "--" }
        func formatCalories() -> String { "\(Int(activeCalories))" }
        func formatCadence() -> String { currentCadence > 0 ? "\(Int(currentCadence))" : "--" }
        func formatElevation(_ m: Double) -> String { String(format: "%.0f m", m) }

        func heartRateZone() -> Int {
                    let p = heartRate / 190.0
                    switch p { case ..<0.6: return 1; case 0.6..<0.7: return 2; case 0.7..<0.8: return 3; case 0.8..<0.9: return 4; default: return 5 }
        }
        func heartRateZoneName() -> String {
                    switch heartRateZone() { case 1: return "Let"; case 2: return "Moderat"; case 3: return "Aerob"; case 4: return "Anaerob"; case 5: return "Maks"; default: return "" }
        }
        func currentKmSplit() -> Int { Int(distance/1000)+1 }
        func fastestSplit() -> KmSplit? { splits.min(by: { $0.pace < $1.pace }) }
        func slowestSplit() -> KmSplit? { splits.max(by: { $0.pace < $1.pace }) }
        func averageSplitPace() -> Double { splits.isEmpty ? 0 : splits.map{$0.pace}.reduce(0,+)/Double(splits.count) }

        private func sendWorkoutSummaryToPhone() {
                    let splitData = splits.map { ["km":$0.km,"pace":$0.pace,"time":$0.time,"heartRate":$0.heartRate] as [String:Any] }
                    let summary: [String: Any] = [
                                    "type": "WORKOUT_COMPLETE",
                                    "distance": distance,       // METER – useWatch.js konverterer til km
                                    "duration": elapsedSeconds,
                                    "calories": activeCalories,
                                    "avgHeartRate": heartRate,
                                    "avgPace": averagePace,
                                    "totalSteps": totalSteps,
                                    "cadence": currentCadence,
                                    "totalAscent": totalAscent,
                                    "totalDescent": totalDescent,
                                    "splits": splitData,
                                    "timestamp": Date().timeIntervalSince1970
                    ]
                    // Send til iPhone (WatchConnectivity - fallback)
        WatchConnectivityManager.shared.sendWorkoutData(summary)
        // Upload direkte til Railway (primær metode)
        RailwayManager.shared.uploadRun(summary) { success in
            print("[WorkoutManager] Railway upload: \(success ? "✓" : "fejlede - gemt lokalt")")
        }
        }

        func sendLiveDataToPhone() {
                    guard WCSession.default.isReachable else { return }
                    WCSession.default.sendMessage([
                                    "type": "LIVE_UPDATE",
                                    "distance": distance,
                                    "duration": elapsedSeconds,
                                    "heartRate": Int(heartRate),
                                    "pace": formatPace(smoothedPace > 0 ? smoothedPace : currentPace),
                                    "calories": Int(activeCalories),
                                    "cadence": Int(currentCadence),
                                    "isRunning": isRunning
                    ], replyHandler: nil, errorHandler: nil)
        }
}

extension WorkoutManager: HKWorkoutSessionDelegate {
        func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {}
        func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) { print("Session failed: \(error)") }
}

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
        func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
        func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
                    for type in collectedTypes {
                                    guard let qt = type as? HKQuantityType else { continue }
                                    let stats = workoutBuilder.statistics(for: qt)
                                    DispatchQueue.main.async {
                                                        switch qt {
                                                                            case HKQuantityType.quantityType(forIdentifier: .heartRate):
                                                                                self.heartRate = stats?.mostRecentQuantity()?.doubleValue(for: HKUnit.count().unitDivided(by: .minute())) ?? 0
                                                                            case HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned):
                                                                                self.activeCalories = stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
                                                                            case HKQuantityType.quantityType(forIdentifier: .basalEnergyBurned):
                                                                                self.totalCalories = self.activeCalories + (stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0)
                                                                            case HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning):
                                                                                self.distance = stats?.sumQuantity()?.doubleValue(for: .meter()) ?? 0
                                                                                if self.distance > 0 && self.elapsedSeconds > 0 { self.averagePace = (Double(self.elapsedSeconds)/self.distance)*1000 }
                                                                                self.checkKmSplit()
                                                                                self.sendLiveDataToPhone()
                                                                            default: break
                                                        }
                                    }
                    }
        }
}

extension WorkoutManager: CLLocationManagerDelegate {
        func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
                    guard isRunning else { return }
                    let filtered = locations.filter { $0.horizontalAccuracy < 20 }
                    guard !filtered.isEmpty else { return }
                    routeBuilder?.insertRouteData(filtered) { _, _ in }
                    if let latest = filtered.last {
                                    let alt = latest.altitude
                                    if let prev = previousAltitude {
                                                        let diff = alt - prev
                                                        DispatchQueue.main.async {
                                                                                if diff > 0 { self.totalAscent += diff } else { self.totalDescent += abs(diff) }
                                                                                self.currentAltitude = alt
                                                        }
                                    }
                                    previousAltitude = alt
                    }
                    if let latest = filtered.last, let previous = lastLocations.last {
                                    let td = latest.timestamp.timeIntervalSince(previous.timestamp)
                                    let dd = latest.distance(from: previous)
                                    if td > 0 && dd > 0 {
                                                        let speed = dd/td
                                                        let rawPace = 1000.0/speed
                                                        DispatchQueue.main.async { self.currentPace = rawPace; self.updateSmoothedPace(rawPace) }
                                                        checkAutoPause(speed: speed)
                                    }
                    }
                    lastLocations = Array(filtered.suffix(5))
        }
        func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
                    DispatchQueue.main.async {
                                    self.hasLocationPermission = manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways
                    }
        }
}
