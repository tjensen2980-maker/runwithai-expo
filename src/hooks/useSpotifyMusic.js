/**
 * useSpotifyMusic.js — React hook for Spotify music matching
 *
 * Connects to Spotify, fetches tempo-matched tracks,
 * controls playback, and provides playlist suggestions.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import SpotifyService from '../services/SpotifyService';

export default function useSpotifyMusic({ bpmRange, isRunning }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [error, setError] = useState(null);

  const lastBpmRef = useRef(0);
  const pollRef = useRef(null);
  const fetchedRef = useRef(false);

  // ─── CHECK AUTH ON MOUNT ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const authed = await SpotifyService.isAuthenticated();
      setIsConnected(authed);
    })();
  }, []);

  // ─── FETCH TRACKS WHEN BPM CHANGES ───────────────────────────────────
  useEffect(() => {
    if (!isConnected || !isRunning) return;
    if (!bpmRange || !bpmRange.target || bpmRange.target <= 0) return;

    // Only re-fetch if BPM changed significantly (±5)
    if (Math.abs(bpmRange.target - lastBpmRef.current) < 5 && fetchedRef.current) return;

    lastBpmRef.current = bpmRange.target;
    fetchedRef.current = true;

    const fetchTracks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [trackResults, playlistResults] = await Promise.all([
          SpotifyService.getTracksByBpm(bpmRange, { limit: 15 }),
          SpotifyService.searchRunningPlaylists(bpmRange.target).catch(() => []),
        ]);
        setTracks(trackResults);
        setPlaylists(playlistResults);
      } catch (err) {
        console.warn('[useSpotifyMusic] Fetch tracks error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracks();
  }, [isConnected, isRunning, bpmRange]);

  // ─── POLL PLAYBACK STATE (less aggressively) ─────────────────────────
  useEffect(() => {
    if (!isConnected || !isRunning) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const pollPlayback = async () => {
      try {
        const state = await SpotifyService.getPlaybackState();
        if (state && state.track) {
          setCurrentTrack({ ...state.track, isPlaying: state.isPlaying });
        }
      } catch {
        // Silently ignore — no active device is normal
      }
    };

    // Poll every 10 seconds instead of every second
    pollPlayback();
    pollRef.current = setInterval(pollPlayback, 10000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isConnected, isRunning]);

  // ─── AUTO-PLAY: Open first playlist in Spotify when tracks load ────
  const autoPlayedRef = useRef(false);

  // Reset auto-play when run stops
  useEffect(() => {
    if (!isRunning) {
      autoPlayedRef.current = false;
    }
  }, [isRunning]);

  // ─── ACTIONS ──────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setError(null);
    const result = await SpotifyService.login();
    if (result.success) {
      setIsConnected(true);
    } else {
      setError(result.error || 'Kunne ikke forbinde til Spotify');
    }
  }, []);

  const disconnect = useCallback(async () => {
    await SpotifyService.logout();
    setIsConnected(false);
    setTracks([]);
    setPlaylists([]);
    setCurrentTrack(null);
    fetchedRef.current = false;
    lastBpmRef.current = 0;
  }, []);

  const playTrack = useCallback(async (track) => {
    // Use spotify: URI to open and play in Spotify app
    const spotifyUri = track.uri; // "spotify:track:xxx"
    try {
      const { Linking } = require('react-native');
      await Linking.openURL(spotifyUri);
    } catch {
      // Fallback to web URL
      const webUrl = `https://open.spotify.com/${track.uri.replace(/:/g, '/').replace('spotify/', '')}`;
      try {
        const { Linking } = require('react-native');
        await Linking.openURL(webUrl);
      } catch {
        if (typeof window !== 'undefined') window.open(webUrl, '_blank');
      }
    }
    setCurrentTrack({ ...track, isPlaying: true });
  }, []);

  const pause = useCallback(async () => {
    try {
      await SpotifyService.pause();
      if (currentTrack) {
        setCurrentTrack({ ...currentTrack, isPlaying: false });
      }
    } catch (err) {
      console.warn('[useSpotifyMusic] Pause failed:', err);
    }
  }, [currentTrack]);

  const skip = useCallback(async () => {
    try {
      await SpotifyService.next();
      // Playback state will update on next poll
    } catch (err) {
      console.warn('[useSpotifyMusic] Skip failed:', err);
    }
  }, []);

  const openPlaylist = useCallback((playlist) => {
    // Use spotify: URI to open playlist directly in Spotify app
    const spotifyUri = playlist.uri; // "spotify:playlist:xxx"
    try {
      const { Linking } = require('react-native');
      Linking.openURL(spotifyUri).catch(() => {
        const webUrl = `https://open.spotify.com/${playlist.uri.replace(/:/g, '/').replace('spotify/', '')}`;
        Linking.openURL(webUrl);
      });
    } catch {
      const link = SpotifyService.getSpotifyDeepLink(playlist.uri);
      if (typeof window !== 'undefined') window.open(link, '_blank');
    }
  }, []);

  return {
    isConnected,
    isLoading,
    tracks,
    playlists,
    currentTrack,
    error,
    connect,
    disconnect,
    playTrack,
    openPlaylist,
    pause,
    skip,
  };
}