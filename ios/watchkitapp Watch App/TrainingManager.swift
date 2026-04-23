import Foundation
import WatchConnectivity
import Combine

class TrainingManager: NSObject, ObservableObject {
    static let shared = TrainingManager()

    @Published var todayTraining: TrainingDay?
    @Published var hasTraining: Bool = false

    private let todayKey = "runwithai.training.today"

    override init() {
        super.init()
        loadFromStorage()
    }

    private func loadFromStorage() {
        if let data = UserDefaults.standard.data(forKey: todayKey),
           let decoded = try? JSONDecoder().decode(TrainingDay.self, from: data) {
            todayTraining = decoded
            hasTraining = true
        }
    }

    private func persist() {
        if let t = todayTraining,
           let data = try? JSONEncoder().encode(t) {
            UserDefaults.standard.set(data, forKey: todayKey)
        }
    }

    // Kaldet af AuthManager/delegate naar en TODAY_TRAINING besked modtages
    func apply(_ dict: [String: Any]) {
        guard let type = dict["type"] as? String, type == "TODAY_TRAINING" else { return }

        let name = (dict["name"] as? String) ?? "Daglig traening"
        let km: Double = {
            if let v = dict["km"] as? Double { return v }
            if let v = dict["km"] as? Int { return Double(v) }
            if let v = dict["km"] as? NSNumber { return v.doubleValue }
            return 0
        }()
        let description = (dict["description"] as? String) ?? ""
        let pace = (dict["pace"] as? String) ?? ""
        let ts = (dict["timestamp"] as? Double) ?? Date().timeIntervalSince1970 * 1000
        let completed = (dict["completed"] as? Bool) ?? false
        let completedAt = (dict["completedAt"] as? String) ?? ""

        let training = TrainingDay(
            name: name,
            km: km,
            description: description,
            pace: pace,
            timestamp: ts,
            completed: completed,
            completedAt: completedAt
        )

        DispatchQueue.main.async {
            self.todayTraining = training
            self.hasTraining = true
            self.persist()
        }
    }

    func clearTraining() {
        DispatchQueue.main.async {
            self.todayTraining = nil
            self.hasTraining = false
            UserDefaults.standard.removeObject(forKey: self.todayKey)
        }
    }
}
