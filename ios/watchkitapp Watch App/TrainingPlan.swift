import Foundation

struct TrainingSession: Codable, Identifiable {
    var id: String { date + name }
    let name: String
    let km: Double
    let description: String
    let pace: String
    let date: String
    let day: String
}

struct TrainingDay: Codable {
    let name: String
    let km: Double
    let description: String
    let pace: String
    let timestamp: Double
    let completed: Bool
    let completedAt: String
}
