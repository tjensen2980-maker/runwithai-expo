import Foundation
import CoreLocation
import Combine
import HealthKit

class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    @Published var distance: Double = 0.0
    @Published var currentPace: Double = 0.0
    @Published var isTracking: Bool = false
    @Published var authStatus: CLAuthorizationStatus = .notDetermined
    @Published var debugMessage: String = "Init"
    @Published var currentAccuracy: Double = 0.0

    private var lastLocation: CLLocation?
    private(set) var route: [CLLocation] = []
    private var startTime: Date?
    private var pendingStart: Bool = false

    // HealthKit workout session - holder app aktiv i baggrunden
    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?

    // Konstanter for præcision
    private let maxAcceptableAccuracy: Double = 20.0   // Kun GPS bedre end 20m
    private let minimumDistanceBetweenPoints: Double = 3.0  // Min 3m mellem punkter
    private let maximumJumpDistance: Double = 100.0    // Smid teleporter > 100m/sek
    private let warmupSeconds: TimeInterval = 5.0      // Smid første 5 sek af GPS

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        manager.distanceFilter = 1.0   // Få alle bevægelser
        manager.activityType = .fitness
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
        currentAccuracy = 0.0
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
            debugMessage = "GPS warming up..."
            manager.startUpdatingLocation()
            startWorkoutSession()
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
        pauseWorkoutSession()
        debugMessage = "Paused"
    }

    func resumeTracking() {
        manager.startUpdatingLocation()
        resumeWorkoutSession()
        debugMessage = "Resumed"
        // Reset lastLocation så vi ikke får stort distance-jump
        lastLocation = nil
    }

    func stopTracking() {
        manager.stopUpdatingLocation()
        stopWorkoutSession()
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
                self.debugMessage = "GPS warming up..."
                self.manager.startUpdatingLocation()
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard isTracking else { return }
        guard let workoutStart = startTime else { return }

        for newLocation in locations {
            // 1. Smid dårlig accuracy
            guard newLocation.horizontalAccuracy > 0 && newLocation.horizontalAccuracy < maxAcceptableAccuracy else {
                debugMessage = "Skip: \(Int(newLocation.horizontalAccuracy))m"
                continue
            }

            // 2. Smid for gamle locations (cached)
            let age = Date().timeIntervalSince(newLocation.timestamp)
            guard age < 5.0 else {
                continue
            }

            // 3. Smid warm-up periode (første 5 sek)
            let elapsed = Date().timeIntervalSince(workoutStart)
            if elapsed < warmupSeconds {
                debugMessage = "Warmup: \(Int(elapsed))s"
                continue
            }

            currentAccuracy = newLocation.horizontalAccuracy

            if let last = lastLocation {
                let delta = newLocation.distance(from: last)
                let timeDelta = newLocation.timestamp.timeIntervalSince(last.timestamp)

                // 4. Smid mikro-bevægelser (GPS drift mens stille)
                guard delta >= minimumDistanceBetweenPoints else {
                    continue
                }

                // 5. Smid teleporter (urealistiske spring)
                if timeDelta > 0 {
                    let speedMps = delta / timeDelta
                    if speedMps > 8.0 {  // > 54 km/t = sandsynligvis fejl
                        debugMessage = "Skip jump: \(Int(speedMps))m/s"
                        continue
                    }
                }

                distance += delta
            }

            lastLocation = newLocation
            route.append(newLocation)
            debugMessage = "GPS: \(Int(newLocation.horizontalAccuracy))m, \(route.count) pkt"

            if distance > 0 {
                let elapsedSecs = Date().timeIntervalSince(workoutStart)
                let km = distance / 1000.0
                if km > 0.01 {
                    currentPace = (elapsedSecs / 60.0) / km
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

    // MARK: - Workout Session (holder app aktiv i baggrunden)

    private func startWorkoutSession() {
        guard workoutSession == nil else { return }
        let config = HKWorkoutConfiguration()
        config.activityType = .walking
        config.locationType = .outdoor
        do {
            let session = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            workoutSession = session
            session.startActivity(with: Date())
        } catch {
            debugMessage = "WS err"
        }
    }

    private func pauseWorkoutSession() {
        workoutSession?.pause()
    }

    private func resumeWorkoutSession() {
        workoutSession?.resume()
    }

    private func stopWorkoutSession() {
        workoutSession?.end()
        workoutSession = nil
    }

}
