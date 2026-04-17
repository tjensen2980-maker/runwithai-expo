//
// WatchConnectivityManager.swift
// RunWithAI Watch Watch App
//
// Created by Thomas Jensen on 4/17/26.
//

import Foundation
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchConnectivityManager()
    
    @Published var todayTraining: [String: Any]? = nil
    @Published var trainingPlan: [[String: Any]] = []
    @Published var isReachable: Bool = false
    @Published var lastReceivedMessage: [String: Any]? = nil
    
    private override init() {
        super.init()
        setupSession()
    }
    
    private func setupSession() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }
    
    // MARK: - Send message to iPhone
    func sendMessageToPhone(_ message: [String: Any]) {
        guard WCSession.default.isReachable else {
            print("WatchConnectivity: iPhone not reachable")
            return
        }
        WCSession.default.sendMessage(message, replyHandler: nil) { error in
            print("WatchConnectivity: Error sending message: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Request today's training from iPhone
    func requestTodayTraining() {
        let message: [String: Any] = ["command": "GET_TODAY_TRAINING"]
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(message, replyHandler: { reply in
                DispatchQueue.main.async {
                    if let training = reply["todayTraining"] as? [String: Any] {
                        self.todayTraining = training
                    }
                    if let plan = reply["trainingPlan"] as? [[String: Any]] {
                        self.trainingPlan = plan
                    }
                }
            }) { error in
                print("WatchConnectivity: Error requesting training: \(error.localizedDescription)")
                WCSession.default.transferUserInfo(message)
            }
        } else {
            WCSession.default.transferUserInfo(message)
        }
    }
    
    // MARK: - Send workout data to iPhone
    func sendWorkoutData(_ data: [String: Any]) {
        var message = data
        message["type"] = "WORKOUT_DATA"
        
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(message, replyHandler: nil) { error in
                print("WatchConnectivity: Error sending workout data: \(error.localizedDescription)")
                WCSession.default.transferUserInfo(message)
            }
        } else {
            WCSession.default.transferUserInfo(message)
        }
    }
    
    // MARK: - WCSessionDelegate
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
        if activationState == .activated {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                self.requestTodayTraining()
            }
        }
        if let error = error {
            print("WatchConnectivity: Activation error: \(error.localizedDescription)")
        }
    }
    
    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
        if session.isReachable {
            requestTodayTraining()
        }
    }
    
    // MARK: - Receive messages from iPhone
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            self.lastReceivedMessage = message
            self.handleReceivedData(message)
        }
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        DispatchQueue.main.async {
            self.lastReceivedMessage = message
            self.handleReceivedData(message)
        }
        replyHandler(["status": "received"])
    }
    
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        DispatchQueue.main.async {
            self.handleReceivedData(userInfo)
        }
    }
    
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            self.handleReceivedData(applicationContext)
        }
    }
    
    // MARK: - Handle incoming data
    private func handleReceivedData(_ data: [String: Any]) {
        if let training = data["todayTraining"] as? [String: Any] {
            self.todayTraining = training
        }
        if let plan = data["trainingPlan"] as? [[String: Any]] {
            self.trainingPlan = plan
        }
    }
}
