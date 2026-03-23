import Foundation
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()
    
    @Published var isReachable: Bool = false
    @Published var currentDistance: Double = 0
    @Published var currentPace: String = "--:--"
    @Published var currentDuration: Int = 0
    @Published var currentHeartRate: Int = 0
    @Published var isRunning: Bool = false
    
    private var session: WCSession?
    
    override init() {
        super.init()
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }
    
    func startRun() {
        sendCommand("START_RUN")
    }
    
    func stopRun() {
        sendCommand("STOP_RUN")
    }
    
    func pauseRun() {
        sendCommand("PAUSE_RUN")
    }
    
    func sendCommand(_ command: String) {
        guard let session = session, session.isReachable else { return }
        session.sendMessage(["command": command, "timestamp": Date().timeIntervalSince1970], replyHandler: nil, errorHandler: nil)
    }
    
    func formatDistance(_ meters: Double) -> String {
        return String(format: "%.2f km", meters / 1000)
    }
}

extension WatchConnectivityManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async { self.isReachable = session.isReachable }
    }
    
    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { self.isReachable = session.isReachable }
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            if let distance = message["distance"] as? Double { self.currentDistance = distance }
            if let pace = message["pace"] as? String { self.currentPace = pace }
            if let duration = message["duration"] as? Int { self.currentDuration = duration }
            if let heartRate = message["heartRate"] as? Int { self.currentHeartRate = heartRate }
            if let running = message["isRunning"] as? Bool { self.isRunning = running }
        }
    }
}
