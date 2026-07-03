import Foundation
import CoreLocation
import React

// BackgroundLocationModule
// Native baggrunds-GPS via CLBackgroundActivitySession (iOS 17+) med fallback
// til allowsBackgroundLocationUpdates paa aeldre iOS. Koerer uafhaengigt af
// JS-traaden saa tracking fortsaetter naar skaermen er slukket/laast.
//
// ROOT CAUSE-FIX (suspension efter ~40-55 sek i baggrunden):
// requiresMainQueueSetup returnerer nu TRUE. Foer blev modulet - og dermed
// CLLocationManager i init() - oprettet paa en React Native-baggrundstraad
// UDEN run loop. CoreLocation leverer delegate-callbacks paa den traad hvor
// manageren blev SKABT, og en traad uden koerende run loop faar kun callbacks
// naar noget andet (forgrund eller keep-alive lyd) holder maskineriet i gang.
// Derfor "doede" GPS i baggrunden praecis naar lyden roeg (Bluetooth/Saphe/
// Spotify/opkald), og derfor virkede native Live Activity aldrig paalideligt.
// Nu skabes manageren paa main-traaden, hvis run loop ALTID koerer naar
// processen faar CPU - og med UIBackgroundModes=location vaekker iOS netop
// processen ved hver ny position. Lyd-hacket er ikke laengere baerende for GPS.
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

  // [DIAG] Heartbeat: 1s-timer paa main run loop. Suspenderes processen,
  // fryser timeren og maxHeartbeatGap afsloerer det. Koerer timeren ubrudt
  // mens lokations-leveringen har huller, er det CoreLocation der throttler.
  private var heartbeatTimer: Timer?
  private var lastHeartbeat: Date?
  private var maxHeartbeatGap: TimeInterval = 0
  private var didFailCount = 0
  private var pauseCount = 0
  private var resumeCount = 0

  // Native buffer: gemmer locations selv naar JS-traaden er suspenderet (laast skaerm)
  private var bufferedLocations: [[String: Any]] = []
  private let bufferQueue = DispatchQueue(label: "backgroundlocation.buffer")
  private let maxBufferSize = 10000

  override init() {
    super.init()
    // Koerer nu paa MAIN-traaden (requiresMainQueueSetup = true), saa
    // CLLocationManager skabes paa en traad med permanent run loop og
    // delegate-callbacks leveres paalideligt - ogsaa i baggrunden.
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
    manager.distanceFilter = kCLDistanceFilterNone
    manager.activityType = .otherNavigation
    manager.pausesLocationUpdatesAutomatically = false
    manager.allowsBackgroundLocationUpdates = true
    manager.showsBackgroundLocationIndicator = true
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool { return true }

  override func supportedEvents() -> [String]! {
    return ["onLocation", "onError"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  @objc(start:rejecter:)
  func start(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    // GUARD: allerede i gang -> genstart IKKE. At genskabe CLBackgroundActivitySession
    // mens appen er i baggrunden giver en UGYLDIG session og invaliderer den gamle,
    // saa appen mister baggrundsretten og iOS suspenderer den (89s-hullerne).
    if isTracking {
      resolve(true)
      return
    }
    DispatchQueue.main.async {
      let status = self.manager.authorizationStatus
      if status == .notDetermined {
        self.manager.requestAlwaysAuthorization()
      }

      // Nulstil per-tur diagnostik og buffer. Foer var nativeFireCount og
      // sessionCreated KUMULATIVE paa tvaers af ture i samme app-session,
      // saa nf/sc i notes viste misvisende tal. Bufferen toemmes saa gamle
      // punkter fra forrige tur ikke laekker ind i den nye.
      self.nativeFireCount = 0
      self.sessionCreated = false
      self.bufferQueue.sync { self.bufferedLocations = [] }
      self.maxHeartbeatGap = 0
      self.didFailCount = 0
      self.pauseCount = 0
      self.resumeCount = 0

      if #available(iOS 17.0, *) {
        // Nyeste Apple-anbefalede API: holder en aegte baggrundssession i live.
        if self.bgSession == nil {
          self.bgSession = CLBackgroundActivitySession()
          self.sessionCreated = true
        }
      }

      // Genhaevd baggrundsrettigheder ved HVER start (ikke kun i init).
      self.manager.allowsBackgroundLocationUpdates = true
      self.manager.pausesLocationUpdatesAutomatically = false
      self.manager.startUpdatingLocation()
      // [DIAG] Start heartbeat
      self.lastHeartbeat = Date()
      self.heartbeatTimer?.invalidate()
      self.heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
        guard let s = self else { return }
        let now = Date()
        if let last = s.lastHeartbeat {
          let gap = now.timeIntervalSince(last)
          if gap > s.maxHeartbeatGap { s.maxHeartbeatGap = gap }
        }
        s.lastHeartbeat = now
      }
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
      self.heartbeatTimer?.invalidate()
      self.heartbeatTimer = nil
      if #available(iOS 17.0, *) {
        (self.bgSession as? CLBackgroundActivitySession)?.invalidate()
      }
      self.bgSession = nil
      self.isTracking = false
      // totalDistance/startTime bevares saa getStats stadig kan aflaeses
      // af JS-save-flowet EFTER stop. Nulstilles ved naeste start.
      resolve(true)
    }
  }

  @objc(isTracking:rejecter:)
  func isTrackingState(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(self.isTracking)
  }

  // Native stats: JS kan afstemme distance/varighed efter perioder hvor
  // JS-traaden var frosset. Native er sandhedskilden - dette er broen.
  @objc(getStats:rejecter:)
  func getStats(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let duration = self.startTime != nil ? Date().timeIntervalSince(self.startTime!) : 0
      resolve([
        "totalDistance": self.totalDistance,
        "durationSeconds": duration,
        "nativeFireCount": self.nativeFireCount,
        "sessionCreated": self.sessionCreated,
        "maxHeartbeatGap": self.maxHeartbeatGap,
        "didFailCount": self.didFailCount,
        "pauseCount": self.pauseCount,
        "resumeCount": self.resumeCount,
        "isTracking": self.isTracking
      ])
    }
  }

  // Thread-sikker append til native buffer (kaldt fra didUpdateLocations)
  private func appendToBuffer(_ item: [String: Any]) {
    bufferQueue.sync {
      bufferedLocations.append(item)
      if bufferedLocations.count > maxBufferSize {
        bufferedLocations.removeFirst(bufferedLocations.count - maxBufferSize)
      }
    }
  }

  @objc(getBufferedLocations:rejecter:)
  func getBufferedLocations(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    bufferQueue.sync {
      let drained = bufferedLocations
      bufferedLocations = []
      resolve(drained)
    }
  }

  @objc(getBufferSize:rejecter:)
  func getBufferSize(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    bufferQueue.sync {
      resolve(bufferedLocations.count)
    }
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
      self.appendToBuffer(body)
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
      // DEAKTIVERET INDTIL VIDERE - men med main queue-fixet leveres callbacks
      // nu paalideligt, saa dette kan genaktiveres og testes i en senere build.
      // if #available(iOS 16.2, *) {
        // let dur = Int(Date().timeIntervalSince(self.startTime ?? Date()))
        // let km = self.totalDistance / 1000.0
        // let pace = km > 0.01 ? (Double(dur) / 60.0) / km : 0
        // LiveActivityModule.updateContent(distanceMeters: self.totalDistance, durationSeconds: dur, paceMinPerKm: pace, isPaused: false)
      // }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    self.didFailCount += 1
    guard self.hasListeners else { return }
    self.sendEvent(withName: "onError", body: ["message": error.localizedDescription])
  }

  func locationManagerDidPauseLocationUpdates(_ manager: CLLocationManager) {
    self.pauseCount += 1
  }

  func locationManagerDidResumeLocationUpdates(_ manager: CLLocationManager) {
    self.resumeCount += 1
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    // Hvis vi faar Always mens tracking koerer, sikrer vi at updates er aktive.
    if self.isTracking {
      manager.startUpdatingLocation()
    }
  }
}
