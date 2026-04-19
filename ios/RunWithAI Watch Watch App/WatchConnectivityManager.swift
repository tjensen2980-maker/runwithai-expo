//
//  WatchConnectivityManager.swift
//  RunWithAI Watch Watch App
//
//  Håndterer kommunikation med iPhone.
//  Gemmer træningsplan LOKALT på uret (UserDefaults) - virker offline som Garmin.
//  iPhone sender plan én gang → uret husker det selv.
//

import Foundation
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchConnectivityManager()

    // MARK: - Published state
    @Published var todayTraining: [String: Any]? = nil
    @Published var trainingPlan: [[String: Any]] = []
    @Published var isReachable: Bool = false

    // UserDefaults nøgler - data gemmes lokalt på uret
    private let kTodayTraining = "watch_today_training"
    private let kTrainingPlan = "watch_training_plan"

    private override init() {
        super.init()
        loadLocalData()
        setupSession()
    }

    // MARK: - Gem og hent data lokalt på uret
    private func loadLocalData() {
        if let data = UserDefaults.standard.data(forKey: kTodayTraining),
           let training = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            self.todayTraining = training
        }
        if let data = UserDefaults.standard.data(forKey: kTrainingPlan),
           let plan = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            self.trainingPlan = plan
        }
    }

    private func saveLocally(training: [String: Any]?, plan: [[String: Any]]?) {
        if let training = training,
           let data = try? JSONSerialization.data(withJSONObject: training) {
            UserDefaults.standard.set(data, forKey: kTodayTraining)
        }
        if let plan = plan,
           let data = try? JSONSerialization.data(withJSONObject: plan) {
            UserDefaults.standard.set(data, forKey: kTrainingPlan)
        }
    }

    // MARK: - WCSession setup
    private func setupSession() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    // MARK: - Bed iPhone om dagens træning
    // Kun nødvendigt hvis ingen lokal data eller brugeren trykker "Opdater"
    func requestTodayTraining() {
        // Prøv Railway direkte første (hurtigere, ingen afhængighed af iPhone)
        if RailwayManager.shared.isAuthenticated {
            fetchTodayTrainingFromRailway()
            return
        }
        // Fallback: bed iPhone om data
        guard WCSession.default.isReachable else {
            print("[WCM] iPhone ikke tilgængelig - bruger lokal data")
            return
        }
        WCSession.default.sendMessage(
            ["command": "GET_TODAY_TRAINING"],
            replyHandler: { reply in
                DispatchQueue.main.async {
                    self.handleReceivedData(reply)
                }
            },
            errorHandler: { error in
                print("[WCM] Request failed: \(error.localizedDescription)")
            }
        )
    }

    // MARK: - Send workout data til iPhone efter løb
    func sendWorkoutData(_ data: [String: Any]) {
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(data, replyHandler: nil) { error in
                print("[WCM] sendMessage failed, using transferUserInfo: \(error.localizedDescription)")
                WCSession.default.transferUserInfo(data)
            }
        } else {
            // Gem i kø - leveres automatisk når iPhone er tilgængelig
            WCSession.default.transferUserInfo(data)
        }
    }

    // MARK: - WCSessionDelegate
    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
        // Hent opdateret træning fra iPhone hvis ingen lokal data
        if activationState == .activated && todayTraining == nil {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                self.requestTodayTraining()
            }
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
        // Opdater data når iPhone bliver tilgængelig
        if session.isReachable {
            requestTodayTraining()
        }
    }

    // MARK: - Modtag data fra iPhone
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { self.handleReceivedData(message) }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any],
                 replyHandler: @escaping ([String: Any]) -> Void) {
        DispatchQueue.main.async { self.handleReceivedData(message) }
        replyHandler(["status": "received"])
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        DispatchQueue.main.async { self.handleReceivedData(userInfo) }
    }

    func session(_ session: WCSession,
                 didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async { self.handleReceivedData(applicationContext) }
    }

    // MARK: - Behandl indkomne data
    private func handleReceivedData(_ data: [String: Any]) {
        var updated = false

        if let training = data["todayTraining"] as? [String: Any] {
            self.todayTraining = training
            updated = true
            print("[WCM] Modtog dagens træning: \(training["type"] ?? "?")")
        }

        if let plan = data["trainingPlan"] as? [[String: Any]] {
            self.trainingPlan = plan
            updated = true
            print("[WCM] Modtog træningsplan: \(plan.count) dage")
        }

        // Modtag JWT token + userId fra iPhone (sendes ved login)
        if let token = data["jwtToken"] as? String {
            RailwayManager.shared.jwtToken = token
            print("[WCM] JWT token gemt fra iPhone")
            updated = true
            // Hent træning fra Railway direkte nu vi har token
            fetchTodayTrainingFromRailway()
            // Retry eventuelle gemte løb
            RailwayManager.shared.retryPendingRuns()
        }
        if let uid = data["userId"] as? Int {
            RailwayManager.shared.userId = uid
        }

        // Gem lokalt så uret husker det næste gang (offline)
        if updated {
            saveLocally(training: self.todayTraining, plan: self.trainingPlan.isEmpty ? nil : self.trainingPlan)
        }
    }

    // MARK: - Hent dagens træning direkte fra Railway
    func fetchTodayTrainingFromRailway() {
        guard RailwayManager.shared.isAuthenticated else {
            print("[WCM] Ingen Railway token - bruger lokal data eller iPhone")
            return
        }
        RailwayManager.shared.fetchTodayTraining { [weak self] training in
            guard let self, let training = training else { return }
            self.todayTraining = training
            self.saveLocally(training: training, plan: nil)
            print("[WCM] Dagens træning hentet fra Railway: \(training["type"] ?? training["name"] ?? "?")")
        }
    }
}
