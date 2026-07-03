import Foundation
import CoreLocation
import React

// BackgroundLocationModule - REN GENSKRIVNING
//
// Bygget direkte paa Apples "Handling location updates in the background":
// CLLocationUpdate.liveUpdates() + CLBackgroundActivitySession (iOS 17+).
// Det moderne API leverer DIAGNOSTIK med hver update: naar iOS ikke leverer
// positioner, fortaeller flagene HVORFOR (stationary, insufficientlyInUse,
// locationUnavailable, auth-problemer). Det er praecis den forklaring paa
// 55-sekunders-suspensionen vi har manglet.
//
// Bridge-interface er 1:1 identisk med den gamle fil (samme klassenavn,
// samme metode-selectors, samme events) - .m-filen, JS-wrapperen og
// RunTracker skal IKKE aendres.
//
// Diagnostik-mapping i getStats (saa notes-koblingen i RunTracker virker
// uaendret): i moderne tilstand betyder felterne:
//   pauseCount (pp)  = antal updates flagget "stationary"
//   resumeCount (rr) = antal updates flagget "insufficientlyInUse"
//   didFailCount (fl)= stream-fejl + auth-denied + serviceSessionRequired
// Paa legacy-stien (iOS < 17) beholder felterne deres gamle betydning.
@objc(BackgroundLocationModule)
class BackgroundLocationModule: RCTEventEmitter, CLLocationManagerDelegate {

  // Legacy manager: bruges kun til auth-forespoergsel + fallback paa iOS < 17.
  private let manager = CLLocationManager()
  private var hasListeners = false
  private var isTracking = false
  private var usingLegacyPath = false

  // Holdes som Any fordi typerne kun findes paa iOS 17+
  private var bgSession: Any?
  private var liveTask: Any?

  // Stats (laeses af JS via getStats efter stop)
  private var startTime: Date?
  private var totalDistance: CLLocationDistance = 0
  private var lastLoc: CLLocation?
  private var nativeFireCount = 0
  private var sessionCreated = false

  // [DIAG] Heartbeat: 1s-timer paa main run loop. Suspenderes processen,
  // fryser timeren og maxHeartbeatGap afsloerer det.
  private var heartbeatTimer: Timer?
  private var lastHeartbeat: Date?
  private var maxHeartbeatGap: TimeInterval = 0

  // [DIAG] Taellere - se mapping-note oeverst.
  private var didFailCount = 0
  private var pauseCount = 0
  private var resumeCount = 0

  // Native buffer: gemmer locations selv naar JS-traaden er frosset.
  private var bufferedLocations: [[String: Any]] = []
  private let bufferQueue = DispatchQueue(label: "backgroundlocation.buffer")
  private let maxBufferSize = 10000

  override init() {
    super.init()
    // requiresMainQueueSetup=true -> init koerer paa main-traaden.
    manager.delegate = self
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool { return true }

  override func supportedEvents() -> [String]! {
    return ["onLocation", "onError"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  // MARK: - Start / Stop

  @objc(start:rejecter:)
  func start(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    // GUARD: allerede i gang -> genstart IKKE (en session genskabt i
    // baggrunden er ugyldig og koster baggrundsretten).
    if isTracking {
      resolve(true)
      return
    }
    DispatchQueue.main.async {
      if self.manager.authorizationStatus == .notDetermined {
        self.manager.requestAlwaysAuthorization()
      }

      // Nulstil per-tur stats/diagnostik og buffer.
      self.nativeFireCount = 0
      self.sessionCreated = false
      self.maxHeartbeatGap = 0
      self.didFailCount = 0
      self.pauseCount = 0
      self.resumeCount = 0
      self.totalDistance = 0
      self.lastLoc = nil
      self.startTime = Date()
      self.bufferQueue.sync { self.bufferedLocations = [] }

      if #available(iOS 17.0, *) {
        self.usingLegacyPath = false
        self.startModernLiveUpdates()
      } else {
        self.usingLegacyPath = true
        self.startLegacyUpdates()
      }

      self.isTracking = true
      self.startHeartbeat()
      resolve(true)
    }
  }

  @objc(stop:rejecter:)
  func stop(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if #available(iOS 17.0, *) {
        (self.liveTask as? Task<Void, Never>)?.cancel()
        self.liveTask = nil
        (self.bgSession as? CLBackgroundActivitySession)?.invalidate()
      }
      self.bgSession = nil
      self.manager.stopUpdatingLocation() // harmloes hvis legacy ikke koerte
      self.heartbeatTimer?.invalidate()
      self.heartbeatTimer = nil
      self.isTracking = false
      // totalDistance/startTime/diagnostik bevares saa getStats kan
      // aflaeses af JS-save-flowet EFTER stop. Nulstilles ved naeste start.
      resolve(true)
    }
  }

  @objc(isTracking:rejecter:)
  func isTrackingState(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(self.isTracking)
  }

  // MARK: - Moderne sti (iOS 17+): Apples anbefalede opskrift

  @available(iOS 17.0, *)
  private func startModernLiveUpdates() {
    // Apple-kravet: skab CLBackgroundActivitySession FOER updates startes,
    // mens appen er i forgrunden, og hold en staerk reference.
    let session = CLBackgroundActivitySession()
    self.bgSession = session
    self.sessionCreated = true

    let task = Task { [weak self] in
      do {
        let updates = CLLocationUpdate.liveUpdates(.otherNavigation)
        for try await update in updates {
          if Task.isCancelled { break }
          guard let s = self else { break }
          await MainActor.run {
            s.handleLiveUpdate(update)
          }
        }
      } catch {
        await MainActor.run { [weak self] in
          guard let s = self else { return }
          s.didFailCount += 1
          if s.hasListeners {
            s.sendEvent(withName: "onError", body: ["message": error.localizedDescription])
          }
        }
      }
    }
    self.liveTask = task
  }

  @available(iOS 17.0, *)
  private func handleLiveUpdate(_ update: CLLocationUpdate) {
    self.nativeFireCount += 1

    // [DIAG] Apples egne forklaringer paa manglende levering.
    // isStationary findes fra iOS 17; de oevrige flag fra iOS 18.
    if update.isStationary {
      self.pauseCount += 1 // pp i notes = stationary-events
    }
    if #available(iOS 18.0, *) {
      if update.insufficientlyInUse {
        self.resumeCount += 1 // rr i notes = insufficientlyInUse-events
      }
      if update.authorizationDenied || update.authorizationDeniedGlobally
          || update.authorizationRestricted || update.serviceSessionRequired {
        self.didFailCount += 1 // fl i notes = alvorlige auth/session-problemer
      }
    }

    guard let loc = update.location else { return }
    self.emitAndAccumulate(loc)
  }

  // MARK: - Legacy sti (iOS < 17): klassisk CLLocationManager

  private func startLegacyUpdates() {
    manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
    manager.distanceFilter = kCLDistanceFilterNone
    manager.activityType = .otherNavigation
    manager.pausesLocationUpdatesAutomatically = false
    manager.allowsBackgroundLocationUpdates = true
    manager.showsBackgroundLocationIndicator = true
    manager.startUpdatingLocation()
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard usingLegacyPath else { return }
    self.nativeFireCount += 1
    for loc in locations {
      self.emitAndAccumulate(loc)
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    self.didFailCount += 1
    guard self.hasListeners else { return }
    self.sendEvent(withName: "onError", body: ["message": error.localizedDescription])
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if usingLegacyPath && self.isTracking {
      manager.startUpdatingLocation()
    }
  }

  // MARK: - Faelles levering

  private func emitAndAccumulate(_ loc: CLLocation) {
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
    if loc.horizontalAccuracy >= 0 {
      if let prev = self.lastLoc {
        let d = loc.distance(from: prev)
        if d.isFinite && d < 200 { self.totalDistance += d }
      }
      self.lastLoc = loc
    }
  }

  // MARK: - Heartbeat

  private func startHeartbeat() {
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
  }

  // MARK: - Stats & buffer (uaendret interface)

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
}
