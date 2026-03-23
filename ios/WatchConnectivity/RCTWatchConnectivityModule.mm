/**
 * RCTWatchConnectivityModule.mm
 * 
 * Implementation af React Native native modul for Apple Watch connectivity.
 * Håndterer bidirektionel kommunikation mellem iPhone og Apple Watch.
 */

#import "RCTWatchConnectivityModule.h"
#import <React/RCTLog.h>

@implementation RCTWatchConnectivityModule
{
  bool hasListeners;
}

RCT_EXPORT_MODULE(RCTWatchConnectivity);

#pragma mark - Lifecycle

- (instancetype)init
{
  self = [super init];
  if (self) {
    if ([WCSession isSupported]) {
      self.session = [WCSession defaultSession];
      self.session.delegate = self;
      [self.session activateSession];
      RCTLogInfo(@"[WatchConnectivity] Session activated");
    } else {
      RCTLogWarn(@"[WatchConnectivity] WCSession not supported on this device");
    }
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

#pragma mark - Event Emitter

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"WatchMessage", @"WatchReachability"];
}

- (void)startObserving
{
  hasListeners = YES;
}

- (void)stopObserving
{
  hasListeners = NO;
}

#pragma mark - Constants

- (NSDictionary *)constantsToExport
{
  return @{
    @"WATCH_MESSAGE_EVENT": @"WatchMessage",
    @"WATCH_REACHABILITY_EVENT": @"WatchReachability"
  };
}

#pragma mark - Exported Methods

RCT_EXPORT_METHOD(getWatchStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
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

RCT_EXPORT_METHOD(sendUpdateToWatch:(NSDictionary *)update
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (![WCSession isSupported]) {
    resolve(@{@"status": @"unsupported"});
    return;
  }
  
  WCSession *session = [WCSession defaultSession];
  
  if (!session.isReachable) {
    RCTLogWarn(@"[WatchConnectivity] Watch is not reachable, queuing message");
    
    // Hvis Watch ikke er reachable, brug application context
    NSError *error = nil;
    [session updateApplicationContext:update error:&error];
    
    if (error) {
      reject(@"CONTEXT_UPDATE_FAILED", @"Failed to update application context", error);
    } else {
      resolve(@{@"status": @"queued"});
    }
    return;
  }
  
  // Send besked direkte til Watch
  [session sendMessage:update
          replyHandler:^(NSDictionary<NSString *,id> * _Nonnull replyMessage) {
    RCTLogInfo(@"[WatchConnectivity] Message sent successfully");
    resolve(@{@"status": @"success", @"reply": replyMessage});
  }
          errorHandler:^(NSError * _Nonnull error) {
    RCTLogError(@"[WatchConnectivity] Failed to send message: %@", error);
    reject(@"SEND_FAILED", @"Failed to send message to watch", error);
  }];
}

RCT_EXPORT_METHOD(updateApplicationContext:(NSDictionary *)context
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (![WCSession isSupported]) {
    resolve(@{@"status": @"unsupported"});
    return;
  }
  
  WCSession *session = [WCSession defaultSession];
  NSError *error = nil;
  
  [session updateApplicationContext:context error:&error];
  
  if (error) {
    reject(@"CONTEXT_UPDATE_FAILED", @"Failed to update application context", error);
  } else {
    resolve(@{@"status": @"success"});
  }
}

RCT_EXPORT_METHOD(transferFile:(NSString *)filePath
                  metadata:(NSDictionary *)metadata
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (![WCSession isSupported]) {
    resolve(@{@"status": @"unsupported"});
    return;
  }
  
  WCSession *session = [WCSession defaultSession];
  NSURL *fileURL = [NSURL fileURLWithPath:filePath];
  
  if (![[NSFileManager defaultManager] fileExistsAtPath:filePath]) {
    reject(@"FILE_NOT_FOUND", @"File does not exist", nil);
    return;
  }
  
  WCSessionFileTransfer *transfer = [session transferFile:fileURL metadata:metadata];
  
  if (transfer) {
    resolve(@{@"status": @"transferring"});
  } else {
    reject(@"TRANSFER_FAILED", @"Failed to initiate file transfer", nil);
  }
}

#pragma mark - WCSessionDelegate

- (void)session:(WCSession *)session activationDidCompleteWithState:(WCSessionActivationState)activationState error:(NSError *)error
{
  if (error) {
    RCTLogError(@"[WatchConnectivity] Activation failed: %@", error);
    return;
  }
  
  RCTLogInfo(@"[WatchConnectivity] Activation completed with state: %ld", (long)activationState);
}

- (void)sessionDidBecomeInactive:(WCSession *)session
{
  RCTLogInfo(@"[WatchConnectivity] Session became inactive");
}

- (void)sessionDidDeactivate:(WCSession *)session
{
  RCTLogInfo(@"[WatchConnectivity] Session deactivated");
  // Reactivate session
  [session activateSession];
}

- (void)sessionReachabilityDidChange:(WCSession *)session
{
  RCTLogInfo(@"[WatchConnectivity] Reachability changed: %d", session.isReachable);
  
  if (hasListeners) {
    [self sendEventWithName:@"WatchReachability" body:@{
      @"isReachable": @(session.isReachable)
    }];
  }
}

- (void)session:(WCSession *)session didReceiveMessage:(NSDictionary<NSString *,id> *)message
{
  RCTLogInfo(@"[WatchConnectivity] Received message: %@", message);
  
  if (hasListeners) {
    [self sendEventWithName:@"WatchMessage" body:message];
  }
}

- (void)session:(WCSession *)session didReceiveMessage:(NSDictionary<NSString *,id> *)message replyHandler:(void (^)(NSDictionary<NSString *,id> * _Nonnull))replyHandler
{
  RCTLogInfo(@"[WatchConnectivity] Received message with reply handler: %@", message);
  
  if (hasListeners) {
    [self sendEventWithName:@"WatchMessage" body:message];
  }
  
  // Send acknowledgement
  replyHandler(@{@"status": @"received"});
}

- (void)session:(WCSession *)session didReceiveApplicationContext:(NSDictionary<NSString *,id> *)applicationContext
{
  RCTLogInfo(@"[WatchConnectivity] Received application context: %@", applicationContext);
  
  if (hasListeners) {
    [self sendEventWithName:@"WatchMessage" body:applicationContext];
  }
}

@end
