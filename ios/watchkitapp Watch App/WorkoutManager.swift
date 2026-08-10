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
    @Published var isIndoor: Bool = false

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
    private var hrSamples: [HrSample] = []
    @Published var totalStepsCount: Int = 0

    private let healthStore = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var routeBuilder: HKWorkoutRouteBuilder?
    private var routeInsertions = DispatchGroup()
    private var didInsertRouteData = false

    func requestHealthAuth(completion: @escaping (Bool) -> Void = { _ in }) {
        guard HKHealthStore.isHealthDataAvailable() else { completion(false); return }
        let typesToRead: Set<HKObjectType> = [
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .stepCount)!,
            HKQuantityType.quantityType(forIdentifier: .flightsClimbed)!,
            HKObjectType.workoutType(),
            HKSeriesType.workoutRoute()
        ]
        let typesToWrite: Set<HKSampleType> = [
            HKObjectType.workoutType(),
            HKSeriesType.workoutRoute()
        ]
        healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead) { success, error in
            if let error = error { print("[HK] Auth fejl: \(error)") }
            print("[HK] Auth success: \(success)")
            completion(success)
        }
    }

    private func startHealthKitWorkout() {
        let config = HKWorkoutConfiguration()
        config.activityType = .running
        config.locationType = isIndoor ? .indoor : .outdoor
        do {
            let s = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            let b = s.associatedWorkoutBuilder()
            b.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: config)
            s.delegate = self
            b.delegate = self
            self.session = s
            self.builder = b
            self.routeInsertions = DispatchGroup()
            self.didInsertRouteData = false
            if isIndoor {
                self.routeBuilder = nil
                self.locationManager.onAcceptedRouteLocations = nil
            } else {
                self.routeBuilder = b.seriesBuilder(for: HKSeriesType.workoutRoute()) as? HKWorkoutRouteBuilder
                if self.routeBuilder == nil {
                    print("[HK] Kunne ikke oprette workout route builder")
                }
                self.locationManager.onAcceptedRouteLocations = { [weak self] locations in
                    guard let self = self, let routeBuilder = self.routeBuilder else { return }
                    let insertions = self.routeInsertions
                    insertions.enter()
                    routeBuilder.insertRouteData(locations) { success, routeError in
                        DispatchQueue.main.async {
                            if success {
                                self.didInsertRouteData = true
                            } else if let routeError = routeError {
                                print("[HK] insertRouteData fejl: \(routeError)")
                            }
                            insertions.leave()
                        }
                    }
                }
            }
            let startDate = Date()
            s.startActivity(with: startDate)
            b.beginCollection(withStart: startDate) { success, error in
                print("[HK] beginCollection: \(success), fejl: \(String(describing: error))")
            }
        } catch {
            print("[HK] start fejl: \(error)")
        }
    }

    private func endHealthKitWorkout() {
        locationManager.onAcceptedRouteLocations = nil
        guard let s = session, let b = builder else { return }
        let workoutRouteBuilder = routeBuilder
        let endDate = Date()
        let insertions = routeInsertions
        let routePointCount = locationManager.route.count

        // Wait for every GPS batch before ending the workout. Apple Fitness can
        // then associate the finished HKWorkoutRoute with the saved workout.
        insertions.notify(queue: .main) { [weak self] in
            guard let self = self else { return }
            s.end()
            b.endCollection(withEnd: endDate) { collectionEnded, collectionError in
                guard collectionEnded else {
                    if let collectionError = collectionError {
                        print("[HK] endCollection fejl: \(collectionError)")
                    }
                    return
                }

                b.finishWorkout { workout, workoutError in
                    guard let workout = workout else {
                        if let workoutError = workoutError {
                            print("[HK] finishWorkout fejl: \(workoutError)")
                        }
                        return
                    }

                    guard self.didInsertRouteData,
                          routePointCount >= 2,
                          let workoutRouteBuilder = workoutRouteBuilder else { return }

                    workoutRouteBuilder.finishRoute(with: workout, metadata: nil) { route, finishError in
                        if let finishError = finishError {
                            print("[HK] finishRoute fejl: \(finishError)")
                        } else {
                            print("[HK] Route gemt med \(routePointCount) GPS-punkter: \(route != nil)")
                        }
                    }
                }
            }
        }

        self.session = nil
        self.builder = nil
        self.routeBuilder = nil
    }

    func start(type: String = "Regulaer", targetKm: Double = 0, targetMinutes: Int = 0, isIndoor: Bool = false) {
    self.workoutType = type
    self.targetKm = targetKm
    self.targetMinutes = targetMinutes
    self.isIndoor = isIndoor
    self.popToRootCounter += 1
    if !isIndoor { locationManager.requestPermission() }
        elapsedSeconds = 0
        accumulatedSeconds = 0
        currentBpm = 0
        currentSpm = 0
        activeKcal = 0
        totalAscent = 0
        totalDescent = 0
        hrSamples = []
        totalStepsCount = 0
        workoutStartDate = Date()
        timerStartDate = Date()
        isRunning = true
        isPaused = false
        requestHealthAuth { [weak self] _ in
            DispatchQueue.main.async {
                guard let self = self else { return }
                guard self.isRunning else { return }
                self.startHealthKitWorkout()
                if !self.isIndoor {
                    self.locationManager.startTracking()
                }
            }
        }
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
            let activityType: String
if self.isIndoor {
    activityType = "treadmill"
} else if self.workoutType == "Regulaer" {
    activityType = pace > 8.0 ? "walk" : "run"
} else {
    activityType = self.workoutType
}

            let avgHrVal = hrSamples.isEmpty ? 0 : hrSamples.map { $0.bpm }.reduce(0, +) / hrSamples.count
            let maxHrVal = hrSamples.map { $0.bpm }.max() ?? 0

            var ascent: Double = 0
            var descent: Double = 0
            let alts = routePoints.map { $0.altitude }
            if alts.count > 1 {
                for i in 1..<alts.count {
                    let d = alts[i] - alts[i-1]
                    if d > 0.5 { ascent += d } else if d < -0.5 { descent += -d }
                }
            }

            let avgCadence = elapsedSeconds > 0 ? Int(Double(totalStepsCount) / (Double(elapsedSeconds) / 60.0)) : 0

            var workout = Workout(
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
            workout.hrSamples = hrSamples
            workout.avgHr = avgHrVal
            workout.maxHr = maxHrVal
            workout.totalAscent = ascent
            workout.totalDescent = descent
            workout.activeKcal = activeKcal
            workout.totalSteps = totalStepsCount
            workout.cadence = avgCadence

            store.save(workout)

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
                        let bpmVal = Int(q.doubleValue(for: unit))
                        self.currentBpm = bpmVal
                        if bpmVal > 0 {
                            self.hrSamples.append(HrSample(t: Date(), bpm: bpmVal))
                        }
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
                    if let sum = stats.sumQuantity() {
                        self.totalStepsCount = Int(sum.doubleValue(for: HKUnit.count()))
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
