/**
 * WatchConnectivityManager.swift
 * 
 * Håndterer al kommunikation mellem Apple Watch og iPhone app.
 * Bruger WatchConnectivity framework.
 */

import Foundation
import WatchConnectivity
import Combine

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()
    
    // Published properties til SwiftUI binding
    @Published var isReachable: Bool = false
    @Published var receivedMessage: [String: Any] = [:]
    
    // Run data modtaget fra iPhone
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
            print("[WatchConnectivity] Session initialized")
        } else {
            print("[WatchConnectivity] WCSession not supported")
        }
    }
    
    // MARK: - Send til iPhone
    
    /// Send kommando til iPhone app (start/stop/pause løb)
    func sendCommand(_ command: String, data: [String: Any] = [:]) {
        guard let session = session, session.isReachable else {
            print("[WatchConnectivity] iPhone not reachable")
            return
        }
        
        var message: [String: Any] = [
            "command": command,
            "timestamp": Date().timeIntervalSince1970
        ]
        message.merge(data) { _, new in new }
        
        session.sendMessage(message, replyHandler: { reply in
            print("[WatchConnectivity] Command sent successfully: \(reply)")
        }, errorHandler: { error in
            print("[WatchConnectivity] Failed to send command: \(error)")
        })
    }
    
    /// Start løb fra Watch
    func startRun() {
        sendCommand("START_RUN")
    }
    
    /// Stop løb fra Watch
    func stopRun() {
        sendCommand("STOP_RUN")
    }
    
    /// Pause løb fra Watch
    func pauseRun() {
        sendCommand("PAUSE_RUN")
    }
    
    // MARK: - Hjælpefunktioner
    
    func formatDuration(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%02d:%02d", minutes, secs)
        }
    }
    
    func formatDistance(_ meters: Double) -> String {
        let km = meters / 1000
        return String(format: "%.2f km", km)
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {
    
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("[WatchConnectivity] Activation failed: \(error)")
            return
        }
        
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
        print("[WatchConnectivity] Activation completed: \(activationState.rawValue)")
    }
    
    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
        print("[WatchConnectivity] Reachability changed: \(session.isReachable)")
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        handleReceivedMessage(message)
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        handleReceivedMessage(message)
        replyHandler(["status": "received"])
    }
    
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        handleReceivedMessage(applicationContext)
    }
    
    // MARK: - Message Handling
    
    private func handleReceivedMessage(_ message: [String: Any]) {
        DispatchQueue.main.async {
            self.receivedMessage = message
            
            // Parse run update
            if let type = message["type"] as? String {
                switch type {
                case "RUN_UPDATE":
                    self.updateRunData(message)
                case "COMMAND":
                    self.handleCommand(message)
                case "WORKOUT_SUMMARY":
                    self.handleWorkoutSummary(message)
                default:
                    break
                }
            }
        }
        
        print("[WatchConnectivity] Received message: \(message)")
    }
    
    private func updateRunData(_ message: [String: Any]) {
        if let distance = message["distance"] as? Double {
            currentDistance = distance
        }
        if let pace = message["pace"] as? String {
            currentPace = pace
        }
        if let duration = message["duration"] as? Int {
            currentDuration = duration
        }
        if let heartRate = message["heartRate"] as? Int {
            currentHeartRate = heartRate
        }
        if let running = message["isRunning"] as? Bool {
            isRunning = running
        }
    }
    
    private func handleCommand(_ message: [String: Any]) {
        guard let command = message["command"] as? String else { return }
        
        switch command {
        case "START_RUN":
            isRunning = true
        case "STOP_RUN":
            isRunning = false
        case "PAUSE_RUN":
            isRunning = false
        default:
            break
        }
    }
    
    private func handleWorkoutSummary(_ message: [String: Any]) {
        isRunning = false
        // Workout summary kan vises i UI
    }
}
