/**
 * RunWithAI_WatchApp.swift
 * 
 * Entry point for RunWithAI Apple Watch app.
 * Initialiserer app og WatchConnectivity session.
 */

import SwiftUI
import WatchConnectivity

@main
struct RunWithAI_WatchApp: App {
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(connectivityManager)
        }
    }
}
