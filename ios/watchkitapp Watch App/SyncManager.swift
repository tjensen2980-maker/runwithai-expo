import Foundation
import Combine

class SyncManager: ObservableObject {
    static let shared = SyncManager()

    @Published var isSyncing: Bool = false
    @Published var lastSyncStatus: String = "Aldrig synket"
    @Published var lastSyncDate: Date?

    private let session = URLSession.shared
    private var timer: Timer?

    private init() {
        startPeriodicSync()
    }

    func startPeriodicSync() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 60.0, repeats: true) { [weak self] _ in
            self?.syncPending()
        }
    }

    func syncPending() {
        let pending = WorkoutStore.shared.pendingSync
        guard !pending.isEmpty else { return }
        guard let token = AuthManager.shared.token, !token.isEmpty else {
            lastSyncStatus = "No token"
            return
        }
        guard !isSyncing else { return }

        DispatchQueue.main.async {
            self.isSyncing = true
            self.lastSyncStatus = "Synker \(pending.count)..."
        }

        syncNext(workouts: pending, index: 0, successes: 0)
    }

    private func syncNext(workouts: [Workout], index: Int, successes: Int) {
        guard index < workouts.count else {
            DispatchQueue.main.async {
                self.isSyncing = false
                self.lastSyncDate = Date()
                self.lastSyncStatus = "Synket \(successes)/\(workouts.count)"
            }
            // Marker dagens traening som completed hvis mindst et run blev synket
            if successes > 0 {
                self.markTodayCompleted()
            }
            return
        }

        let workout = workouts[index]
        postWorkout(workout) { [weak self] success in
            guard let self = self else { return }
            if success {
                DispatchQueue.main.async {
                    WorkoutStore.shared.markSynced(id: workout.id)
                }
                self.syncNext(workouts: workouts, index: index + 1, successes: successes + 1)
            } else {
                DispatchQueue.main.async {
                    self.isSyncing = false
                    self.lastSyncStatus = "Fejl v. \(index+1). Prøver igen"
                }
            }
        }
    }

    private func postWorkout(_ workout: Workout, completion: @escaping (Bool) -> Void) {
        let serverUrl = AuthManager.shared.serverUrl
        guard let url = URL(string: "\(serverUrl)/runs") else {
            completion(false)
            return
        }
        guard let token = AuthManager.shared.token else {
            completion(false)
            return
        }

        let km = workout.distanceMeters / 1000.0
        let durationSecs = workout.durationSeconds
        let paceSecsPerKm = km > 0 ? Double(durationSecs) / km : 0

        // Byg route som array af {lat, lng} - matcher Activity.js mini-map
        let routeArray: [[String: Any]] = workout.route.map { point in
            return [
                "lat": point.lat,
                "lng": point.lon,
                "lon": point.lon
            ]
        }

        // Konverter til JSON-string (DB kolonne er 'text')
        var routeString = "[]"
        if let routeData = try? JSONSerialization.data(withJSONObject: routeArray),
           let str = String(data: routeData, encoding: .utf8) {
            routeString = str
        }

        let dateFormatter = ISO8601DateFormatter()
        let runBody: [String: Any] = [
            "km": km,
            "duration": durationSecs,
            "duration_secs": durationSecs,
            "pace": paceSecsPerKm,
            "pace_secs_per_km": paceSecsPerKm,
            "heart_rate": 0,
            "avg_hr": 0,
            "max_hr": 0,
            "cadence": 0,
            "total_ascent": 0,
            "total_descent": 0,
            "total_steps": 0,
            "splits": "[]",
            "route": routeString,
            "type": workout.type,
            "date": dateFormatter.string(from: workout.startTime),
            "source": "apple_watch",
            "created_at": dateFormatter.string(from: workout.endTime),
            "client_id": workout.id
        ]

        guard let bodyData = try? JSONSerialization.data(withJSONObject: runBody) else {
            completion(false)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = bodyData
        request.timeoutInterval = 30

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                print("[Sync] Error: \(error.localizedDescription)")
                completion(false)
                return
            }
            guard let http = response as? HTTPURLResponse else {
                completion(false)
                return
            }
            if (200...299).contains(http.statusCode) {
                print("[Sync] POST ok: \(http.statusCode)")
                completion(true)
            } else {
                print("[Sync] POST failed: \(http.statusCode)")
                completion(false)
            }
        }.resume()
    }

    // MARK: - Training plan completion

    // Danske 3-bogstavsnavne for ugedage (matcher weekPlan i App.js)
    private func todayShortDa() -> String {
        let days = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"]
        let weekday = Calendar.current.component(.weekday, from: Date())
        // Calendar.weekday: 1=Sunday..7=Saturday
        return days[weekday - 1]
    }

    func markTodayCompleted() {
        guard let token = AuthManager.shared.token, !token.isEmpty else { return }
        let serverUrl = AuthManager.shared.serverUrl
        guard let url = URL(string: "\(serverUrl)/trainingplan") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30

        session.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self, let data = data, error == nil else { return }
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { return }

            // Parse { data: [...], generated_at: ... }
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
            guard var planData = json["data"] as? [[String: Any]] else { return }

            let today = self.todayShortDa()
            let dateFormatter = ISO8601DateFormatter()
            var changed = false
            for i in 0..<planData.count {
                if let day = planData[i]["day"] as? String, day == today {
                    let wasCompleted = (planData[i]["completed"] as? Bool) ?? false
                    if !wasCompleted {
                        planData[i]["completed"] = true
                        planData[i]["completedAt"] = dateFormatter.string(from: Date())
                        changed = true
                    }
                    break
                }
            }
            if !changed { return }

            self.saveTrainingPlan(planData)
        }.resume()
    }

    private func saveTrainingPlan(_ planData: [[String: Any]]) {
        guard let token = AuthManager.shared.token, !token.isEmpty else { return }
        let serverUrl = AuthManager.shared.serverUrl
        guard let url = URL(string: "\(serverUrl)/trainingplan/save") else { return }

        let body: [String: Any] = ["data": planData]
        guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = bodyData
        request.timeoutInterval = 30

        session.dataTask(with: request) { _, response, _ in
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { return }
            // Opdater ogsaa lokal TrainingManager state direkte
            DispatchQueue.main.async {
                if var t = TrainingManager.shared.todayTraining {
                    let updated = TrainingDay(
                        name: t.name,
                        km: t.km,
                        description: t.description,
                        pace: t.pace,
                        timestamp: t.timestamp,
                        completed: true,
                        completedAt: ISO8601DateFormatter().string(from: Date())
                    )
                    TrainingManager.shared.todayTraining = updated
                }
            }
        }.resume()
    }

}
