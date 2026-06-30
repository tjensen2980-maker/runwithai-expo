import Foundation
import CoreLocation
import React

// BackgroundLocationModule
// Native baggrunds-GPS via CLBackgroundActivitySession (iOS 17+) med fallback
// til allowsBackgroundLocationUpdates paa aeldre iOS. Koerer uafhaengigt af
// JS-traaden saa tracking fortsaetter naar skaermen er slukket/laast.
@objc(BackgroundLocationModule)
class BackgroundLocationModule: RCTEventEmitter, CLLocationManagerDelegate {

  private let manager = CLLocationManager()
  private var hasListeners = false
  private var isTracking = false

  // Holdes som Any fordi typen kun findes paa iOS 17+
  private var bgSession: Any?

  // Til at drive Live Activity direkte fra native (uafhaengigt af JS).
  private var startTime: Date?
  private var totalDistance: CLLocationDistance = 0
  private var lastLoc: CLLocation?
  private var nativeFireCount = 0
  private var sessionCreated = false

  override init() {
    super.init()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
    manager.distanceFilter = kCLDistanceFilterNone
    manager.activityType = .fitness
    manager.pausesLocationUpdatesAutomatically = false
    manager.allowsBackgroundLocationUpdates = true
    manager.showsBackgroundLocationIndicator = true
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool { return false }

  override func supportedEvents() -> [String]! {
    return ["onLocation", "onError"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  @objc(start:rejecter:)
  func start(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let status = self.manager.authorizationStatus
      if status == .notDetermined {
        self.manager.requestAlwaysAuthorization()
      }

      if #available(iOS 17.0, *) {
        // Nyeste Apple-anbefalede API: holder en aegte baggrundssession i live.
        if self.bgSession == nil {
          self.bgSession = CLBackgroundActivitySession()
          self.sessionCreated = true
        }
      }

      self.manager.startUpdatingLocation();
      self.isTracking = true
      self.startTime = Date()
      self.totalDistance = 0
      self.lastLoc = nil
      resolve(true)
    }
  }

  @objc(stop:rejecter:)
  func stop(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.manager.stopUpdatingLocation()
      if #available(iOS 17.0, *) {
        (self.bgSession as? CLBackgroundActivitySession)?.invalidate()
      }
      self.bgSession = nil
      self.isTracking = false
      resolve(true)
    }
  }

  @objc(isTracking:rejecter:)
  func isTrackingState(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(self.isTracking)
  }

  // MARK: - CLLocationManagerDelegate

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    self.nativeFireCount += 1
    // hasListeners-guard fjernet: distance + Live Activity skal opdateres ogsaa i baggrund
    for loc in locations {
      let body: [String: Any] = [
        "latitude": loc.coordinate.latitude,
        "longitude": loc.coordinate.longitude,
        "accuracy": loc.horizontalAccuracy,
        "speed": loc.speed,
        "altitude": loc.altitude,
        "timestamp": loc.timestamp.timeIntervalSince1970 * 1000.0,
        "nativeFireCount": self.nativeFireCount,
        "sessionCreated": self.sessionCreated
      ]
      if self.hasListeners { self.sendEvent(withName: "onLocation", body: body) }
        // Akkumuler distance til Live Activity (kun gyldige punkter).
        if loc.horizontalAccuracy >= 0 {
          if let prev = self.lastLoc {
            let d = loc.distance(from: prev)
            if d.isFinite && d < 200 { self.totalDistance += d }
          }
          self.lastLoc = loc
        }
    }
      // Opdater Live Activity direkte fra native, saa laaseskaermen ikke hakker
      // naar JS-traaden er suspenderet.
      // DEAKTIVERET: native didUpdateLocations fyrer ikke paalideligt; JS driver Live Activity via LiveActivity.update
      // if #available(iOS 16.2, *) {
        // let dur = Int(Date().timeIntervalSince(self.startTime ?? Date()))
        // let km = self.totalDistance / 1000.0
        // let pace = km > 0.01 ? (Double(dur) / 60.0) / km : 0
        // LiveActivityModule.updateContent(distanceMeters: self.totalDistance, durationSeconds: dur, paceMinPerKm: pace, isPaused: false)
      // }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    guard self.hasListeners else { return }
    self.sendEvent(withName: "onError", body: ["message": error.localizedDescription])
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    // Hvis vi faar Always mens tracking koerer, sikrer vi at updates er aktive.
    if self.isTracking {
      manager.startUpdatingLocation()
    }
  }
}
