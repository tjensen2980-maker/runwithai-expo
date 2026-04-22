import Foundation
import Combine

class WorkoutStore: ObservableObject {
    static let shared = WorkoutStore()

    private let storageKey = "runwithai.workouts"

    @Published private(set) var workouts: [Workout] = []

    init() {
        load()
    }

    func save(_ workout: Workout) {
        workouts.append(workout)
        persist()
    }

    func markSynced(id: String) {
        if let idx = workouts.firstIndex(where: { $0.id == id }) {
            workouts[idx].synced = true
            persist()
        }
    }

    func remove(id: String) {
        workouts.removeAll { $0.id == id }
        persist()
    }

    var pendingSync: [Workout] {
        workouts.filter { !$0.synced }
    }

    private func persist() {
        do {
            let data = try JSONEncoder().encode(workouts)
            UserDefaults.standard.set(data, forKey: storageKey)
        } catch {
            print("Persist error: \(error)")
        }
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return }
        do {
            workouts = try JSONDecoder().decode([Workout].self, from: data)
        } catch {
            print("Load error: \(error)")
            workouts = []
        }
    }
}
