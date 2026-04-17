//
//  RCTWatchConnectivity.h
//  RunWithAI
//
//  Native module that bridges WCSession (Apple Watch) to React Native.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCTWatchConnectivity : RCTEventEmitter <RCTBridgeModule>

@end
