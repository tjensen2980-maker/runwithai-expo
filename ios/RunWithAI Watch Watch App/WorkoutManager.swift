//
//  WorkoutManager.swift
//  RunWithAI Watch Watch App
//
//  Styrer løb direkte på uret - standalone som Garmin.
//  Ingen iPhone forbindelse nødvendig under løbet.
//  GPS + Puls direkte fra Watch sensorer via HealthKit.
//

import Foundation
import HealthKit
import Combine
import WatchKit

class WorkoutManager: NSObject, ObservableObject {
    static let shared = WorkoutManager()

    // MARK: - Published workout state
    @Published var isRunning = false
    @Published var isPaused = false
    @Published var elapsedTime: TimeInterval = 0
    @Published var distance: Double = 0        // km
    @Published var heartRate: Double = 0       // bpm
    @Published var currentPace: Double = 0     // sek/km
    @Published var calories: Double = 0        // kcal
    @Published var cadence: Double = 0         // steps/min
    @Published var workoutComplete = false
    @Published var authorizationStatus: String = "unknown"

    // MARK: - HealthKit
    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var workoutBuilder: HKLiveWorkoutBuilder?

    // MARK: - Timer
    private var timer: Timer?
    private var startDate: Date?
    private var pausedTime: TimeInterval = 0
    private var pauseStart: Date?

    // MARK: - Workout data til synk med iPhone
    private var heartRateSamples: [Double] = []
    private var maxHeartRate: Double = 0

    private override init() {
        super.init()
        requestAuthorization()
    }

    // MARK: - HealthKit Authorization
    func requestAuthorization() {
        let typesToShare: Set<HKSampleType> = [
            HKObjectType.workoutType(),
            HKSeriesType.workoutRoute()
        ]
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.workoutType(),
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .runningSpeed)!,
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
        ]

        healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { success, error in
            DispatchQueue.main.async {
                self.authorizationStatus = success ? "authorized" : "denied"
                if let error = error {
                    print("[WorkoutManager] Auth error: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Start løb
    func startWorkout() {
        let config = HKWorkoutConfiguration()
        config.activityType = .running
        config.locationType = .outdoor

        do {
            workoutSession = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            workoutBuilder = workoutSession?.associatedWorkoutBuilder()

            workoutSession?.delegate = self
            workoutBuilder?.delegate = self
            workoutBuilder?.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: config
            )

            let startDate = Date()
            self.startDate = startDate
            workoutSession?.startActivity(with: startDate)
            workoutBuilder?.beginCollection(withStart: startDate) { success, error in
                if success {
                    DispatchQueue.main.async {
                        self.isRunning = true
                        self.isPaused = false
                        self.startTimer()
                    }
                }
            }
        } catch {
            print("[WorkoutManager] Start error: \(error.localizedDescription)")
        }
    }

    // MARK: - Pause/Resume
    func pauseWorkout() {
        workoutSession?.pause()
        isPaused = true
        pauseStart = Date()
        timer?.invalidate()
    }

    func resumeWorkout() {
        workoutSession?.resume()
        isPaused = false
        if let ps = pauseStart {
            pausedTime += Date().timeIntervalSince(ps)
        }
        startTimer()
    }

    func togglePause() {
        if isPaused { resumeWorkout() } else { pauseWorkout() }
    }

    // MARK: - Stop og gem løb
    func stopWorkout() {
        guard let session = workoutSession,
              let builder = workoutBuilder else { return }

        session.end()
        builder.endCollection(withEnd: Date()) { success, error in
            builder.finishWorkout { workout, error in
                DispatchQueue.main.async {
                    self.isRunning = false
                    self.isPaused = false
                    self.timer?.invalidate()
                    self.workoutComplete = true

                    // Send data til iPhone via WatchConnectivity
                    if let workout = workout {
                        self.sendWorkoutToPhone(workout: workout)
                    }
                }
            }
        }
    }

    // MARK: - Timer
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            guard let start = self.startDate else { return }
            self.elapsedTime = Date().timeIntervalSince(start) - self.pausedTime

            // Beregn pace
            if self.distance > 0 {
                self.currentPace = self.elapsedTime / self.distance
            }
        }
    }

    // MARK: - Send workout data til iPhone efter løb
    private func sendWorkoutToPhone(workout: HKWorkout) {
        let avgHR = heartRateSamples.isEmpty ? 0 :
            heartRateSamples.reduce(0, +) / Double(heartRateSamples.count)

        let data: [String: Any] = [
            "type": "WORKOUT_COMPLETE",
            "duration": workout.duration,
            "distance": (workout.totalDistance?.doubleValue(for: .meterUnit(with: .kilo)) ?? 0),
            "calories": (workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()) ?? 0),
            "avgHeartRate": avgHR,
            "maxHeartRate": maxHeartRate,
            "startDate": workout.startDate.timeIntervalSince1970,
            "endDate": workout.endDate.timeIntervalSince1970,
            "source": "apple_watch"
        ]

        WatchConnectivityManager.shared.sendWorkoutData(data)
    }

    // MARK: - Reset
    func resetWorkout() {
        elapsedTime = 0
        distance = 0
        heartRate = 0
        currentPace = 0
        calories = 0
        cadence = 0
        pausedTime = 0
        startDate = nil
        pauseStart = nil
        heartRateSamples = []
        maxHeartRate = 0
        workoutComplete = false
    }

    // MARK: - Formattering
    func formattedTime() -> String {
        let h = Int(elapsedTime) / 3600
        let m = (Int(elapsedTime) % 3600) / 60
        let s = Int(elapsedTime) % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%02d:%02d", m, s)
    }

    func formattedPace() -> String {
        guard currentPace > 0 && currentPace < 3600 else { return "--:--" }
        let m = Int(currentPace) / 60
        let s = Int(currentPace) % 60
        return String(format: "%d:%02d", m, s)
    }

    func formattedDistance() -> String {
        return String(format: "%.2f", distance)
    }
}

// MARK: - HKWorkoutSessionDelegate
extension WorkoutManager: HKWorkoutSessionDelegate {
    func workoutSession(_ workoutSession: HKWorkoutSession,
                        didChangeTo toState: HKWorkoutSessionState,
                        from fromState: HKWorkoutSessionState,
                        date: Date) {
        DispatchQueue.main.async {
            self.isRunning = toState == .running
        }
    }

    func workoutSession(_ workoutSession: HKWorkoutSession,
                        didFailWithError error: Error) {
        print("[WorkoutManager] Session error: \(error.localizedDescription)")
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate
extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder,
                        didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType else { continue }
            let stats = workoutBuilder.statistics(for: quantityType)

            DispatchQueue.main.async {
                switch quantityType {
                case HKQuantityType.quantityType(forIdentifier: .heartRate)!:
                    let bpm = stats?.mostRecentQuantity()?.doubleValue(for: .init(from: "count/min")) ?? 0
                    self.heartRate = bpm
                    if bpm > 0 {
                        self.heartRateSamples.append(bpm)
                        if bpm > self.maxHeartRate { self.maxHeartRate = bpm }
                    }

                case HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!:
                    let meters = stats?.sumQuantity()?.doubleValue(for: .meter()) ?? 0
                    self.distance = meters / 1000.0

                case HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!:
                    self.calories = stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0

                default:
                    break
                }
            }
        }
    }
}
