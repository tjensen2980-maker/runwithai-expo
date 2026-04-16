import Foundation
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject {
        static let shared = WatchConnectivityManager()

        @Published var isReachable: Bool = false
        @Published var phoneMessage: String = ""

        private var session: WCSession?

        override init() {
                    super.init()
                    if WCSession.isSupported() {
                                    session = WCSession.default
                                    session?.delegate = self
                                    session?.activate()
                    }
        }

        // MARK: - Send to Phone
        func sendMessage(_ message: [String: Any]) {
                    guard let session = session, session.isReachable else {
                                    // If not reachable, try transferring user info instead
                                    session?.transferUserInfo(message)
                                    return
                    }
                    session.sendMessage(message, replyHandler: nil) { error in
                                                                                 print("WC send error: \(error.localizedDescription)")
                                                                    }
        }

        func sendCommand(_ command: String) {
                    sendMessage([
                                    "command": command,
                                    "timestamp": Date().timeIntervalSince1970
                    ])
        }

        // MARK: - Convenience Methods
        func sendWorkoutStarted() {
                    sendCommand("WORKOUT_STARTED")
        }

        func sendWorkoutEnded(summary: [String: Any]) {
                    var message = summary
                    message["type"] = "WORKOUT_COMPLETE"
                    sendMessage(message)
        }

        func sendLiveUpdate(data: [String: Any]) {
                    var message = data
                    message["type"] = "LIVE_UPDATE"
                    sendMessage(message)
        }
}

// MARK: - WCSessionDelegate
extension WatchConnectivityManager: WCSessionDelegate {
        func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
                    DispatchQueue.main.async {
                                    self.isReachable = session.isReachable
                    }
        }

        func sessionReachabilityDidChange(_ session: WCSession) {
                    DispatchQueue.main.async {
                                    self.isReachable = session.isReachable
                    }
        }

        func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
                    DispatchQueue.main.async {
                                    // Handle commands from iPhone
                                    if let command = message["command"] as? String {
                                                        switch command {
                                                                            case "START_RUN":
                                                                                WorkoutManager.shared.startWorkout()
                                                                            case "STOP_RUN":
                                                                                WorkoutManager.shared.endWorkout()
                                                                            case "PAUSE_RUN":
                                                                                WorkoutManager.shared.pauseWorkout()
                                                                            case "RESUME_RUN":
                                                                                WorkoutManager.shared.resumeWorkout()
                                                                            default:
                                                                                break
                                                        }
                                    }

                                    // Handle coaching messages from phone
                                    if let coachMessage = message["coachMessage"] as? String {
                                                        self.phoneMessage = coachMessage
                                    }
                    }
        }
}
