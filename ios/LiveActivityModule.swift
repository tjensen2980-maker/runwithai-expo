import Foundation
import ActivityKit
import React

// Shared ActivityAttributes - skal matche definitionen i widget extension'en.
// Vigtigt: typenavnet (RunActivityAttributes) skal vaere identisk her og i widget'en
// fordi ActivityKit matcher dem via Swift type-system.
struct RunActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var distanceMeters: Double
    var durationSeconds: Int
    var paceMinPerKm: Double
    var isPaused: Bool
  }

  var activityType: String
  var startedAt: Date
}

@objc(LiveActivityModule)
class LiveActivityModule: NSObject {

  // Vi gemmer aktivitetens ID saa vi kan opdatere/afslutte den senere.
  private static var currentActivityId: String?

  @objc
  static func requiresMainQueueSetup() -> Bool { return false }

  @objc
  func constantsToExport() -> [AnyHashable: Any]! {
    if #available(iOS 16.2, *) {
      return ["isSupported": ActivityAuthorizationInfo().areActivitiesEnabled]
    }
    return ["isSupported": false]
  }

  @objc(isSupported:rejecter:)
  func isSupported(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.2, *) {
      resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
    } else {
      resolve(false)
    }
  }

  @objc(start:resolver:rejecter:)
  func start(params: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.2, *) {
      // Stop tidligere aktivitet hvis der er en (genoptag scenario)
      if let oldId = LiveActivityModule.currentActivityId {
        Task {
          for activity in Activity<RunActivityAttributes>.activities where activity.id == oldId {
            await activity.end(dismissalPolicy: .immediate)
          }
        }
      }

      let activityType = (params["activityType"] as? String) ?? "run"
      let distanceMeters = (params["distanceMeters"] as? NSNumber)?.doubleValue ?? 0
      let durationSeconds = (params["durationSeconds"] as? NSNumber)?.intValue ?? 0
      let paceMinPerKm = (params["paceMinPerKm"] as? NSNumber)?.doubleValue ?? 0
      let isPaused = (params["isPaused"] as? NSNumber)?.boolValue ?? false

      let attributes = RunActivityAttributes(activityType: activityType, startedAt: Date())
      let initialState = RunActivityAttributes.ContentState(
        distanceMeters: distanceMeters,
        durationSeconds: durationSeconds,
        paceMinPerKm: paceMinPerKm,
        isPaused: isPaused
      )

      do {
        let activity = try Activity<RunActivityAttributes>.request(
          attributes: attributes,
          content: .init(state: initialState, staleDate: nil)
        )
        LiveActivityModule.currentActivityId = activity.id
        resolve(activity.id)
      } catch {
        reject("LIVE_ACTIVITY_START_FAILED", error.localizedDescription, error)
      }
    } else {
      reject("LIVE_ACTIVITY_UNSUPPORTED", "Live Activities require iOS 16.2 or later", nil)
    }
  }

  @objc(update:resolver:rejecter:)
  func update(params: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.2, *) {
      guard let activityId = LiveActivityModule.currentActivityId else {
        resolve(false)
        return
      }
      let distanceMeters = (params["distanceMeters"] as? NSNumber)?.doubleValue ?? 0
      let durationSeconds = (params["durationSeconds"] as? NSNumber)?.intValue ?? 0
      let paceMinPerKm = (params["paceMinPerKm"] as? NSNumber)?.doubleValue ?? 0
      let isPaused = (params["isPaused"] as? NSNumber)?.boolValue ?? false

      let newState = RunActivityAttributes.ContentState(
        distanceMeters: distanceMeters,
        durationSeconds: durationSeconds,
        paceMinPerKm: paceMinPerKm,
        isPaused: isPaused
      )

      Task {
        for activity in Activity<RunActivityAttributes>.activities where activity.id == activityId {
          await activity.update(.init(state: newState, staleDate: nil))
        }
        DispatchQueue.main.async { resolve(true) }
      }
    } else {
      resolve(false)
    }
  }

  @objc(end:rejecter:)
  func end(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.2, *) {
      guard let activityId = LiveActivityModule.currentActivityId else {
        resolve(false)
        return
      }
      Task {
        for activity in Activity<RunActivityAttributes>.activities where activity.id == activityId {
          await activity.end(dismissalPolicy: .immediate)
        }
        LiveActivityModule.currentActivityId = nil
        DispatchQueue.main.async { resolve(true) }
      }
    } else {
      resolve(false)
    }
  }

  // Statisk helper saa andre native moduler (fx baggrunds-GPS) kan opdatere
  // Live Activity direkte fra Swift, uafhaengigt af JS-traaden.
  @available(iOS 16.2, *)
  static func updateContent(distanceMeters: Double, durationSeconds: Int, paceMinPerKm: Double, isPaused: Bool) {
    // (opdaterer alle aktive RunActivityAttributes-aktiviteter)
    NSLog("[RWAI] LiveActivityModule.updateContent naaet dist=%.1f dur=%d", distanceMeters, durationSeconds)
    let newState = RunActivityAttributes.ContentState(
      distanceMeters: distanceMeters,
      durationSeconds: durationSeconds,
      paceMinPerKm: paceMinPerKm,
      isPaused: isPaused
    )
    Task {
      NSLog("[RWAI] updateContent: aktive aktiviteter=%d", Activity<RunActivityAttributes>.activities.count)
      for activity in Activity<RunActivityAttributes>.activities {
        await activity.update(.init(state: newState, staleDate: nil))
      }
    }
  }
}
