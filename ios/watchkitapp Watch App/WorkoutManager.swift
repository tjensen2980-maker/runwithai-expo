import Foundation
import Combine

class WorkoutManager: ObservableObject {
    @Published var elapsedSeconds: Int = 0
    @Published var isRunning: Bool = false
    @Published var isPaused: Bool = false

    private var timer: Timer?

    func start() {
        isRunning = true
        isPaused = false
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self, !self.isPaused else { return }
            self.elapsedSeconds += 1
        }
    }

    func pause() {
        isPaused = true
    }

    func resume() {
        isPaused = false
    }

    func stop() {
        isRunning = false
        isPaused = false
        timer?.invalidate()
        timer = nil
        elapsedSeconds = 0
    }

    var formattedTime: String {
        let hours = elapsedSeconds / 3600
        let minutes = (elapsedSeconds % 3600) / 60
        let seconds = elapsedSeconds % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }
}
