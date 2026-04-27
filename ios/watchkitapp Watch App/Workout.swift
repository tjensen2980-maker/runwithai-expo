import Foundation
import CoreLocation

struct HrSample: Codable {
    let t: Date
    let bpm: Int
}

struct Workout: Codable, Identifiable {
    let id: String
    let startTime: Date
    let endTime: Date
    let durationSeconds: Int
    let distanceMeters: Double
    let averagePaceMinPerKm: Double
    let type: String
    let route: [RoutePoint]
    var synced: Bool

    var hrSamples: [HrSample] = []
    var avgHr: Int = 0
    var maxHr: Int = 0
    var totalAscent: Double = 0
    var totalDescent: Double = 0
    var activeKcal: Double = 0
    var totalSteps: Int = 0
    var cadence: Int = 0

    struct RoutePoint: Codable {
        let lat: Double
        let lon: Double
        let timestamp: Date
        let altitude: Double

        init(from location: CLLocation) {
            self.lat = location.coordinate.latitude
            self.lon = location.coordinate.longitude
            self.timestamp = location.timestamp
            self.altitude = location.altitude
        }
    }

    static func calculatePace(durationSec: Int, distanceMeters: Double) -> Double {
        guard distanceMeters > 0 else { return 0 }
        let minutes = Double(durationSec) / 60.0
        let km = distanceMeters / 1000.0
        return minutes / km
    }
}
