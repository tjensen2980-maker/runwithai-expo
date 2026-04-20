//
//  RCTWatchConnectivity.mm
//  RunWithAI
//
//  Native module som bridge-r WCSession til React Native.
//  Håndterer GET_TODAY_TRAINING fra Watch og sender træningsdata tilbage.
//

#import "RCTWatchConnectivity.h"
#import <React/RCTLog.h>
#import <WatchConnectivity/WatchConnectivity.h>

@interface RCTWatchConnectivity () <WCSessionDelegate>
@property (nonatomic, strong) WCSession *session;
@property (nonatomic, assign) BOOL hasListeners;
@end

@implementation RCTWatchConnectivity

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (instancetype)init {
  if (self = [super init]) {
    if ([WCSession isSupported]) {
      dispatch_async(dispatch_get_main_queue(), ^{
        self.session = [WCSession defaultSession];
        self.session.delegate = self;
        [self.session activateSession];
      });
    }
  }
  return self;
}

// MARK: - RCTEventEmitter

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

// MARK: - Exported methods

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
        @"isReachable": @(session.isReachable)
    });
}

RCT_EXPORT_METHOD(sendUpdateToWatch:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (![WCSession isSupported] || !self.session.isReachable) {
        reject(@"NOT_REACHABLE", @"Watch is not reachable", nil);
        return;
    }
    [self.session sendMessage:data
               replyHandler:^(NSDictionary<NSString *,id> * _Nonnull replyMessage) {
        resolve(replyMessage);
    } errorHandler:^(NSError * _Nonnull error) {
        reject(@"SEND_ERROR", error.localizedDescription, error);
    }];
}

RCT_EXPORT_METHOD(transferUserInfo:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (![WCSession isSupported]) {
        reject(@"NOT_SUPPORTED", @"WatchConnectivity not supported", nil);
        return;
    }
    [self.session transferUserInfo:data];
    resolve(@{@"success": @YES});
}

// MARK: - WCSessionDelegate

- (void)session:(WCSession *)session
activationDidCompleteWithState:(WCSessionActivationState)activationState
          error:(NSError *)error {
    RCTLogInfo(@"[RCTWatchConnectivity] Session activated: %ld", (long)activationState);
}

- (void)sessionDidBecomeInactive:(WCSession *)session {}
- (void)sessionDidDeactivate:(WCSession *)session {
    [self.session activateSession];
}

- (void)sessionReachabilityDidChange:(WCSession *)session {
    if (self.hasListeners) {
        [self sendEventWithName:@"WatchReachabilityChanged" body:@{
            @"isReachable": @(session.isReachable)
        }];
    }
}

// MARK: - Receive messages from Watch

- (void)session:(WCSession *)session
didReceiveMessage:(NSDictionary<NSString *,id> *)message {
    [self handleIncomingMessage:message replyHandler:nil];
}

- (void)session:(WCSession *)session
didReceiveMessage:(NSDictionary<NSString *,id> *)message
   replyHandler:(void (^)(NSDictionary<NSString *,id> *replyMessage))replyHandler {
    [self handleIncomingMessage:message replyHandler:replyHandler];
}

- (void)session:(WCSession *)session
didReceiveUserInfo:(NSDictionary<NSString *,id> *)userInfo {
    [self handleIncomingMessage:userInfo replyHandler:nil];
}

// MARK: - Handle incoming data

- (void)handleIncomingMessage:(NSDictionary *)message
                 replyHandler:(void (^)(NSDictionary *))replyHandler {
    NSString *command = message[@"command"];
    
    // Watch beder om dagens træning
    if ([command isEqualToString:@"GET_TODAY_TRAINING"]) {
        // Send event til React Native så JS kan svare med træningsdata
        if (self.hasListeners) {
            [self sendEventWithName:@"WatchMessage" body:@{
                @"command": @"GET_TODAY_TRAINING",
                @"hasReplyHandler": @(replyHandler != nil)
            }];
        }
        // Vi gemmer replyHandler midlertidigt (forenklet - send OK svar med det samme)
        // React Native siden skal kalde sendUpdateToWatch med træningsdata
        if (replyHandler) {
            replyHandler(@{@"status": @"received"});
        }
        return;
    }
    
    // Workout data fra Watch
    NSString *type = message[@"type"];
    if ([type isEqualToString:@"WORKOUT_DATA"] || [type isEqualToString:@"WORKOUT_COMPLETE"]) {
        if (self.hasListeners) {
            if ([type isEqualToString:@"WORKOUT_COMPLETE"]) {
                [self sendEventWithName:@"WatchWorkoutComplete" body:message];
            } else {
                [self sendEventWithName:@"WatchLiveUpdate" body:message];
            }
        }
        if (replyHandler) {
            replyHandler(@{@"status": @"received"});
        }
        return;
    }
    
    // Generisk besked
    if (self.hasListeners) {
        [self sendEventWithName:@"WatchMessage" body:message];
    }
    if (replyHandler) {
        replyHandler(@{@"status": @"received"});
    }
}

@end
