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
}
