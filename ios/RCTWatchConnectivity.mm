#import "RCTWatchConnectivity.h"
#import <React/RCTLog.h>

@interface RCTWatchConnectivity () <WCSessionDelegate>
@property (nonatomic, assign) BOOL hasListeners;
@property (nonatomic, assign) BOOL sessionActivationStarted;
@end

@implementation RCTWatchConnectivity

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (dispatch_queue_t)methodQueue {
  return dispatch_get_main_queue();
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"WatchMessageReceived", @"WatchSessionStateChanged", @"WatchReachabilityChanged"];
}

- (void)startObserving {
  self.hasListeners = YES;
  [self ensureSessionActivated];
}

- (void)stopObserving {
  self.hasListeners = NO;
}

- (void)safeSendEvent:(NSString *)name body:(id)body {
  if (!self.hasListeners) { return; }
  @try {
    [self sendEventWithName:name body:body];
  } @catch (NSException *exception) {
    RCTLogWarn(@"RCTWatchConnectivity sendEvent failed: %@", exception.reason);
  }
}

- (void)ensureSessionActivated {
  if (self.sessionActivationStarted) { return; }
  self.sessionActivationStarted = YES;
  @try {
    if (![WCSession isSupported]) { return; }
    WCSession *s = [WCSession defaultSession];
    s.delegate = self;
    [s activateSession];
  } @catch (NSException *exception) {
    RCTLogWarn(@"WCSession activation failed: %@", exception.reason);
  }
}

RCT_EXPORT_METHOD(isSupported:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  @try {
    resolve(@([WCSession isSupported]));
  } @catch (NSException *e) {
    resolve(@NO);
  }
}

RCT_EXPORT_METHOD(getState:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  @try {
    [self ensureSessionActivated];
    if (![WCSession isSupported]) {
      resolve(@{@"supported": @NO});
      return;
    }
    WCSession *s = [WCSession defaultSession];
    resolve(@{
      @"supported": @YES,
      @"activationState": @(s.activationState),
      @"paired": @(s.isPaired),
      @"watchAppInstalled": @(s.isWatchAppInstalled),
      @"reachable": @(s.isReachable)
    });
  } @catch (NSException *e) {
    resolve(@{@"supported": @NO, @"error": e.reason ?: @"unknown"});
  }
}

RCT_EXPORT_METHOD(sendMessage:(NSDictionary *)message
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  @try {
    [self ensureSessionActivated];
    if (![WCSession isSupported]) { reject(@"not_supported", @"WCSession not supported", nil); return; }
    WCSession *s = [WCSession defaultSession];
    if (!s.isReachable) { reject(@"not_reachable", @"Watch not reachable", nil); return; }
    [s sendMessage:message
      replyHandler:^(NSDictionary<NSString *,id> *reply) { resolve(reply ?: @{@"success":@YES}); }
      errorHandler:^(NSError *error) { reject(@"send_failed", error.localizedDescription, error); }];
  } @catch (NSException *e) {
    reject(@"send_exception", e.reason ?: @"unknown", nil);
  }
}

RCT_EXPORT_METHOD(updateApplicationContext:(NSDictionary *)context
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  @try {
    [self ensureSessionActivated];
    if (![WCSession isSupported]) { reject(@"not_supported", @"WCSession not supported", nil); return; }
    WCSession *s = [WCSession defaultSession];
    NSError *err = nil;
    BOOL ok = [s updateApplicationContext:context error:&err];
    if (ok) { resolve(@{@"success":@YES}); }
    else { reject(@"context_failed", err.localizedDescription ?: @"unknown", err); }
  } @catch (NSException *e) {
    reject(@"context_exception", e.reason ?: @"unknown", nil);
  }
}

RCT_EXPORT_METHOD(transferUserInfo:(NSDictionary *)userInfo
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  @try {
    [self ensureSessionActivated];
    if (![WCSession isSupported]) { reject(@"not_supported", @"WCSession not supported", nil); return; }
    WCSession *s = [WCSession defaultSession];
    [s transferUserInfo:userInfo];
    resolve(@{@"success":@YES});
  } @catch (NSException *e) {
    reject(@"transfer_exception", e.reason ?: @"unknown", nil);
  }
}

#pragma mark - WCSessionDelegate

- (void)session:(WCSession *)session activationDidCompleteWithState:(WCSessionActivationState)activationState error:(NSError *)error {
  [self safeSendEvent:@"WatchSessionStateChanged" body:@{@"state": @(activationState), @"error": error.localizedDescription ?: [NSNull null]}];
}

- (void)sessionDidBecomeInactive:(WCSession *)session {}

- (void)sessionDidDeactivate:(WCSession *)session {
  @try { [[WCSession defaultSession] activateSession]; } @catch (NSException *e) {}
}

- (void)sessionReachabilityDidChange:(WCSession *)session {
  [self safeSendEvent:@"WatchReachabilityChanged" body:@{@"reachable": @(session.isReachable)}];
}

- (void)session:(WCSession *)session didReceiveMessage:(NSDictionary<NSString *,id> *)message {
  [self safeSendEvent:@"WatchMessageReceived" body:message];
}

- (void)session:(WCSession *)session didReceiveMessage:(NSDictionary<NSString *,id> *)message replyHandler:(void (^)(NSDictionary<NSString *,id> *))replyHandler {
  [self safeSendEvent:@"WatchMessageReceived" body:message];
  replyHandler(@{@"ack": @YES});
}

- (void)session:(WCSession *)session didReceiveUserInfo:(NSDictionary<NSString *,id> *)userInfo {
  [self safeSendEvent:@"WatchMessageReceived" body:userInfo];
}

- (void)session:(WCSession *)session didReceiveApplicationContext:(NSDictionary<NSString *,id> *)applicationContext {
  [self safeSendEvent:@"WatchMessageReceived" body:applicationContext];
}

@end
