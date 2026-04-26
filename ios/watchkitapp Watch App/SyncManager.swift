import Foundation
import Combine

class SyncManager: ObservableObject {
    static let shared = SyncManager()
    @Published var aiSuggestion: [String: Any]? = nil
    @Published var aiLoading: Bool = false

    @Published var isSyncing: Bool = false
    @Published var lastSyncStatus: String = "Aldrig synket"
    @Published var lastSyncDate: Date?
    @Published var lastTrainingSyncStatus: String = "-"

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
        self.markTodayCompleted()
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
        DispatchQueue.main.async { self.lastTrainingSyncStatus = "Starter" }
        guard let token = AuthManager.shared.token, !token.isEmpty else { return }
        let serverUrl = AuthManager.shared.serverUrl
        guard let url = URL(string: "\(serverUrl)/trainingplan") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        request.timeoutInterval = 30

        session.dataTask(with: request) { [weak self] data, response, error in
            if let e = error { print("WATCH markTodayCompleted GET error: \(e)"); return }
            guard let self = self, let data = data else { print("WATCH markTodayCompleted: no data"); return }
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            DispatchQueue.main.async { SyncManager.shared.lastTrainingSyncStatus = "GET \(status)" }
            print("WATCH GET /trainingplan status: \(status)")
            guard (200...299).contains(status) else { if let s = String(data: data, encoding: .utf8) { print("WATCH GET body: \(s)") }; return }

            // Parse { data: [...], generated_at: ... }
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { DispatchQueue.main.async { SyncManager.shared.lastTrainingSyncStatus = "JSON parse fail" }; return }
            var planData: [[String: Any]] = []
            if let arr = json["data"] as? [[String: Any]] {
                planData = arr
            } else if let str = json["data"] as? String, let strData = str.data(using: .utf8), let arr2 = try? JSONSerialization.jsonObject(with: strData) as? [[String: Any]] {
                planData = arr2
            } else {
                DispatchQueue.main.async { SyncManager.shared.lastTrainingSyncStatus = "data type fail" }
                return
            }

            let today = self.todayShortDa()
            self.buildTodayTrainingFromPlan(planData, today: today)
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
            if !changed { DispatchQueue.main.async { SyncManager.shared.lastTrainingSyncStatus = "Ingen match \(today)" }; return }

            self.saveTrainingPlan(planData)
        }.resume()
    }

    
    private func buildTodayTrainingFromPlan(_ planData: [[String: Any]], today: String) {
        for entry in planData {
            guard let day = entry["day"] as? String, day == today else { continue }
            let name = (entry["workout"] as? String) ?? (entry["name"] as? String) ?? "Daglig traening"
            var km: Double = 0
            if let v = entry["km"] as? Double { km = v }
            else if let v = entry["km"] as? Int { km = Double(v) }
            else if let v = entry["km"] as? NSNumber { km = v.doubleValue }
            let desc = (entry["description"] as? String) ?? ""
            let pace = (entry["pace"] as? String) ?? ""
            let completed = (entry["completed"] as? Bool) ?? false
            let completedAt = (entry["completedAt"] as? String) ?? ""
            let ts = Date().timeIntervalSince1970 * 1000
            let training = TrainingDay(name: name, km: km, description: desc, pace: pace, timestamp: ts, completed: completed, completedAt: completedAt)
            DispatchQueue.main.async {
                TrainingManager.shared.todayTraining = training
                TrainingManager.shared.hasTraining = true
            }
            break
        }
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
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            DispatchQueue.main.async { SyncManager.shared.lastTrainingSyncStatus = "POST \(status)" }
            print("WATCH POST /trainingplan/save status: \(status)")
            guard (200...299).contains(status) else { return }
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


    
    
    private func formatRunsForAI(_ runs: [[String: Any]]) -> String {
        if runs.isEmpty { return "Ingen tidligere loeb registreret." }
        var sumKm: Double = 0
        var lines: [String] = []
        for r in runs {
            let km = (r["km"] as? Double) ?? (r["km"] as? NSNumber).map { $0.doubleValue } ?? 0
            sumKm += km
            let pace = (r["pace_secs_per_km"] as? Double) ?? 0
            let date = (r["date"] as? String) ?? (r["created_at"] as? String) ?? ""
            let type = (r["type"] as? String) ?? "run"
            let paceMin = Int(pace) / 60
            let paceSec = Int(pace) % 60
            let paceStr = pace > 0 ? "\(paceMin):\(String(format: "%02d", paceSec))/km" : "?"
            lines.append("\(String(format: "%.1f", km))km @ \(paceStr) (\(type)) \(date)")
        }
        return "Seneste \(runs.count) loeb (total \(String(format: "%.1f", sumKm))km): " + lines.joined(separator: "; ")
    }

    private func fetchRecentRuns(limit: Int = 5, completion: @escaping ([[String: Any]]) -> Void) {
        guard let token = AuthManager.shared.token, !token.isEmpty else {
            completion([])
            return
        }
        let serverUrl = AuthManager.shared.serverUrl
        guard let url = URL(string: "\(serverUrl)/runs") else {
            completion([])
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        URLSession.shared.dataTask(with: request) { data, _, _ in
            guard let data = data else { completion([]); return }
            if let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                completion(Array(arr.prefix(limit)))
            } else if let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let arr = dict["runs"] as? [[String: Any]] {
                completion(Array(arr.prefix(limit)))
            } else {
                completion([])
            }
        }.resume()
    }

    func fetchWorkoutSuggestion(type: String) {
        // Check cache (24 timer)
        let cacheKey = "ai_sugg_\(type)"
        let cacheTimeKey = "ai_sugg_time_\(type)"
        if let cachedTime = UserDefaults.standard.object(forKey: cacheTimeKey) as? Date,
           Date().timeIntervalSince(cachedTime) < 86400,
           let cachedData = UserDefaults.standard.data(forKey: cacheKey),
           let dict = try? JSONSerialization.jsonObject(with: cachedData) as? [String: Any] {
            DispatchQueue.main.async { self.aiSuggestion = dict }
            return
        }
        guard let token = AuthManager.shared.token, !token.isEmpty else { return }
        let serverUrl = AuthManager.shared.serverUrl
        guard let url = URL(string: "\(serverUrl)/chat") else { return }
        DispatchQueue.main.async { self.aiLoading = true }
        let systemPrompt = "Du er en ekspert loebecoach. Generer et konkret traeningsforslag paa dansk. Svar KUN i dette JSON-format uden markdown: {\"intro\":\"kort beskrivelse 1-2 saetninger\",\"steps\":[\"trin 1\",\"trin 2\"],\"total_km\":5.0,\"total_min\":30,\"intensity\":\"Z3-Z4\"}"
        let userMsg = "Foreslaa en \(type)-traening for mig. Giv konkrete distancer, tid og intensitetszoner."
        let body: [String: Any] = [
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 400,
            "system": systemPrompt,
            "messages": [["role": "user", "content": userMsg]]
        ]
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: request) { data, _, _ in
            DispatchQueue.main.async { self.aiLoading = false }
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let content = json["content"] as? [[String: Any]],
                  let first = content.first,
                  let text = first["text"] as? String else { return }
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard let tData = trimmed.data(using: .utf8),
                  let dict = try? JSONSerialization.jsonObject(with: tData) as? [String: Any] else { return }
            UserDefaults.standard.set(tData, forKey: cacheKey)
            UserDefaults.standard.set(Date(), forKey: cacheTimeKey)
            DispatchQueue.main.async { self.aiSuggestion = dict }
        }.resume()
    }

}