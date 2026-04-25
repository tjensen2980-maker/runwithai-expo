import Foundation
import Combine

class WorkoutManager: ObservableObject {
    static let shared = WorkoutManager()
    @Published var isRunning: Bool = false
    @Published var isPaused: Bool = false
    @Published var elapsedSeconds: Int = 0
    @Published var targetKm: Double = 0
    @Published var targetMinutes: Int = 0
    @Published var workoutType: String = "Regulaer"
    @Published var popToRootCounter: Int = 0

    let locationManager = LocationManager()
    let store = WorkoutStore.shared

    private var timer: Timer?
    private var workoutStartDate: Date?
    private var timerStartDate: Date?
    private var accumulatedSeconds: Int = 0

    func start(type: String = "Regulaer", targetKm: Double = 0, targetMinutes: Int = 0) {
        self.workoutType = type
        self.targetKm = targetKm
        self.targetMinutes = targetMinutes
        self.popToRootCounter += 1
        locationManager.requestPermission()
        elapsedSeconds = 0
        accumulatedSeconds = 0
        workoutStartDate = Date()
        timerStartDate = Date()
        isRunning = true
        isPaused = false
        locationManager.startTracking()
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
    }

    func resume() {
        guard isRunning, isPaused else { return }
        timerStartDate = Date()
        isPaused = false
        locationManager.resumeTracking()
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
