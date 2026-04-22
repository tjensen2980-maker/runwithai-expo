import Foundation
import CoreLocation
import Combine

class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    @Published var distance: Double = 0.0          // meter
    @Published var currentPace: Double = 0.0       // min/km
    @Published var isTracking: Bool = false
    @Published var authStatus: CLAuthorizationStatus = .notDetermined

    private var lastLocation: CLLocation?
    private(set) var route: [CLLocation] = []
    private var startTime: Date?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 5.0
        manager.allowsBackgroundLocationUpdates = true
        authStatus = manager.authorizationStatus
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func startTracking() {
        distance = 0.0
        currentPace = 0.0
        lastLocation = nil
        route.removeAll()
        startTime = Date()
        isTracking = true
        manager.startUpdatingLocation()
    }

    func pauseTracking() {
        manager.stopUpdatingLocation()
    }

    func resumeTracking() {
        manager.startUpdatingLocation()
    }

    func stopTracking() {
        manager.stopUpdatingLocation()
        isTracking = false
    }

    // MARK: - CLLocationManagerDelegate

    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        DispatchQueue.main.async { self.authStatus = status }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard isTracking else { return }
        for newLocation in locations {
            // Ignorér dårlig GPS-kvalitet
            guard newLocation.horizontalAccuracy > 0 && newLocation.horizontalAccuracy < 30 else { continue }

            if let last = lastLocation {
                let delta = newLocation.distance(from: last)
                if delta > 1.0 {
                    distance += delta
                }
            }
            lastLocation = newLocation
            route.append(newLocation)

            // Beregn pace (min/km) baseret på sidste 30 sek
            if let start = startTime, distance > 0 {
                let elapsed = Date().timeIntervalSince(start)
                let km = distance / 1000.0
                if km > 0.01 {
                    currentPace = (elapsed / 60.0) / km
                }
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error.localizedDescription)")
    }

    // MARK: - Formateret output

    var formattedDistance: String {
        String(format: "%.2f km", distance / 1000.0)
    }

    var formattedPace: String {
        if currentPace <= 0 || currentPace.isInfinite || currentPace.isNaN { return "--:--" }
        let mins = Int(currentPace)
        let secs = Int((currentPace - Double(mins)) * 60)
        return String(format: "%d:%02d /km", mins, secs)
    }
}
