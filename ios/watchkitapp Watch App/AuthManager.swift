import Foundation
import WatchConnectivity
import Combine

class AuthManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = AuthManager()

    @Published var userId: String?
    @Published var token: String?
    @Published var serverUrl: String = "https://runwithai-server-production.up.railway.app"
    @Published var isAuthenticated: Bool = false
    @Published var debugStatus: String = "Init"

    private let tokenKey = "runwithai.auth.token"
    private let userIdKey = "runwithai.auth.userId"
    private let serverKey = "runwithai.auth.server"

    override init() {
        super.init()
        loadFromStorage()
        activateSession()
    }

    private func activateSession() {
        guard WCSession.isSupported() else {
            debugStatus = "WCSession not supported"
            return
        }
        let session = WCSession.default
        session.delegate = self
        session.activate()
        debugStatus = "Session activating..."
    }

    // MARK: - Storage

    private func loadFromStorage() {
        userId = UserDefaults.standard.string(forKey: userIdKey)
        token = UserDefaults.standard.string(forKey: tokenKey)
        if let saved = UserDefaults.standard.string(forKey: serverKey), !saved.isEmpty {
            serverUrl = saved
        }
        isAuthenticated = (token != nil && !token!.isEmpty && userId != nil)
    }

    private func persist() {
        UserDefaults.standard.set(userId, forKey: userIdKey)
        UserDefaults.standard.set(token, forKey: tokenKey)
        UserDefaults.standard.set(serverUrl, forKey: serverKey)
    }

    private func applyAuthBundle(_ dict: [String: Any]) {
        if let t = dict["token"] as? String, !t.isEmpty {
            self.token = t
        }
        if let u = dict["userId"] as? String, !u.isEmpty {
            self.userId = u
        }
        if let s = dict["serverUrl"] as? String, !s.isEmpty {
            self.serverUrl = s
        }
        isAuthenticated = (token != nil && !token!.isEmpty && userId != nil)
        persist()
        debugStatus = "Auth OK: \(userId ?? "?")"
    }

    func logout() {
        userId = nil
        token = nil
        isAuthenticated = false
        persist()
        debugStatus = "Logged out"
    }

    // MARK: - WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            switch activationState {
            case .activated:
                self.debugStatus = self.isAuthenticated ? "Connected, auth OK" : "Connected, waiting for auth"
                // Tjek om der allerede er applicationContext
                let ctx = session.receivedApplicationContext
                if !ctx.isEmpty {
                    self.applyAuthBundle(ctx)
                }
            case .inactive:
                self.debugStatus = "Session inactive"
            case .notActivated:
                self.debugStatus = "Session not activated"
            @unknown default:
                self.debugStatus = "Unknown state"
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            self.applyAuthBundle(applicationContext)
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            self.applyAuthBundle(message)
        }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        DispatchQueue.main.async {
            self.applyAuthBundle(userInfo)
        }
    }
}
