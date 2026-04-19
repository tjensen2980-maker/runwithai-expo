// RailwayManager.swift – ios/RunWithAI Watch Watch App
// Håndterer direkte kommunikation mellem Apple Watch og Railway API (runwithai.app)
// Watch uploader løb direkte over WiFi/LTE – ingen afhængighed af iPhone.
// Fallback: gem lokalt og retry næste gang der er forbindelse.

import Foundation
import WatchConnectivity

// MARK: - Railway API Manager
class RailwayManager: NSObject, ObservableObject {
    static let shared = RailwayManager()

    private let baseURL = "https://runwithai.app"
    private let kJWTToken = "watch_jwt_token"
    private let kUserId   = "watch_user_id"
    private let kPendingRuns = "watch_pending_runs"

    // MARK: - Token management (sendes fra iPhone ved login)
    var jwtToken: String? {
        get { UserDefaults.standard.string(forKey: kJWTToken) }
        set {
            if let v = newValue { UserDefaults.standard.set(v, forKey: kJWTToken) }
            else { UserDefaults.standard.removeObject(forKey: kJWTToken) }
        }
    }

    var userId: Int? {
        get {
            let v = UserDefaults.standard.integer(forKey: kUserId)
            return v == 0 ? nil : v
        }
        set {
            if let v = newValue { UserDefaults.standard.set(v, forKey: kUserId) }
            else { UserDefaults.standard.removeObject(forKey: kUserId) }
        }
    }

    var isAuthenticated: Bool { jwtToken != nil }

    // MARK: - Upload løb til Railway
    // Kaldes fra WorkoutManager.endWorkout() efter løbet
    func uploadRun(_ workoutData: [String: Any], completion: ((Bool) -> Void)? = nil) {
        guard let token = jwtToken else {
            print("[Railway] Ingen JWT token – gemmer lokalt til retry")
            savePendingRun(workoutData)
            completion?(false)
            return
        }

        // Konverter workout data til /runs format
        let body: [String: Any] = [
            "km":         (workoutData["distance"] as? Double ?? 0) / 1000.0,
            "duration":   workoutData["duration"] as? Int ?? 0,
            "pace":       workoutData["avgPace"] as? Double ?? 0,
            "calories":   workoutData["calories"] as? Double ?? 0,
            "heart_rate": workoutData["avgHeartRate"] as? Double ?? 0,
            "type":       "outdoor_run",
            "running_km": (workoutData["distance"] as? Double ?? 0) / 1000.0,
            "walking_km": 0,
            "date":       ISO8601DateFormatter().string(from: Date()),
            "notes":      ""
        ]

        guard let url = URL(string: "(baseURL)/runs"),
              let data = try? JSONSerialization.data(withJSONObject: body) else {
            savePendingRun(workoutData)
            completion?(false)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer (token)", forHTTPHeaderField: "Authorization")
        request.httpBody = data
        request.timeoutInterval = 30

        URLSession.shared.dataTask(with: request) { [weak self] responseData, response, error in
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            let success = statusCode >= 200 && statusCode < 300

            DispatchQueue.main.async {
                if success {
                    print("[Railway] Løb uploadet ✓ (status (statusCode))")
                    completion?(true)
                } else if statusCode == 401 {
                    // Token udløbet – nulstil og gem til retry
                    print("[Railway] Token udløbet – nulstil")
                    self?.jwtToken = nil
                    self?.savePendingRun(workoutData)
                    completion?(false)
                } else {
                    print("[Railway] Upload fejlede: (statusCode), (error?.localizedDescription ?? "ukendt")")
                    self?.savePendingRun(workoutData)
                    completion?(false)
                }
            }
        }.resume()
    }

    // MARK: - Hent dagens træning fra Railway
    func fetchTodayTraining(completion: @escaping ([String: Any]?) -> Void) {
        guard let token = jwtToken else {
            completion(nil)
            return
        }

        guard let url = URL(string: "(baseURL)/weekplan") else {
            completion(nil)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer (token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 15

        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data,
                  let statusCode = (response as? HTTPURLResponse)?.statusCode,
                  statusCode == 200 else {
                DispatchQueue.main.async { completion(nil) }
                return
            }

            // weekplan returnerer JSON med træningsplan
            // Prøv at finde dagens træning
            if let plan = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let today = RailwayManager.todayKey()
                if let todayWorkout = plan[today] as? [String: Any] {
                    DispatchQueue.main.async { completion(todayWorkout) }
                } else if let days = plan["days"] as? [[String: Any]] {
                    // Alternativt format
                    let todayItem = days.first { $0["date"] as? String == today }
                    DispatchQueue.main.async { completion(todayItem) }
                } else {
                    // Returner hele planen og lad WatchConnectivityManager håndtere det
                    DispatchQueue.main.async { completion(plan) }
                }
            } else {
                DispatchQueue.main.async { completion(nil) }
            }
        }.resume()
    }

    // MARK: - Pending runs (offline kø)
    private func savePendingRun(_ data: [String: Any]) {
        var pending = getPendingRuns()
        if let encoded = try? JSONSerialization.data(withJSONObject: data),
           let str = String(data: encoded, encoding: .utf8) {
            pending.append(str)
            UserDefaults.standard.set(pending, forKey: kPendingRuns)
            print("[Railway] Gemt til offline kø ((pending.count) afventende)")
        }
    }

    private func getPendingRuns() -> [String] {
        UserDefaults.standard.stringArray(forKey: kPendingRuns) ?? []
    }

    // Upload alle gemte løb når der er forbindelse
    func retryPendingRuns() {
        let pending = getPendingRuns()
        guard !pending.isEmpty else { return }
        print("[Railway] Forsøger at sende (pending.count) gemte løb...")

        var remaining: [String] = []
        let group = DispatchGroup()

        for runStr in pending {
            guard let data = runStr.data(using: .utf8),
                  let run = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { continue }

            group.enter()
            uploadRun(run) { success in
                if !success { remaining.append(runStr) }
                group.leave()
            }
        }

        group.notify(queue: .main) {
            UserDefaults.standard.set(remaining, forKey: self.kPendingRuns)
            if remaining.isEmpty {
                print("[Railway] Alle gemte løb uploadet ✓")
            } else {
                print("[Railway] (remaining.count) løb stadig afventende")
            }
        }
    }

    // MARK: - Helpers
    private static func todayKey() -> String {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: Date())
    }
}
