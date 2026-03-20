import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { colors, SERVER, getAuthToken } from '../data';
import { Icon } from '../components/Icons';

// Decode Google encoded polyline → [[lon, lat], ...]
function decodePolyline(encoded) {
  const points = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

// ─── SIMPLE MAP FOR RUNTRACKER ──────────────────────────────────────────────
function TrackerMap({ positions, currentPosition }) {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const polylineRef = React.useRef(null);
  const markerRef = React.useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    
    const init = () => {
      if (!window.L) return;
      const L = window.L;
      
      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
        
        // Start centered on Denmark or last known location
        if (window._lastKnownLocation) {
          map.setView([window._lastKnownLocation.lat, window._lastKnownLocation.lon], 15);
        } else {
          map.setView([56.0, 10.5], 13);
        }
        mapInstanceRef.current = map;
      }
      
      const map = mapInstanceRef.current;
      
      // Update polyline with positions
      if (positions.length > 1) {
        const latlngs = positions.map(p => [p.latitude, p.longitude]);
        if (polylineRef.current) {
          polylineRef.current.setLatLngs(latlngs);
        } else {
          polylineRef.current = L.polyline(latlngs, { color: colors.accent, weight: 4, opacity: 0.9 }).addTo(map);
        }
        map.fitBounds(polylineRef.current.getBounds(), { padding: [30, 30] });
      }
      
      // Update current position marker
      if (currentPosition) {
        const pos = [currentPosition.latitude, currentPosition.longitude];
        if (markerRef.current) {
          markerRef.current.setLatLng(pos);
        } else {
          const icon = L.divIcon({ 
            html: '<div style="background:#c8ff00;width:14px;height:14px;border-radius:50%;border:3px solid #000;box-shadow:0 0 10px #c8ff00"></div>', 
            className: '',
            iconAnchor: [7, 7]
          });
          markerRef.current = L.marker(pos, { icon }).addTo(map);
        }
        if (positions.length <= 1) {
          map.setView(pos, 16);
        }
      }
    };
    
    if (window.L) {
      init();
    } else if (!window._leafletLoadedTracker) {
      window._leafletLoadedTracker = true;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = init;
      document.head.appendChild(script);
    } else {
      const poll = setInterval(() => { if (window.L) { clearInterval(poll); init(); } }, 100);
    }
  }, [positions, currentPosition]);

  return <View ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 16 }} />;
}


// ─── RUTER TAB ────────────────────────────────────────────────────────────────
function RoutesMap({ route, center, zoom = 14, savedRoutes = [] }) {
  const rt = StyleSheet.create({
    map: { width: '100%', height: 380, borderRadius: 16, overflow: 'hidden' },
  });
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const routeLayersRef = React.useRef([]);
  const centerMarkerRef = React.useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    const init = () => {
      if (mapInstanceRef.current) {
        const L = window.L;
        if (center) {
          mapInstanceRef.current.setView(center, zoom);
          if (centerMarkerRef.current) centerMarkerRef.current.remove();
          if (!route?.points?.length) {
            const icon = L.divIcon({ html: '<div style="background:#c8ff00;width:12px;height:12px;border-radius:50%;border:2px solid #000;box-shadow:0 0 8px #c8ff00"></div>', className: '' });
            centerMarkerRef.current = L.marker(center, { icon }).addTo(mapInstanceRef.current);
          }
        }
        routeLayersRef.current.forEach(l => l.remove());
        routeLayersRef.current = [];
        if (route?.points?.length > 1) {
          if (centerMarkerRef.current) { centerMarkerRef.current.remove(); centerMarkerRef.current = null; }
          const poly = L.polyline(route.points.map(p => [p.lat, p.lon]), {
            color: colors.accent, weight: 5, opacity: 0.95,
          }).addTo(mapInstanceRef.current);
          routeLayersRef.current.push(poly);
          const startIcon = L.divIcon({ html: '<div style="background:#c8ff00;width:14px;height:14px;border-radius:50%;border:2px solid #000"></div>', className: '' });
          const endIcon = L.divIcon({ html: '<div style="background:#ff6b35;width:14px;height:14px;border-radius:50%;border:2px solid #000"></div>', className: '' });
          routeLayersRef.current.push(L.marker(route.points[0], { icon: startIcon }).addTo(mapInstanceRef.current));
          if (route.points.length > 1) routeLayersRef.current.push(L.marker(route.points[route.points.length-1], { icon: endIcon }).addTo(mapInstanceRef.current));
          mapInstanceRef.current.fitBounds(poly.getBounds(), { padding: [30, 30] });
        }
        savedRoutes.forEach(sr => {
          if (sr.points?.length > 1) {
            const p = L.polyline(sr.points.map(p => [p.lat, p.lon]), { color: '#5b9bff', weight: 3, opacity: 0.5 }).addTo(mapInstanceRef.current);
            routeLayersRef.current.push(p);
          }
        });
        return;
      }
      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
      map.setView(center || [56.0, 10.5], zoom);
      mapInstanceRef.current = map;
    };
    if (window._leafletLoaded && window.L) { init(); }
    else if (!window._leafletLoadedRoutes) {
      window._leafletLoadedRoutes = true;
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
      const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload = init; document.head.appendChild(script);
    } else { const poll = setInterval(() => { if (window.L) { clearInterval(poll); init(); } }, 100); }
  }, [route, savedRoutes, center]);

  if (typeof window === 'undefined') return <View style={rt.map}><Text style={{ color: colors.dim, fontSize: 13 }}>Kort ikke tilgængeligt</Text></View>;
  return <View ref={mapRef} style={rt.map} />;
}


export function RoutesTab({ profile, runs }) {
  const rt = StyleSheet.create({
  map:              { width: '100%', height: 380, borderRadius: 16, overflow: 'hidden' },
  mapWrap:          { borderRadius: 16, overflow: 'hidden', marginBottom: 10, backgroundColor: colors.card, position: 'relative' },
  mapOverlay:       { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card2 },
  mapOverlayEmoji:  { fontSize: 36, marginBottom: 8 },
  mapOverlayText:   { color: colors.dim, fontSize: 13, textAlign: 'center' },
  locBox:           { marginBottom: 12, position: 'relative', zIndex: 999 },
  autocomplete:     { backgroundColor: colors.card2, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginTop: 4, overflow: 'hidden', zIndex: 999 },
  autocompleteItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border2 },
  autocompleteText: { color: colors.text, fontSize: 13 },
  locBtn:           { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  locOrText:        { color: colors.muted, fontSize: 11, textAlign: 'center', marginBottom: 10 },
  cityRow:          { flexDirection: 'row', gap: 8 },
  cityInput:        { flex: 1, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 13, borderWidth: 1, borderColor: colors.border },
  locBtnText:       { color: colors.black, fontWeight: '700', fontSize: 14 },
  locFound:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 10, padding: 10, marginBottom: 8 },
  locFoundText:     { color: colors.dim, fontSize: 12 },
  locReset:         { color: colors.accent, fontSize: 12, fontWeight: '600' },
  locError:         { color: colors.secondary, fontSize: 12, marginBottom: 8 },
  configCard:       { backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.border, gap: 10 },
  configRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  configLabel:      { color: colors.dim, fontSize: 12, fontWeight: '600', width: 54 },
  kmPicker:         { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
  kmBtn:            { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border2 },
  kmBtnActive:      { backgroundColor: colors.accent + '25', borderColor: colors.accent },
  kmBtnText:        { color: colors.dim, fontSize: 12, fontWeight: '600' },
  kmBtnTextActive:  { color: colors.accent },
  typePicker:       { flexDirection: 'row', gap: 6, flex: 1 },
  typeBtn:          { flex: 1, paddingVertical: 6, borderRadius: 10, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border2 },
  typeBtnActive:    { backgroundColor: colors.accent + '25', borderColor: colors.accent },
  typeBtnText:      { color: colors.dim, fontSize: 11, fontWeight: '600' },
  typeBtnTextActive:{ color: colors.accent },
  generateBtn:      { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  generateBtnText:  { color: colors.black, fontWeight: '800', fontSize: 14 },
  section:          { marginBottom: 16 },
  sectionTitle:     { fontSize: 10, color: colors.dim, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  routeCard:        { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  routeCardActive:  { borderColor: colors.accent, backgroundColor: colors.accent + '08' },
  routeTop:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  routeName:        { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  routeHighlight:   { fontSize: 12, color: colors.dim, lineHeight: 16 },
  routeKm:          { fontSize: 20, fontWeight: '900', color: colors.accent, marginLeft: 8 },
  routeMeta:        { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  diffBadge:        { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  diffText:         { fontSize: 10, fontWeight: '700' },
  saveBtn:          { marginTop: 10, backgroundColor: colors.accent + '20', borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.accent + '50' },
  saveBtnText:      { color: colors.accent, fontWeight: '700', fontSize: 13 },
  emptyWrap:        { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji:       { fontSize: 40, marginBottom: 12 },
  emptyTitle:       { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptyDesc:        { color: colors.dim, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  });
  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState('');
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressResults, setAddressResults] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [activeTab, setActiveTab] = useState('forslag');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [saveMsg, setSaveMsg] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [kmGoal, setKmGoal] = useState('5');
  const [routeType, setRouteType] = useState('loop');

  useEffect(() => {
    setSavedRoutes(profile?.savedRoutes || []);
  }, [profile]);

  const getLocation = () => {
    setLoadingLoc(true); setLocError('');
    if (!navigator.geolocation) { setLocError('GPS ikke understøttet'); setLoadingLoc(false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'Din position' }; setLocation(loc); window._lastKnownLocation = loc; setLoadingLoc(false); },
      () => { setLocError('GPS mislykkedes — søg din adresse nedenfor'); setLoadingLoc(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const searchAddress = async (query) => {
    if (query.length < 3) { setAddressResults([]); return; }
    setSearchingAddress(true);
    try {
      const r = await fetch(`${SERVER}/nominatim?q=${encodeURIComponent(query)}`);
      const data = await r.json();
      setAddressResults(data.map(d => ({
        label: (d.display_name || d.name || 'Ukendt adresse').split(',').slice(0,3).join(','),
        lat: parseFloat(d.lat),
        lon: parseFloat(d.lon),
      })));
    } catch {}
    setSearchingAddress(false);
  };

  const selectAddress = (result) => {
    setLocation({ lat: result.lat, lon: result.lon, name: result.label.split(',')[0] });
    window._lastKnownLocation = { lat: result.lat, lon: result.lon };
    setAddressInput(result.label.split(',')[0]);
    setAddressResults([]);
  };

  const generateRoutes = async () => {
    if (!location) return;
    setLoadingRoutes(true); setSuggestions([]); setSelectedRoute(null);
    try {
      const kmNum = parseFloat(kmGoal);
      const radiusM = Math.round(kmNum * 400);
      const circleWaypoints = (angleOffsets) => {
        const r = (kmNum / (2 * Math.PI)) / 111;
        return angleOffsets.map(angle => ({
          lat: location.lat + r * Math.cos(angle * Math.PI / 180),
          lon: location.lon + r * Math.sin(angle * Math.PI / 180) / Math.cos(location.lat * Math.PI / 180),
        }));
      };

      const routeConfigs = [
        { label: 'Rute A', fallbackAngles: [45, 135, 225] },
        { label: 'Rute B', fallbackAngles: [0, 90, 180] },
        { label: 'Rute C', fallbackAngles: [60, 180, 300] },
      ];

      const results = await Promise.all(routeConfigs.map(async (cfg) => {
        const wps = circleWaypoints(cfg.fallbackAngles);
        const coords = routeType === 'loop' ? [location, ...wps, location] : [location, wps[0]];
        const ghPoints = coords.map(c => `point=${c.lat},${c.lon}`).join('&');
        const ghUrl = `https://graphhopper.com/api/1/route?${ghPoints}&vehicle=foot&locale=da&points_encoded=false&key=LijBPDQGfu7Iiq80w3HzwB4RUDJbMbhs6BU0dEnn`;
        const resp = await fetch(ghUrl);
        const data = await resp.json();
        if (!data.paths?.[0]) return null;
        const coords_list = data.paths[0].points.coordinates;
        const distKm = data.paths[0].distance / 1000;
        const points = coords_list.map(c => ({ lat: c[1], lon: c[0] }));
        return {
          id: Math.random().toString(36).slice(2),
          name: cfg.label,
          km: Math.round(distKm * 10) / 10,
          type: routeType,
          difficulty: distKm < 4 ? 'let' : distKm < 7 ? 'moderat' : 'hård',
          highlight: `${Math.round(distKm)} km rundtur`,
          points,
        };
      }));
      const validRoutes = results.filter(Boolean);
      if (validRoutes.length > 0) {
        setSuggestions(validRoutes);
        setSelectedRoute(validRoutes[0]);
      } else {
        setLocError('Kunne ikke beregne ruter');
      }
    } catch (e) {
      setLocError(e.message || 'Fejl ved rutegenerering');
    }
    setLoadingRoutes(false);
  };

  const diffColor = { let: colors.green, moderat: colors.accent, hård: colors.secondary };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <View style={rt.mapWrap}>
        <RoutesMap route={selectedRoute} center={location ? [location.lat, location.lon] : null} savedRoutes={savedRoutes} />
        {!location && (
          <View style={rt.mapOverlay}>
            <Text style={rt.mapOverlayEmoji}>🗺️</Text>
            <Text style={rt.mapOverlayText}>Søg en adresse for at se ruter</Text>
          </View>
        )}
      </View>

      {!location ? (
        <View style={rt.locBox}>
          <TouchableOpacity style={rt.locBtn} onPress={getLocation} disabled={loadingLoc}>
            {loadingLoc ? <ActivityIndicator color={colors.black} size="small" /> : <Text style={rt.locBtnText}>📍 Brug GPS</Text>}
          </TouchableOpacity>
          <Text style={rt.locOrText}>— eller indtast adresse —</Text>
          <View style={rt.cityRow}>
            <TextInput style={rt.cityInput} placeholder="Søndervej 12, Kokkedal..." placeholderTextColor={colors.muted} value={addressInput} onChangeText={(t) => { setAddressInput(t); searchAddress(t); }} />
          </View>
          {addressResults.length > 0 && (
            <View style={rt.autocomplete}>
              {addressResults.map((r, i) => (
                <TouchableOpacity key={i} style={rt.autocompleteItem} onPress={() => selectAddress(r)}>
                  <Text style={rt.autocompleteText}>📍 {r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={rt.locFound}>
          <Text style={rt.locFoundText}>📍 {location.name}</Text>
          <TouchableOpacity onPress={() => { setLocation(null); setSuggestions([]); setSelectedRoute(null); }}>
            <Text style={rt.locReset}>Skift</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!locError && <Text style={rt.locError}>{locError}</Text>}

      {location && (
        <View style={rt.configCard}>
          <View style={rt.configRow}>
            <Text style={rt.configLabel}>Afstand</Text>
            <View style={rt.kmPicker}>
              {['3','5','8','10','15'].map(km => (
                <TouchableOpacity key={km} style={[rt.kmBtn, kmGoal === km && rt.kmBtnActive]} onPress={() => setKmGoal(km)}>
                  <Text style={[rt.kmBtnText, kmGoal === km && rt.kmBtnTextActive]}>{km} km</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={rt.generateBtn} onPress={generateRoutes} disabled={loadingRoutes}>
            {loadingRoutes ? <ActivityIndicator color={colors.black} size="small" /> : <Text style={rt.generateBtnText}>🗺️ Find ruter</Text>}
          </TouchableOpacity>
        </View>
      )}

      {suggestions.length > 0 && (
        <View style={rt.section}>
          <Text style={rt.sectionTitle}>FORESLÅEDE RUTER</Text>
          {suggestions.map(route => (
            <TouchableOpacity key={route.id} style={[rt.routeCard, selectedRoute?.id === route.id && rt.routeCardActive]} onPress={() => setSelectedRoute(route)}>
              <View style={rt.routeTop}>
                <View style={{ flex: 1 }}>
                  <Text style={rt.routeName}>{route.name}</Text>
                  <Text style={rt.routeHighlight}>{route.highlight}</Text>
                </View>
                <Text style={rt.routeKm}>{route.km} km</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}


// ─── MANUEL RUTEPLANNER ──────────────────────────────────────────────────────
export function ManualRoutePlanner({ profile }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>🗺️</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Manuel ruteplanlægning</Text>
      <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>Kommer snart! Her vil du kunne tegne din egen rute på kortet.</Text>
    </View>
  );
}


// ─── RUNTRACKER COMPONENT ───────────────────────────────────────────────────
// Props fra App.js: activityType, onBack, profile, level, weekPlan, nextWorkout, runs
export default function RunTracker({ activityType = 'run', onBack, profile, level, weekPlan, nextWorkout, runs }) {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [positions, setPositions] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle', 'waiting', 'active', 'error'
  const [gpsError, setGpsError] = useState('');
  const watchIdRef = React.useRef(null);
  const intervalRef = React.useRef(null);
  const startTimeRef = React.useRef(null);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { padding: 20, alignItems: 'center', paddingTop: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: colors.muted },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 20 },
    statBox: { alignItems: 'center', flex: 1 },
    statValue: { fontSize: 32, fontWeight: 'bold', color: colors.accent },
    statLabel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600' },
    mapContainer: { flex: 1, marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.card },
    controls: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 16, paddingBottom: 30 },
    btn: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    btnStart: { backgroundColor: colors.accent },
    btnPause: { backgroundColor: '#f59e0b' },
    btnStop: { backgroundColor: '#ef4444' },
    btnIcon: { fontSize: 26, color: '#ffffff' },
    btnIconStop: { fontSize: 26, color: '#ffffff' },
    backBtn: { 
      position: 'absolute', 
      top: 16, 
      left: 16, 
      zIndex: 100, 
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: 'rgba(0,0,0,0.7)', 
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    backText: { fontSize: 15, color: '#fff', fontWeight: '600' },
    gpsStatus: { textAlign: 'center', fontSize: 12, paddingVertical: 6, marginHorizontal: 16, borderRadius: 8 },
    gpsError: { color: '#fff', backgroundColor: '#ef4444' },
    gpsActive: { color: '#000', backgroundColor: colors.accent },
    gpsWaiting: { color: colors.muted, backgroundColor: colors.surface },
    gpsIdle: { color: colors.muted, backgroundColor: 'transparent' },
  });

  // Haversine distance calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const startTracking = () => {
    console.log('startTracking called');
    setIsTracking(true);
    setIsPaused(false);
    setGpsStatus('waiting');
    setGpsError('');
    startTimeRef.current = Date.now() - (duration * 1000);
    
    // Start timer
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsed);
    }, 1000);

    // Start GPS
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          console.log('GPS position received:', position.coords);
          setGpsStatus('active');
          const newPos = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: position.timestamp
          };
          setCurrentPosition(newPos);
          setPositions(prev => {
            if (prev.length > 0) {
              const lastPos = prev[prev.length - 1];
              const dist = calculateDistance(lastPos.latitude, lastPos.longitude, newPos.latitude, newPos.longitude);
              // Filter GPS noise - only count moves > 3 meters
              if (dist > 3) {
                setDistance(d => d + dist);
                return [...prev, newPos];
              }
              return prev;
            }
            return [newPos];
          });
        },
        (error) => {
          console.log('GPS error:', error);
          setGpsStatus('error');
          if (error.code === 1) setGpsError('GPS tilladelse nægtet');
          else if (error.code === 2) setGpsError('GPS utilgængelig');
          else setGpsError('GPS timeout');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
      );
    } else {
      setGpsStatus('error');
      setGpsError('GPS ikke understøttet');
    }
  };

  const pauseTracking = () => {
    console.log('pauseTracking called');
    setIsPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (watchIdRef.current && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const resumeTracking = () => {
    console.log('resumeTracking called');
    setIsPaused(false);
    startTimeRef.current = Date.now() - (duration * 1000);
    startTracking();
  };

  const stopAndSave = () => {
    console.log('stopAndSave called');
    // Stop tracking
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (watchIdRef.current && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    
    // TODO: Save run data to server here
    const runData = {
      activityType,
      distance,
      duration,
      positions,
      date: new Date().toISOString(),
      pace: distance > 0 ? duration / 60 / (distance / 1000) : 0
    };
    console.log('Run data:', runData);
    
    // Go back
    if (onBack) onBack();
  };

  const handleBack = () => {
    console.log('handleBack called');
    // Clean up
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (watchIdRef.current && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    // Go back to dashboard
    if (onBack) onBack();
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = () => {
    if (distance < 50) return '--:--';
    const paceInSeconds = duration / (distance / 1000);
    const mins = Math.floor(paceInSeconds / 60);
    const secs = Math.floor(paceInSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <View style={s.container}>
      {/* Back button - always visible */}
      <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
        <Text style={s.backText}>← Tilbage</Text>
      </TouchableOpacity>

      <View style={s.header}>
        <Text style={s.title}>{activityType === 'run' ? '🏃 Løb' : '🚶 Gå'}</Text>
        <Text style={s.subtitle}>
          {!isTracking ? 'Tryk start for at begynde' : isPaused ? 'På pause' : 'Tracker...'}
        </Text>
      </View>

      {/* GPS Status indicator */}
      {isTracking && (
        <Text style={[
          s.gpsStatus, 
          gpsStatus === 'error' ? s.gpsError : 
          gpsStatus === 'active' ? s.gpsActive : 
          gpsStatus === 'waiting' ? s.gpsWaiting : s.gpsIdle
        ]}>
          {gpsStatus === 'error' ? `⚠️ ${gpsError}` : 
           gpsStatus === 'active' ? '📍 GPS aktiv' : 
           gpsStatus === 'waiting' ? '⏳ Finder GPS signal...' : ''}
        </Text>
      )}

      {/* Stats */}
      <View style={s.statsContainer}>
        <View style={s.statBox}>
          <Text style={s.statValue}>{(distance / 1000).toFixed(2)}</Text>
          <Text style={s.statLabel}>KM</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statValue}>{formatTime(duration)}</Text>
          <Text style={s.statLabel}>TID</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statValue}>{formatPace()}</Text>
          <Text style={s.statLabel}>MIN/KM</Text>
        </View>
      </View>

      {/* Map */}
      <View style={s.mapContainer}>
        <TrackerMap positions={positions} currentPosition={currentPosition} />
      </View>

      {/* Controls */}
      <View style={s.controls}>
        {!isTracking ? (
          // Not started - show play button
          <TouchableOpacity style={[s.btn, s.btnStart]} onPress={startTracking}>
            <View style={{ width: 0, height: 0, borderLeftWidth: 18, borderLeftColor: '#fff', borderTopWidth: 11, borderTopColor: 'transparent', borderBottomWidth: 11, borderBottomColor: 'transparent', marginLeft: 4 }} />
          </TouchableOpacity>
        ) : isPaused ? (
          // Paused - show resume and stop
          <>
            <TouchableOpacity style={[s.btn, s.btnStart]} onPress={resumeTracking}>
              <View style={{ width: 0, height: 0, borderLeftWidth: 18, borderLeftColor: '#fff', borderTopWidth: 11, borderTopColor: 'transparent', borderBottomWidth: 11, borderBottomColor: 'transparent', marginLeft: 4 }} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnStop]} onPress={stopAndSave}>
              <View style={{ width: 22, height: 22, backgroundColor: '#fff', borderRadius: 3 }} />
            </TouchableOpacity>
          </>
        ) : (
          // Tracking - show pause and stop
          <>
            <TouchableOpacity style={[s.btn, s.btnPause]} onPress={pauseTracking}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={{ width: 6, height: 22, backgroundColor: '#fff', borderRadius: 2 }} />
                <View style={{ width: 6, height: 22, backgroundColor: '#fff', borderRadius: 2 }} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnStop]} onPress={stopAndSave}>
              <View style={{ width: 22, height: 22, backgroundColor: '#fff', borderRadius: 3 }} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
