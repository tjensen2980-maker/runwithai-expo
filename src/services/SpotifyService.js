/**
 * SpotifyService.js — RunWithAI Spotify Integration
 *
 * Handles:
 *   1. OAuth authentication via expo-auth-session
 *   2. Track recommendations filtered by tempo/BPM
 *   3. Playback control (requires Spotify Premium)
 *   4. Playlist suggestions
 *
 * Setup required:
 *   - Create app at https://developer.spotify.com/dashboard
 *   - Add redirect URIs:
 *       https://dist-lilac-zeta-14.vercel.app/spotify-callback (web)
 *       runwithai://spotify-callback (native)
 *   - Set SPOTIFY_CLIENT_ID below
 */

import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SPOTIFY_CLIENT_ID = '2c73d78fdefa405c80edc217bebb493a';
const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'streaming',
];

const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

const STORAGE_KEY_TOKEN = '@runwithai_spotify_token';
const STORAGE_KEY_EXPIRY = '@runwithai_spotify_expiry';
const STORAGE_KEY_REFRESH = '@runwithai_spotify_refresh';

// ---------------------------------------------------------------------------
// Redirect URI — platform-aware
// ---------------------------------------------------------------------------

function getRedirectUri() {
  if (Platform.OS === 'web') {
    return 'https://dist-lilac-zeta-14.vercel.app/spotify-callback';
  }
  // Native iOS/Android: use expo-linking to create a proper deep link
  // This generates "runwithai://spotify-callback" in standalone builds
  // because we have "scheme": "runwithai" in app.json
  return Linking.createURL('spotify-callback');
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

class SpotifyService {
  constructor() {
    this._accessToken = null;
    this._tokenExpiry = null;
    this._refreshToken = null;
    this._cachedTracks = new Map(); // bpm -> tracks[]
  }

  /**
   * Check if user is authenticated with a valid token.
   */
  async isAuthenticated() {
    if (this._accessToken && this._tokenExpiry > Date.now()) {
      return true;
    }

    // Try loading from storage
    try {
      const [token, expiry, refresh] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_TOKEN),
        AsyncStorage.getItem(STORAGE_KEY_EXPIRY),
        AsyncStorage.getItem(STORAGE_KEY_REFRESH),
      ]);

      if (token && expiry && parseInt(expiry) > Date.now()) {
        this._accessToken = token;
        this._tokenExpiry = parseInt(expiry);
        this._refreshToken = refresh;
        return true;
      }

      // Try refresh
      if (refresh) {
        return await this._refreshAccessToken(refresh);
      }
    } catch (err) {
      console.warn('[Spotify] Auth check error:', err);
    }

    return false;
  }

  /**
   * Start OAuth login flow.
   * Returns { success: boolean, error?: string }
   */
  async login() {
    try {
      const redirectUri = getRedirectUri();
      console.log('[Spotify] Using redirect URI:', redirectUri);

      const authRequest = new AuthSession.AuthRequest({
        clientId: SPOTIFY_CLIENT_ID,
        scopes: SPOTIFY_SCOPES,
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      });

      const result = await authRequest.promptAsync({
        authorizationEndpoint: SPOTIFY_AUTH_ENDPOINT,
      });

      if (result.type !== 'success') {
        return { success: false, error: 'Auth cancelled or failed' };
      }

      // Exchange code for token
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: SPOTIFY_CLIENT_ID,
          code: result.params.code,
          redirectUri,
          extraParams: {
            code_verifier: authRequest.codeVerifier,
          },
        },
        { tokenEndpoint: SPOTIFY_TOKEN_ENDPOINT }
      );

      await this._saveTokens(tokenResult);
      return { success: true };
    } catch (err) {
      console.error('[Spotify] Login error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Logout — clear tokens.
   */
  async logout() {
    this._accessToken = null;
    this._tokenExpiry = null;
    this._refreshToken = null;
    this._cachedTracks.clear();
    await AsyncStorage.multiRemove([
      STORAGE_KEY_TOKEN,
      STORAGE_KEY_EXPIRY,
      STORAGE_KEY_REFRESH,
    ]);
  }

  // ---------------------------------------------------------------------------
  // Track recommendations by BPM (using Search API — /recommendations was deprecated)
  // ---------------------------------------------------------------------------

  /**
   * Get tracks matching a target BPM range using Spotify Search.
   * Since /recommendations was removed in Nov 2024, we search for
   * workout/running playlists and tracks, then filter by audio features.
   */
  async getTracksByBpm(bpmRange, { limit = 15 } = {}) {
    const cacheKey = `${bpmRange.min}-${bpmRange.max}`;
    if (this._cachedTracks.has(cacheKey)) {
      return this._cachedTracks.get(cacheKey);
    }

    const authenticated = await this.isAuthenticated();
    if (!authenticated) {
      throw new Error('Not authenticated with Spotify');
    }

    // Search for workout/running tracks at target BPM
    const queries = [
      `running ${bpmRange.target} bpm`,
      `workout ${bpmRange.target}bpm`,
      `running workout energy`,
    ];

    let allTracks = [];

    for (const q of queries) {
      try {
        const data = await this._apiGet(
          `/search?q=${encodeURIComponent(q)}&type=track&limit=10`
        );
        const items = data.tracks?.items || [];
        for (const t of items) {
          if (!allTracks.find(x => x.id === t.id)) {
            allTracks.push({
              id: t.id,
              name: t.name,
              artist: t.artists.map(a => a.name).join(', '),
              albumArt: t.album?.images?.[0]?.url || null,
              bpm: bpmRange.target, // will be updated with actual tempo
              uri: t.uri,
              previewUrl: t.preview_url,
              durationMs: t.duration_ms,
            });
          }
        }
      } catch (err) {
        console.warn('[Spotify] Search error for query:', q, err);
      }
      if (allTracks.length >= limit * 2) break;
    }

    // Fetch actual tempos via audio-features and filter by BPM range
    if (allTracks.length > 0) {
      try {
        // Process in batches of 100 (Spotify API limit)
        const batch = allTracks.slice(0, 50);
        const ids = batch.map(t => t.id).join(',');
        const features = await this._apiGet(`/audio-features?ids=${ids}`);
        if (features.audio_features) {
          features.audio_features.forEach((f, i) => {
            if (f && batch[i]) {
              batch[i].bpm = Math.round(f.tempo);
              batch[i].energy = f.energy;
            }
          });
        }

        // Filter tracks within BPM range (with some tolerance)
        const tolerance = 15; // ±15 BPM tolerance
        allTracks = batch.filter(t =>
          t.bpm >= (bpmRange.min - tolerance) &&
          t.bpm <= (bpmRange.max + tolerance)
        );

        // Sort by how close to target BPM + energy
        allTracks.sort((a, b) => {
          const aDiff = Math.abs(a.bpm - bpmRange.target);
          const bDiff = Math.abs(b.bpm - bpmRange.target);
          return aDiff - bDiff;
        });

        allTracks = allTracks.slice(0, limit);
      } catch (err) {
        console.warn('[Spotify] Could not fetch audio features:', err);
        // Return unfiltered tracks if audio features fail
        allTracks = allTracks.slice(0, limit);
      }
    }

    if (allTracks.length > 0) {
      this._cachedTracks.set(cacheKey, allTracks);
    }
    return allTracks;
  }

  /**
   * Search for running/workout playlists.
   */
  async searchRunningPlaylists(bpm) {
    const authenticated = await this.isAuthenticated();
    if (!authenticated) {
      throw new Error('Not authenticated with Spotify');
    }

    const query = encodeURIComponent(`running ${bpm} bpm workout`);
    const data = await this._apiGet(`/search?q=${query}&type=playlist&limit=5`);

    return (data.playlists?.items || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.images?.[0]?.url || null,
      uri: p.uri,
      trackCount: p.tracks?.total || 0,
    }));
  }

  // ---------------------------------------------------------------------------
  // Playback control (requires Spotify Premium + active device)
  // ---------------------------------------------------------------------------

  /**
   * Start playing a track.
   * @param {string} uri - Spotify URI (e.g. "spotify:track:xxx")
   */
  async play(uri) {
    await this._apiPut('/me/player/play', { uris: [uri] });
  }

  /**
   * Pause playback.
   */
  async pause() {
    await this._apiPut('/me/player/pause');
  }

  /**
   * Skip to next track.
   */
  async next() {
    await this._apiPost('/me/player/next');
  }

  /**
   * Get current playback state.
   */
  async getPlaybackState() {
    try {
      const data = await this._apiGet('/me/player');
      if (!data || !data.item) return null;
      return {
        isPlaying: data.is_playing,
        track: {
          name: data.item.name,
          artist: data.item.artists.map((a) => a.name).join(', '),
          albumArt: data.item.album?.images?.[0]?.url,
          uri: data.item.uri,
          durationMs: data.item.duration_ms,
          progressMs: data.progress_ms,
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Open a track/playlist in the Spotify app (no Premium required).
   * Use this as fallback when playback control isn't available.
   */
  getSpotifyDeepLink(uri) {
    return `https://open.spotify.com/${uri.replace(/:/g, '/').replace('spotify/', '')}`;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  async _apiGet(path) {
    const res = await fetch(`${SPOTIFY_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${this._accessToken}` },
    });
    if (res.status === 401) {
      const refreshed = await this._refreshAccessToken(this._refreshToken);
      if (refreshed) return this._apiGet(path);
      throw new Error('Spotify session expired');
    }
    if (!res.ok) throw new Error(`Spotify API ${res.status}: ${path}`);
    // Some endpoints return 204 with no body
    if (res.status === 204) return {};
    return res.json();
  }

  async _apiPut(path, body) {
    const res = await fetch(`${SPOTIFY_API_BASE}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this._accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      const refreshed = await this._refreshAccessToken(this._refreshToken);
      if (refreshed) return this._apiPut(path, body);
    }
  }

  async _apiPost(path) {
    const res = await fetch(`${SPOTIFY_API_BASE}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this._accessToken}` },
    });
    if (res.status === 401) {
      const refreshed = await this._refreshAccessToken(this._refreshToken);
      if (refreshed) return this._apiPost(path);
    }
  }

  async _saveTokens(tokenResult) {
    this._accessToken = tokenResult.accessToken;
    this._refreshToken = tokenResult.refreshToken;
    this._tokenExpiry = Date.now() + (tokenResult.expiresIn || 3600) * 1000;

    await AsyncStorage.multiSet([
      [STORAGE_KEY_TOKEN, this._accessToken],
      [STORAGE_KEY_EXPIRY, String(this._tokenExpiry)],
      [STORAGE_KEY_REFRESH, this._refreshToken || ''],
    ]);
  }

  async _refreshAccessToken(refreshToken) {
    try {
      const res = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: SPOTIFY_CLIENT_ID,
        }).toString(),
      });

      if (!res.ok) return false;
      const data = await res.json();

      this._accessToken = data.access_token;
      this._tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
      if (data.refresh_token) this._refreshToken = data.refresh_token;

      await AsyncStorage.multiSet([
        [STORAGE_KEY_TOKEN, this._accessToken],
        [STORAGE_KEY_EXPIRY, String(this._tokenExpiry)],
        ...(data.refresh_token
          ? [[STORAGE_KEY_REFRESH, data.refresh_token]]
          : []),
      ]);

      return true;
    } catch {
      return false;
    }
  }
}

// Singleton export
export default new SpotifyService();