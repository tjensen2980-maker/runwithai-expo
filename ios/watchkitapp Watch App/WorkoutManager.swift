import Foundation
import Combine
import HealthKit

class WorkoutManager: NSObject, ObservableObject {
    static let shared = WorkoutManager()

    override init() { super.init() }
    @Published var isRunning: Bool = false
    @Published var isPaused: Bool = false
    @Published var elapsedSeconds: Int = 0
    @Published var targetKm: Double = 0
    @Published var targetMinutes: Int = 0
    @Published var workoutType: String = "Regulaer"
    @Published var userMaxHr: Double = 190.0
    @Published var popToRootCounter: Int = 0

    // NYE: Live HealthKit metrics
    @Published var currentBpm: Int = 0
    @Published var currentSpm: Int = 0
    @Published var activeKcal: Double = 0
    @Published var totalAscent: Double = 0
    @Published var totalDescent: Double = 0

    let locationManager = LocationManager()
    let store = WorkoutStore.shared

    private var timer: Timer?
    private var workoutStartDate: Date?
    private var timerStartDate: Date?
    private var accumulatedSeconds: Int = 0

    // NYE: HealthKit
    private let healthStore = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?

    func requestHealthAuth(completion: @escaping (Bool) -> Void = { _ in }) {
        guard HKHealthStore.isHealthDataAvailable() else { completion(false); return }
        let typesToRead: Set<HKObjectType> = [
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .stepCount)!,
            HKQuantityType.quantityType(forIdentifier: .flightsClimbed)!
        ]
        let typesToWrite: Set<HKSampleType> = [HKObjectType.workoutType()]
        healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead) { success, error in
            if let error = error { print("[HK] Auth fejl: \(error)") }
            print("[HK] Auth success: \(success)")
            completion(success)
        }
    }

    private func startHealthKitWorkout() {
        guard session == nil else { return }
        let config = HKWorkoutConfiguration()
        config.activityType = .running
        config.locationType = .outdoor
        do {
            let s = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            let b = s.associatedWorkoutBuilder()
            b.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: config)
            s.delegate = self
            b.delegate = self
            self.session = s
            self.builder = b
            let startDate = Date()
            s.startActivity(with: startDate)
            b.beginCollection(withStart: startDate) { success, error in
                print("[HK] beginCollection: SUCC")
            }
        } catch {
            print("[HK] start fejl")
        }
    }

    private func endHealthKitWorkout() {
        guard let s = session, let b = builder else { return }
        s.end()
        b.endCollection(withEnd: Date()) { _, _ in
            b.finishWorkout { _, _ in }
        }
        self.session = nil
        self.builder = nil
    }

    func start(type: String = "Regulaer", targetKm: Double = 0, targetMinutes: Int = 0) {
        self.workoutType = type
        self.targetKm = targetKm
        self.targetMinutes = targetMinutes
        self.popToRootCounter += 1
        locationManager.requestPermission()
        elapsedSeconds = 0
        accumulatedSeconds = 0
        currentBpm = 0
        currentSpm = 0
        activeKcal = 0
        totalAscent = 0
        totalDescent = 0
        workoutStartDate = Date()
        timerStartDate = Date()
        isRunning = true
        isPaused = false
        locationManager.startTracking()
        requestHealthAuth { [weak self] _ in self?.startHealthKitWorkout() }
        startTimer()
    }

    func pause() {
        guard isRunning, !isPaused else { return }
        if let s = timerStartDate {
            accumulatedSeconds += Int(Date().timeIntervalSince(s))
        }
        timerStartDate = nil
        isPaused = true
        timer?.invalidate()
        locationManager.pauseTracking()
        session?.pause()
    }

    func resume() {
        guard isRunning, isPaused else { return }
        timerStartDate = Date()
        isPaused = false
        locationManager.resumeTracking()
        session?.resume()
        startTimer()
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        if let s = timerStartDate {
            accumulatedSeconds += Int(Date().timeIntervalSince(s))
        }
        elapsedSeconds = accumulatedSeconds

        if let start = workoutStartDate, elapsedSeconds > 5 {
            let routePoints = locationManager.route.map { Workout.RoutePoint(from: $0) }
            let distanceM = locationManager.distance
            let pace = Workout.calculatePace(durationSec: elapsedSeconds, distanceMeters: distanceM)
            let activityType = self.workoutType == "Regulaer" ? (pace > 8.0 ? "walk" : "run") : self.workoutType

            let workout = Workout(
                id: UUID().uuidString,
                startTime: start,
                endTime: Date(),
                durationSeconds: elapsedSeconds,
                distanceMeters: distanceM,
                averagePaceMinPerKm: pace,
                type: activityType,
                route: routePoints,
                synced: false
            )
            store.save(workout)

            // Trigger sync til Railway
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                SyncManager.shared.syncPending()
            }
        }

        workoutStartDate = nil
        timerStartDate = nil
        isRunning = false
        isPaused = false
        locationManager.stopTracking()
        endHealthKitWorkout()
    }

    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self, let s = self.timerStartDate else { return }
            self.elapsedSeconds = self.accumulatedSeconds + Int(Date().timeIntervalSince(s))
        }
    }

    var formattedTime: String {
        let h = elapsedSeconds / 3600
        let m = (elapsedSeconds % 3600) / 60
        let s = elapsedSeconds % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%02d:%02d", m, s)
    }
}

extension WorkoutManager: HKWorkoutSessionDelegate {
    func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
        print("[HK] Session state change")
    }
    func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        print("[HK] Session fejl")
    }
}

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let qtyType = type as? HKQuantityType, let stats = workoutBuilder.statistics(for: qtyType) else { continue }
            DispatchQueue.main.async {
                if qtyType == HKQuantityType.quantityType(forIdentifier: .heartRate)! {
                    if let q = stats.mostRecentQuantity() {
                        let unit = HKUnit(from: "count/min")
                        self.currentBpm = Int(q.doubleValue(for: unit))
                    }
                } else if qtyType == HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)! {
                    if let q = stats.sumQuantity() {
                        self.activeKcal = q.doubleValue(for: HKUnit.kilocalorie())
                    }
                } else if qtyType == HKQuantityType.quantityType(forIdentifier: .stepCount)! {
                    if let q = stats.mostRecentQuantity() {
                        let stepsPerMin = q.doubleValue(for: HKUnit.count()) * 60.0
                        self.currentSpm = Int(stepsPerMin)
                    }
                } else if qtyType == HKQuantityType.quantityType(forIdentifier: .flightsClimbed)! {
                    if let q = stats.sumQuantity() {
                        self.totalAscent = q.doubleValue(for: HKUnit.count()) * 3.0
                    }
                }
            }
        }
    }
}
