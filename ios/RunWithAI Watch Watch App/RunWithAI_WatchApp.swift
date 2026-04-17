//
//  RunWithAI_WatchApp.swift
//  RunWithAI Watch Watch App
//
//  Standalone Watch app - kører helt selvstændigt som Garmin
//

import SwiftUI
import HealthKit

@main
struct RunWithAI_WatchApp: App {
    
    @StateObject private var workoutManager = WorkoutManager.shared
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(workoutManager)
                .environmentObject(connectivityManager)
        }
    }
}
