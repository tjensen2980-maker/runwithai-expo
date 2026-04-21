//
//  RCTWatchConnectivity.h
//  RunWithAI
//
//  Native bridge til Apple Watch via WatchConnectivity framework.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <WatchConnectivity/WatchConnectivity.h>

@interface RCTWatchConnectivity : RCTEventEmitter <RCTBridgeModule, WCSessionDelegate>

@end
