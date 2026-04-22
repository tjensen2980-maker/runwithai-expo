import Foundation
import CoreLocation
import Combine

class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    @Published var distance: Double = 0.0
    @Published var currentPace: Double = 0.0
    @Published var isTracking: Bool = false
    @Published var authStatus: CLAuthorizationStatus = .notDetermined
    @Published var debugMessage: String = "Init"

    private var lastLocation: CLLocation?
    private(set) var route: [CLLocation] = []
    private var startTime: Date?
    private var pendingStart: Bool = false

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 5.0
        authStatus = manager.authorizationStatus
        debugMessage = "Auth: \(authStatus.rawValue)"
    }

    func requestPermission() {
        debugMessage = "Requesting perm"
        manager.requestWhenInUseAuthorization()
    }

    func startTracking() {
        distance = 0.0
        currentPace = 0.0
        lastLocation = nil
        route.removeAll()
        startTime = Date()
        isTracking = true

        let status = manager.authorizationStatus
        authStatus = status

        switch status {
        case .notDetermined:
            pendingStart = true
            debugMessage = "Asking permission..."
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            debugMessage = "GPS started"
            manager.startUpdatingLocation()
        case .denied, .restricted:
            debugMessage = "Permission denied"
            isTracking = false
        @unknown default:
            debugMessage = "Unknown auth"
            isTracking = false
        }
    }

    func pauseTracking() {
        manager.stopUpdatingLocation()
        debugMessage = "Paused"
    }

    func resumeTracking() {
        manager.startUpdatingLocation()
        debugMessage = "Resumed"
    }

    func stopTracking() {
        manager.stopUpdatingLocation()
        isTracking = false
        pendingStart = false
        debugMessage = "Stopped"
    }

    // MARK: - CLLocationManagerDelegate

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        DispatchQueue.main.async {
            self.authStatus = status
            self.debugMessage = "Auth changed: \(status.rawValue)"

            if self.pendingStart && (status == .authorizedWhenInUse || status == .authorizedAlways) {
                self.pendingStart = false
                self.debugMessage = "GPS started after auth"
                self.manager.startUpdatingLocation()
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard isTracking else { return }
        for newLocation in locations {
            guard newLocation.horizontalAccuracy > 0 && newLocation.horizontalAccuracy < 50 else { continue }

            if let last = lastLocation {
                let delta = newLocation.distance(from: last)
                if delta > 1.0 {
                    distance += delta
                }
            }
            lastLocation = newLocation
            route.append(newLocation)
            debugMessage = "GPS: \(Int(newLocation.horizontalAccuracy))m"

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
        debugMessage = "Error: \(error.localizedDescription)"
    }

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
