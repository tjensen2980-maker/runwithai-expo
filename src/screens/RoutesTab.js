import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { colors, SERVER, getAuthToken } from '../data';
import { Icon } from '../components/Icons';

// ─── RUTER MAP ───────────────────────────────────────────────────────────────
function RoutesMap({ route, center, zoom = 14, savedRoutes = [] }) {
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

  if (typeof window === 'undefined') return <View style={{ width: '100%', height: 300, borderRadius: 16, backgroundColor: colors.card }}><Text style={{ color: colors.dim, fontSize: 13 }}>Kort ikke tilgængeligt</Text></View>;
  return <View ref={mapRef} style={{ width: '100%', height: 300, borderRadius: 16, overflow: 'hidden' }} />;
}


// ─── AUTO ROUTES TAB ─────────────────────────────────────────────────────────
function AutoRoutesContent({ profile, runs }) {
  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState('');
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressResults, setAddressResults] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [saveMsg, setSaveMsg] = useState('');
  const [kmGoal, setKmGoal] = useState('5');
  const [routeType, setRouteType] = useState('loop');

  useEffect(() => {
    setSavedRoutes(profile?.savedRoutes || []);
  }, [profile]);

  const getLocation = () => {
    setLoadingLoc(true); setLocError('');
    if (!navigator.geolocation) { setLocError('GPS ikke understøttet'); setLoadingLoc(false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { 
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'Din position' }; 
        setLocation(loc); 
        window._lastKnownLocation = loc; 
        setLoadingLoc(false); 
      },
      () => { setLocError('GPS mislykkedes — søg din adresse nedenfor'); setLoadingLoc(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Auto-start GPS when component mounts
  useEffect(() => {
    if (!location && !loadingLoc) {
      getLocation();
    }
  }, []);

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
      
      // For smooth circular routes, we only need 2-3 waypoints
      // placed strategically to guide the route in a loop
      // GraphHopper will find actual roads between them
      
      const createLoopRoute = async (direction, label) => {
        // Calculate how far to place the "turn-around" point
        // For a loop, we go roughly 1/4 of the total distance out, 
        // then curve around and come back
        const quarterDistance = kmNum / 4;
        const radiusKm = quarterDistance / 1.3; // Adjust for road curvature
        const radiusDeg = radiusKm / 111;
        
        // Place just 2 waypoints to create a simple loop
        // One point to the "side", one point "ahead" - creates a teardrop shape
        const angle1 = direction;
        const angle2 = direction + 90; // 90 degrees offset
        
        const wp1 = {
          lat: location.lat + radiusDeg * Math.cos(angle1 * Math.PI / 180),
          lon: location.lon + radiusDeg * Math.sin(angle1 * Math.PI / 180) / Math.cos(location.lat * Math.PI / 180),
        };
        const wp2 = {
          lat: location.lat + radiusDeg * Math.cos(angle2 * Math.PI / 180),
          lon: location.lon + radiusDeg * Math.sin(angle2 * Math.PI / 180) / Math.cos(location.lat * Math.PI / 180),
        };
        
        // Route: start -> wp1 -> wp2 -> start (simple loop, no backtracking)
        const coords = [location, wp1, wp2, location];
        const ghPoints = coords.map(c => `point=${c.lat},${c.lon}`).join('&');
        const ghUrl = `https://graphhopper.com/api/1/route?${ghPoints}&vehicle=foot&locale=da&points_encoded=false&key=LijBPDQGfu7Iiq80w3HzwB4RUDJbMbhs6BU0dEnn`;
        
        const resp = await fetch(ghUrl);
        const data = await resp.json();
        if (!data.paths?.[0]) return null;
        
        const distKm = data.paths[0].distance / 1000;
        
        // Check if route is reasonable (within 40% of target)
        if (distKm > kmNum * 1.4 || distKm < kmNum * 0.6) return null;
        
        const points = data.paths[0].points.coordinates.map(c => ({ lat: c[1], lon: c[0] }));
        
        return {
          id: Math.random().toString(36).slice(2),
          name: label,
          km: Math.round(distKm * 10) / 10,
          type: 'loop',
          difficulty: distKm < 5 ? 'let' : distKm < 10 ? 'moderat' : distKm < 20 ? 'hård' : 'meget hård',
          highlight: `${Math.round(distKm)} km rundtur`,
          points,
        };
      };
      
      const createOutAndBackRoute = async (direction, label) => {
        // Simple out and back - go half distance, return same way
        const halfDistance = kmNum / 2;
        const radiusKm = halfDistance / 1.3;
        const radiusDeg = radiusKm / 111;
        
        const endpoint = {
          lat: location.lat + radiusDeg * Math.cos(direction * Math.PI / 180),
          lon: location.lon + radiusDeg * Math.sin(direction * Math.PI / 180) / Math.cos(location.lat * Math.PI / 180),
        };
        
        const coords = [location, endpoint, location];
        const ghPoints = coords.map(c => `point=${c.lat},${c.lon}`).join('&');
        const ghUrl = `https://graphhopper.com/api/1/route?${ghPoints}&vehicle=foot&locale=da&points_encoded=false&key=LijBPDQGfu7Iiq80w3HzwB4RUDJbMbhs6BU0dEnn`;
        
        const resp = await fetch(ghUrl);
        const data = await resp.json();
        if (!data.paths?.[0]) return null;
        
        const distKm = data.paths[0].distance / 1000;
        if (distKm > kmNum * 1.4 || distKm < kmNum * 0.6) return null;
        
        const points = data.paths[0].points.coordinates.map(c => ({ lat: c[1], lon: c[0] }));
        
        return {
          id: Math.random().toString(36).slice(2),
          name: label,
          km: Math.round(distKm * 10) / 10,
          type: 'out-and-back',
          difficulty: distKm < 5 ? 'let' : distKm < 10 ? 'moderat' : distKm < 20 ? 'hård' : 'meget hård',
          highlight: `${Math.round(distKm)} km ud & tilbage`,
          points,
        };
      };

      // Generate 3 route options in different directions
      const directions = [0, 120, 240]; // North, Southeast, Southwest
      const labels = ['Rute A', 'Rute B', 'Rute C'];
      
      const results = await Promise.all(
        directions.map((dir, i) => 
          routeType === 'loop' 
            ? createLoopRoute(dir, labels[i])
            : createOutAndBackRoute(dir, labels[i])
        )
      );
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

  const saveRoute = (route) => {
    const updated = [...savedRoutes.filter(r => r.id !== route.id), {
      ...route,
      savedAt: new Date().toISOString(),
    }];
    setSavedRoutes(updated);
    setSaveMsg('✓ Gemt!');
    setTimeout(() => setSaveMsg(''), 2000);
    // Save to server
    try {
      const token = getAuthToken();
      fetch(`${SERVER}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ savedRoutes: updated }),
      });
    } catch {}
  };

  const diffColor = { let: '#22c55e', moderat: colors.accent, hård: '#ef4444' };

  return (
    <View style={{ flex: 1 }}>
      {/* Map */}
      <View style={{ marginBottom: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.card, position: 'relative' }}>
        <RoutesMap route={selectedRoute} center={location ? [location.lat, location.lon] : null} savedRoutes={savedRoutes} />
        {!location && (
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🗺️</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>Brug GPS eller søg adresse</Text>
          </View>
        )}
      </View>

      {/* Location input */}
      {!location ? (
        <View style={{ marginBottom: 12, zIndex: 999 }}>
          <TouchableOpacity 
            style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 }} 
            onPress={getLocation} 
            disabled={loadingLoc}
          >
            {loadingLoc 
              ? <ActivityIndicator color={colors.black} size="small" /> 
              : <Text style={{ color: colors.black, fontWeight: '700', fontSize: 14 }}>📍 Brug GPS</Text>}
          </TouchableOpacity>
          <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginBottom: 10 }}>— eller indtast adresse —</Text>
          <TextInput 
            style={{ backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 13, borderWidth: 1, borderColor: colors.border }} 
            placeholder="Søndervej 12, Kokkedal..." 
            placeholderTextColor={colors.muted} 
            value={addressInput} 
            onChangeText={(t) => { setAddressInput(t); searchAddress(t); }} 
          />
          {addressResults.length > 0 && (
            <View style={{ backgroundColor: colors.card, borderRadius: 10, marginTop: 4, borderWidth: 1, borderColor: colors.border }}>
              {addressResults.map((r, i) => (
                <TouchableOpacity key={i} style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: i < addressResults.length - 1 ? 1 : 0, borderBottomColor: colors.border }} onPress={() => selectAddress(r)}>
                  <Text style={{ color: colors.text, fontSize: 13 }}>📍 {r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 10, padding: 10, marginBottom: 12 }}>
          <Text style={{ color: colors.dim, fontSize: 12 }}>📍 {location.name}</Text>
          <TouchableOpacity onPress={() => { setLocation(null); setSuggestions([]); setSelectedRoute(null); setAddressInput(''); }}>
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>Skift</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!locError && <Text style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{locError}</Text>}

      {/* Config */}
      {location && (
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.border, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: colors.dim, fontSize: 12, fontWeight: '600', width: 54 }}>Afstand</Text>
            <View style={{ flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' }}>
              {['3','5','8','10','15','20','30','40','50','60'].map(km => (
                <TouchableOpacity 
                  key={km} 
                  style={[
                    { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                    kmGoal === km && { backgroundColor: colors.accent + '25', borderColor: colors.accent }
                  ]} 
                  onPress={() => setKmGoal(km)}
                >
                  <Text style={[{ color: colors.dim, fontSize: 12, fontWeight: '600' }, kmGoal === km && { color: colors.accent }]}>{km}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: colors.dim, fontSize: 12, fontWeight: '600', width: 54 }}>Type</Text>
            <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
              {[{ id: 'loop', label: 'Rundtur' }, { id: 'out-and-back', label: 'Ud & tilbage' }].map(t => (
                <TouchableOpacity 
                  key={t.id} 
                  style={[
                    { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                    routeType === t.id && { backgroundColor: colors.accent + '25', borderColor: colors.accent }
                  ]} 
                  onPress={() => setRouteType(t.id)}
                >
                  <Text style={[{ color: colors.dim, fontSize: 11, fontWeight: '600' }, routeType === t.id && { color: colors.accent }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity 
            style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 }} 
            onPress={generateRoutes} 
            disabled={loadingRoutes}
          >
            {loadingRoutes 
              ? <ActivityIndicator color={colors.black} size="small" /> 
              : <Text style={{ color: colors.black, fontWeight: '800', fontSize: 14 }}>🗺️ Find ruter</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 10, color: colors.dim, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>FORESLÅEDE RUTER</Text>
          {suggestions.map(route => (
            <TouchableOpacity 
              key={route.id} 
              style={[
                { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
                selectedRoute?.id === route.id && { borderColor: colors.accent, backgroundColor: colors.accent + '08' }
              ]} 
              onPress={() => setSelectedRoute(route)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 }}>{route.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.dim }}>{route.highlight}</Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: colors.accent }}>{route.km} km</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: (diffColor[route.difficulty] || colors.dim) + '20', borderColor: diffColor[route.difficulty] || colors.dim }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: diffColor[route.difficulty] || colors.dim }}>{route.difficulty}</Text>
                </View>
              </View>
              {selectedRoute?.id === route.id && (
                <TouchableOpacity 
                  style={{ marginTop: 10, backgroundColor: colors.accent + '20', borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.accent + '50' }} 
                  onPress={() => saveRoute(route)}
                >
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>{saveMsg || '🔖 Gem rute'}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Empty state */}
      {savedRoutes.length === 0 && suggestions.length === 0 && location && !loadingRoutes && (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺️</Text>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 8 }}>Tryk "Find ruter"</Text>
          <Text style={{ color: colors.dim, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>Ruter beregnes direkte langs rigtige veje og stier via OpenStreetMap.</Text>
        </View>
      )}
    </View>
  );
}


// ─── MANUEL PLANNER ─────────────────────────────────────────────────────────
function ManualPlannerContent({ profile }) {
  const [waypoints, setWaypoints] = useState([]);
  const [routePoints, setRoutePoints] = useState([]);
  const [totalKm, setTotalKm] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('waiting'); // 'waiting', 'active', 'error'
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const layersRef = React.useRef([]);
  const wpMarkersRef = React.useRef([]);
  const waypointsRef = React.useRef([]);
  const userMarkerRef = React.useRef(null);

  useEffect(() => { waypointsRef.current = waypoints; }, [waypoints]);

  // Auto-fetch GPS on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setGpsStatus('waiting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          window._lastKnownLocation = loc;
          setGpsStatus('active');
          // Update map center if map is ready
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([loc.lat, loc.lon], 15);
            // Add user location marker
            if (window.L) {
              if (userMarkerRef.current) userMarkerRef.current.remove();
              const icon = window.L.divIcon({
                html: '<div style="background:#c8ff00;width:14px;height:14px;border-radius:50%;border:3px solid #000;box-shadow:0 0 10px #c8ff00"></div>',
                className: '',
                iconAnchor: [7, 7]
              });
              userMarkerRef.current = window.L.marker([loc.lat, loc.lon], { icon }).addTo(mapInstanceRef.current);
            }
          }
        },
        () => { setGpsStatus('error'); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  useEffect(() => {
    if (waypoints.length < 2) {
      setRoutePoints([]);
      setTotalKm(0);
      return;
    }
    const calc = async () => {
      setLoading(true);
      try {
        const pts = waypoints.map(w => `point=${w.lat},${w.lon}`).join('&');
        const url = `https://graphhopper.com/api/1/route?${pts}&vehicle=foot&locale=da&points_encoded=false&key=LijBPDQGfu7Iiq80w3HzwB4RUDJbMbhs6BU0dEnn`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.paths?.[0]) {
          const coords = data.paths[0].points.coordinates.map(c => ({ lat: c[1], lon: c[0] }));
          setRoutePoints(coords);
          setTotalKm(Math.round(data.paths[0].distance / 100) / 10);
          // Draw route
          if (mapInstanceRef.current && window.L) {
            layersRef.current.forEach(l => l.remove());
            layersRef.current = [];
            const poly = window.L.polyline(coords.map(p => [p.lat, p.lon]), { color: '#fa3c00', weight: 5, opacity: 0.9 });
            poly.addTo(mapInstanceRef.current);
            layersRef.current.push(poly);
          }
        }
      } catch {}
      setLoading(false);
    };
    calc();
  }, [waypoints]);

  const initMap = () => {
    if (mapInstanceRef.current || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    
    // Center on user location or Denmark
    if (window._lastKnownLocation) {
      map.setView([window._lastKnownLocation.lat, window._lastKnownLocation.lon], 15);
      // Add user location marker
      const icon = L.divIcon({
        html: '<div style="background:#c8ff00;width:14px;height:14px;border-radius:50%;border:3px solid #000;box-shadow:0 0 10px #c8ff00"></div>',
        className: '',
        iconAnchor: [7, 7]
      });
      userMarkerRef.current = L.marker([window._lastKnownLocation.lat, window._lastKnownLocation.lon], { icon }).addTo(map);
    } else {
      map.setView([56.15, 10.2], 13);
    }
    mapInstanceRef.current = map;

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      const newWp = { lat, lon: lng };
      const current = waypointsRef.current;
      const updated = [...current, newWp];

      const isFirst = current.length === 0;
      const icon = L.divIcon({
        html: `<div style="background:${isFirst ? '#0a0a0a' : '#fa3c00'};width:${isFirst ? 14 : 11}px;height:${isFirst ? 14 : 11}px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        className: '',
        iconAnchor: [isFirst ? 7 : 5.5, isFirst ? 7 : 5.5],
      });
      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        const idx = wpMarkersRef.current.indexOf(marker);
        if (idx !== -1) {
          marker.remove();
          wpMarkersRef.current.splice(idx, 1);
          setWaypoints(prev => prev.filter((_, i) => i !== idx));
        }
      });
      wpMarkersRef.current.push(marker);
      setWaypoints(updated);
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.L) { initMap(); return; }
    if (!window._leafletLoadedManual) {
      window._leafletLoadedManual = true;
      const link = document.createElement('link'); link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      const poll = setInterval(() => { if (window.L) { clearInterval(poll); initMap(); } }, 100);
    }
  }, []);

  const undoLast = () => {
    if (waypoints.length === 0) return;
    const last = wpMarkersRef.current.pop();
    if (last) last.remove();
    setWaypoints(prev => prev.slice(0, -1));
  };

  const clearAll = () => {
    wpMarkersRef.current.forEach(m => m.remove());
    wpMarkersRef.current = [];
    layersRef.current.forEach(l => l.remove());
    layersRef.current = [];
    setWaypoints([]);
    setRoutePoints([]);
    setTotalKm(0);
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: 6, lineHeight: 18 }}>
        Tryk på kortet for at sætte punkter. Ruten beregnes automatisk.
      </Text>
      
      {/* GPS Status */}
      <View style={{ 
        alignItems: 'center', 
        paddingVertical: 6, 
        marginBottom: 8, 
        borderRadius: 8,
        backgroundColor: gpsStatus === 'active' ? colors.accent + '20' : gpsStatus === 'error' ? '#ef444420' : colors.surface
      }}>
        <Text style={{ 
          fontSize: 12, 
          color: gpsStatus === 'active' ? colors.accent : gpsStatus === 'error' ? '#ef4444' : colors.muted,
          fontWeight: '600'
        }}>
          {gpsStatus === 'active' ? '📍 GPS aktiv' : gpsStatus === 'error' ? '⚠️ GPS fejl' : '⏳ Finder GPS...'}
        </Text>
      </View>

      <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12, height: 350 }}>
        <View ref={mapRef} style={{ width: '100%', height: 350 }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.accent }}>{totalKm > 0 ? `${totalKm} km` : '–'}</Text>
          <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '600' }}>TOTAL DISTANCE</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 13, color: colors.dim, fontWeight: '600' }}>{waypoints.length} {waypoints.length === 1 ? 'punkt' : 'punkter'}</Text>
          {loading && <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 4 }}/>}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border, opacity: waypoints.length === 0 ? 0.5 : 1 }} 
          onPress={undoLast} 
          disabled={waypoints.length === 0}
        >
          <Text style={{ color: colors.dim, fontWeight: '700', fontSize: 13 }}>↩ Fortryd</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border, opacity: waypoints.length === 0 ? 0.5 : 1 }} 
          onPress={clearAll} 
          disabled={waypoints.length === 0}
        >
          <Text style={{ color: colors.dim, fontWeight: '700', fontSize: 13 }}>✕ Ryd</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


// ─── MAIN ROUTES TAB (EXPORTED) ─────────────────────────────────────────────
export function RoutesTab({ profile, runs }) {
  const [activeTab, setActiveTab] = useState('auto');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Sub-tabs - OUTSIDE ScrollView so they don't scroll */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 8, backgroundColor: colors.bg }}>
        <TouchableOpacity 
          style={[
            { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 2 },
            activeTab === 'auto' 
              ? { backgroundColor: colors.black, borderColor: colors.black } 
              : { backgroundColor: colors.surface, borderColor: colors.border }
          ]} 
          onPress={() => setActiveTab('auto')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name='zap' size={16} color={activeTab === 'auto' ? '#fff' : colors.muted} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === 'auto' ? '#fff' : colors.muted }}>Auto-ruter</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 2 },
            activeTab === 'manual' 
              ? { backgroundColor: colors.black, borderColor: colors.black } 
              : { backgroundColor: colors.surface, borderColor: colors.border }
          ]} 
          onPress={() => setActiveTab('manual')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name='map' size={16} color={activeTab === 'manual' ? '#fff' : colors.muted} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === 'manual' ? '#fff' : colors.muted }}>Manuel planner</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Content - ONLY this part scrolls */}
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'auto' ? (
          <AutoRoutesContent profile={profile} runs={runs} />
        ) : (
          <ManualPlannerContent profile={profile} />
        )}
      </ScrollView>
    </View>
  );
}

export default RoutesTab;
