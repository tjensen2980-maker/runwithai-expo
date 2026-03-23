/**
 * RCTWatchConnectivityModule.h
 * 
 * Header fil til React Native native modul for Apple Watch connectivity.
 * Eksponerer WatchConnectivity framework til JavaScript.
 */

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <WatchConnectivity/WatchConnectivity.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTWatchConnectivityModule : RCTEventEmitter <RCTBridgeModule, WCSessionDelegate>

@property (nonatomic, strong) WCSession *session;

@end

NS_ASSUME_NONNULL_END
