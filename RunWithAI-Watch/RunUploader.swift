import Foundation

// MARK: - RunUploader
// Uploader løbedata direkte fra Apple Watch til Railway API.
// Gemmer JWT token fra iPhone (via WatchConnectivity).
// Hvis upload fejler, gemmes løbet lokalt og prøves igen næste gang.

class RunUploader {
    static let shared = RunUploader()

    private let serverURL = "https://runwithai.app"
    private let pendingRunsKey = "pendingRuns"
    private let jwtTokenKey = "watchJwtToken"

    // MARK: - JWT Token (modtaget fra iPhone via WatchConnectivity)
    var jwtToken: String? {
        get { UserDefaults.standard.string(forKey: jwtTokenKey) }
        set { UserDefaults.standard.set(newValue, forKey: jwtTokenKey) }
    }

    var hasToken: Bool { !(jwtToken?.isEmpty ?? true) }

    // MARK: - Upload løb til Railway
    func uploadRun(from manager: WorkoutManager) {
        let splitData = manager.splits.map { split -> [String: Any] in
            ["km": split.km, "pace": split.pace, "time": split.time, "heartRate": split.heartRate]
        }

        let distanceKm = manager.distance / 1000.0
        let durationSecs = manager.elapsedSeconds
        let paceSecsPerKm = distanceKm > 0 ? Double(durationSecs) / distanceKm : 0

        let run: [String: Any] = [
            "km": round(distanceKm * 100) / 100,
            "duration": durationSecs,
            "duration_secs": durationSecs,
            "pace": round(paceSecsPerKm * 10) / 10,
            "pace_secs_per_km": round(paceSecsPerKm * 10) / 10,
            "heart_rate": manager.heartRate,
            "avg_hr": manager.heartRate,
            "cadence": manager.currentCadence,
            "total_ascent": manager.totalAscent,
            "total_descent": manager.totalDescent,
            "total_steps": manager.totalSteps,
            "splits": splitData,
            "date": ISO8601DateFormatter().string(from: Date()),
            "source": "apple_watch",
        ]

        attemptUpload(run: run)
    }

    // MARK: - Forsøg upload (med retry-kø)
    private func attemptUpload(run: [String: Any]) {
        guard hasToken else {
            print("[RunUploader] Ingen JWT token – gemmer til kø")
            savePending(run: run)
            return
        }

        guard let token = jwtToken,
              let url = URL(string: "\(serverURL)/runs"),
              let body = try? JSONSerialization.data(withJSONObject: run) else {
            savePending(run: run)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = body
        request.timeoutInterval = 30

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("[RunUploader] Upload fejlede: \(error.localizedDescription) – gemmer til kø")
                self.savePending(run: run)
                return
            }
            if let httpResponse = response as? HTTPURLResponse {
                if httpResponse.statusCode == 200 || httpResponse.statusCode == 201 {
                    print("[RunUploader] ✅ Upload lykkedes!")
                    // Prøv at uploade eventuelle ventende løb
                    self.retryPending()
                } else if httpResponse.statusCode == 401 {
                    print("[RunUploader] 401 Unauthorized – token udløbet, gemmer til kø")
                    self.savePending(run: run)
                } else {
                    print("[RunUploader] Server svarede \(httpResponse.statusCode) – gemmer til kø")
                    self.savePending(run: run)
                }
            }
        }.resume()
    }

    // MARK: - Gem til lokal kø (UserDefaults)
    private func savePending(run: [String: Any]) {
        var queue = loadPendingQueue()
        // Tilføj timestamp hvis ikke der
        var runWithTimestamp = run
        if runWithTimestamp["queued_at"] == nil {
            runWithTimestamp["queued_at"] = Date().timeIntervalSince1970
        }
        queue.append(runWithTimestamp)
        if let data = try? JSONSerialization.data(withJSONObject: queue) {
            UserDefaults.standard.set(data, forKey: pendingRunsKey)
        }
        print("[RunUploader] Gemt til kø (\(queue.count) løb afventer)")
    }

    // MARK: - Prøv ventende løb igen
    func retryPending() {
        guard hasToken else { return }
        let queue = loadPendingQueue()
        guard !queue.isEmpty else { return }
        print("[RunUploader] Prøver \(queue.count) ventende løb igen...")
        // Ryd køen – hvert løb tilføjes igen hvis det fejler
        UserDefaults.standard.removeObject(forKey: pendingRunsKey)
        for run in queue {
            attemptUpload(run: run)
        }
    }

    // MARK: - Indlæs kø
    private func loadPendingQueue() -> [[String: Any]] {
        guard let data = UserDefaults.standard.data(forKey: pendingRunsKey),
              let queue = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            return []
        }
        return queue
    }

    var pendingCount: Int { loadPendingQueue().count }
}
