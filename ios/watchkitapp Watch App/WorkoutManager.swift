import Foundation
import Combine

class WorkoutManager: ObservableObject {
    @Published var isRunning: Bool = false
    @Published var isPaused: Bool = false
    @Published var elapsedSeconds: Int = 0

    // GPS
    let locationManager = LocationManager()

    private var timer: Timer?
    private var startDate: Date?
    private var accumulatedSeconds: Int = 0

    func start() {
        locationManager.requestPermission()
        elapsedSeconds = 0
        accumulatedSeconds = 0
        startDate = Date()
        isRunning = true
        isPaused = false
        locationManager.startTracking()
        startTimer()
    }

    func pause() {
        guard isRunning, !isPaused else { return }
        if let s = startDate {
            accumulatedSeconds += Int(Date().timeIntervalSince(s))
        }
        startDate = nil
        isPaused = true
        timer?.invalidate()
        locationManager.pauseTracking()
    }

    func resume() {
        guard isRunning, isPaused else { return }
        startDate = Date()
        isPaused = false
        locationManager.resumeTracking()
        startTimer()
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        if let s = startDate {
            accumulatedSeconds += Int(Date().timeIntervalSince(s))
        }
        elapsedSeconds = accumulatedSeconds
        startDate = nil
        isRunning = false
        isPaused = false
        locationManager.stopTracking()
    }

    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self, let s = self.startDate else { return }
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
