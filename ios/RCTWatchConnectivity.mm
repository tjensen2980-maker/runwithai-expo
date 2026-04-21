//
//  RCTWatchConnectivity.mm
//  RunWithAI
//
//  Native bridge til Apple Watch via WatchConnectivity framework.
//
//  Events udsendt til JS:
//    - WatchMessage             (beskeder fra Watch: { command, data, ... })
//    - WatchWorkoutComplete     (workout afsluttet på Watch)
//    - WatchLiveUpdate          (live workout data fra Watch)
//    - WatchReachabilityChanged ({ isReachable: BOOL })
//
//  Exporterede metoder:
//    - getWatchStatus        -> { isPaired, isWatchAppInstalled, isReachable }
//    - sendUpdateToWatch     -> sendMessage (kræver reachable)
//    - transferUserInfo      -> baggrund, garanteret levering
//    - sendMessage           -> alias for sendUpdateToWatch
//

#import "RCTWatchConnectivity.h"
#import <React/RCTLog.h>

@interface RCTWatchConnectivity ()
@property (nonatomic, assign) BOOL hasListeners;
@end

@implementation RCTWatchConnectivity

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    if ([WCSession isSupported]) {
      WCSession *session = [WCSession defaultSession];
      session.delegate = self;
      [session activateSession];
      RCTLogInfo(@"[RCTWatchConnectivity] WCSession activated");
    } else {
      RCTLogInfo(@"[RCTWatchConnectivity] WCSession not supported on this device");
    }
  }
  return self;
}

- (dispatch_queue_t)methodQueue {
  return dispatch_get_main_queue();
}

#pragma mark - RCTEventEmitter

- (NSArray<NSString *> *)supportedEvents {
  return @[
    @"WatchMessage",
    @"WatchWorkoutComplete",
    @"WatchLiveUpdate",
    @"WatchReachabilityChanged"
  ];
}

- (void)startObserving {
  self.hasListeners = YES;
}

- (void)stopObserving {
  self.hasListeners = NO;
}

- (void)safeSendEvent:(NSString *)name body:(id)body {
  if (self.hasListeners) {
    [self sendEventWithName:name body:body];
  }
}

#pragma mark - Exported methods

RCT_EXPORT_METHOD(getWatchStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (![WCSession isSupported]) {
    resolve(@{
      @"isPaired": @NO,
      @"isWatchAppInstalled": @NO,
      @"isReachable": @NO
    });
    return;
  }

  WCSession *session = [WCSession defaultSession];
  resolve(@{
    @"isPaired": @(session.isPaired),
    @"isWatchAppInstalled": @(session.isWatchAppInstalled),
    @"isReachable": @(session.isReachable),
    @"activationState": @(session.activationState)
  });
}

RCT_EXPORT_METHOD(sendUpdateToWatch:(NSDictionary *)message
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (![WCSession isSupported]) {
    reject(@"not_supported", @"WCSession not supported on this device", nil);
    return;
  }

  WCSession *session = [WCSession defaultSession];

  if (!session.isReachable) {
    reject(@"not_reachable", @"Watch is not currently reachable", nil);
    return;
  }

  [session sendMessage:message
          replyHandler:^(NSDictionary<NSString *,id> * _Nonnull reply) {
    resolve(reply ?: @{@"success": @YES});
  }
          errorHandler:^(NSError * _Nonnull error) {
    reject(@"send_failed", error.localizedDescription, error);
  }];
}

RCT_EXPORT_METHOD(sendMessage:(NSDictionary *)message
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // Alias for sendUpdateToWatch
  if (![WCSession isSupported]) {
    reject(@"not_supported", @"WCSession not supported", nil);
    return;
  }
  WCSession *session = [WCSession defaultSession];
  if (!session.isReachable) {
    // Fallback: transferUserInfo hvis watch ikke er reachable
    [session transferUserInfo:message];
    resolve(@{@"queued": @YES});
    return;
  }
  [session sendMessage:message
          replyHandler:^(NSDictionary<NSString *,id> * _Nonnull reply) {
    resolve(reply ?: @{@"success": @YES});
  }
          errorHandler:^(NSError * _Nonnull error) {
    reject(@"send_failed", error.localizedDescription, error);
  }];
}

RCT_EXPORT_METHOD(transferUserInfo:(NSDictionary *)userInfo
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (![WCSession isSupported]) {
    reject(@"not_supported", @"WCSession not supported", nil);
    return;
  }

  WCSession *session = [WCSession defaultSession];
  WCSessionUserInfoTransfer *transfer = [session transferUserInfo:userInfo];

  resolve(@{
    @"transferring": @(transfer != nil),
    @"success": @YES
  });
}

#pragma mark - WCSessionDelegate

- (void)session:(WCSession *)session
activationDidCompleteWithState:(WCSessionActivationState)activationState
          error:(NSError *)error {
  if (error) {
    RCTLogError(@"[RCTWatchConnectivity] Activation error: %@", error.localizedDescription);
  } else {
    RCTLogInfo(@"[RCTWatchConnectivity] Activation state: %ld", (long)activationState);
  }
}

- (void)sessionDidBecomeInactive:(WCSession *)session {
  RCTLogInfo(@"[RCTWatchConnectivity] Session became inactive");
}

- (void)sessionDidDeactivate:(WCSession *)session {
  RCTLogInfo(@"[RCTWatchConnectivity] Session deactivated, re-activating");
  [[WCSession defaultSession] activateSession];
}

- (void)sessionReachabilityDidChange:(WCSession *)session {
  [self safeSendEvent:@"WatchReachabilityChanged" body:@{
    @"isReachable": @(session.isReachable)
  }];
}

- (void)session:(WCSession *)session didReceiveMessage:(NSDictionary<NSString *,id> *)message {
  [self routeIncomingMessage:message];
}

- (void)session:(WCSession *)session
  didReceiveMessage:(NSDictionary<NSString *,id> *)message
       replyHandler:(void (^)(NSDictionary<NSString *,id> * _Nonnull))replyHandler {
  [self routeIncomingMessage:message];
  replyHandler(@{@"received": @YES});
}

- (void)session:(WCSession *)session didReceiveUserInfo:(NSDictionary<NSString *,id> *)userInfo {
  [self routeIncomingMessage:userInfo];
}

- (void)session:(WCSession *)session
didReceiveApplicationContext:(NSDictionary<NSString *,id> *)applicationContext {
  [self routeIncomingMessage:applicationContext];
}

#pragma mark - Helpers

- (void)routeIncomingMessage:(NSDictionary *)message {
  if (!message) return;

  NSString *type = message[@"type"];

  if ([type isEqualToString:@"WORKOUT_COMPLETE"]) {
    [self safeSendEvent:@"WatchWorkoutComplete" body:message];
  } else if ([type isEqualToString:@"LIVE_UPDATE"] || [type isEqualToString:@"RUN_UPDATE"]) {
    [self safeSendEvent:@"WatchLiveUpdate" body:message];
  } else {
    // Alt andet routes som generel WatchMessage (inkl. commands)
    [self safeSendEvent:@"WatchMessage" body:message];
  }
}

@end
