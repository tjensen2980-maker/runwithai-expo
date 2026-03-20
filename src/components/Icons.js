// ─── RUNWITHAI ICON LIBRARY (Feather/Nike-style outline SVG) ─────────────────
import React from 'react';
import { Image, View, Text } from 'react-native';

// Basis SVG-ikon builder
const ic = (path, size = 20, color = '#0a0a0a') => {
  const c = encodeURIComponent(color);
  const uri = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' fill='none' stroke='${c}' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>${path}</svg>`;
  return <Image source={{ uri }} style={{ width: size, height: size }} />;
};

// SVG paths
const PATHS = {
  // Natur / vejr
  sun:      "<circle cx='12' cy='12' r='5'/><line x1='12' y1='1' x2='12' y2='3'/><line x1='12' y1='21' x2='12' y2='23'/><line x1='4.22' y1='4.22' x2='5.64' y2='5.64'/><line x1='18.36' y1='18.36' x2='19.78' y2='19.78'/><line x1='1' y1='12' x2='3' y2='12'/><line x1='21' y1='12' x2='23' y2='12'/><line x1='4.22' y1='19.78' x2='5.64' y2='18.36'/><line x1='18.36' y1='5.64' x2='19.78' y2='4.22'/>",
  cloud:    "<path d='M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z'/>",
  rain:     "<line x1='16' y1='13' x2='16' y2='21'/><line x1='8' y1='13' x2='8' y2='21'/><line x1='12' y1='15' x2='12' y2='23'/><path d='M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25'/>",
  snow:     "<line x1='12' y1='2' x2='12' y2='22'/><path d='M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'/>",
  wind:     "<path d='M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2'/>",
  // Løb / fitness
  run:      "<circle cx='14' cy='3.5' r='1.5'/><path d='M8 20l3-6 3 3 2-3.5 3 6.5'/><path d='M10 14l-2.5-3 3.5-4 3 2 2-3'/>",
  heart:    "<path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'/>",
  activity: "<polyline points='22 12 18 12 15 21 9 3 6 12 2 12'/>",
  zap:      "<polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/>",
  award:    "<circle cx='12' cy='8' r='7'/><polyline points='8.21 13.89 7 23 12 20 17 23 15.79 13.88'/>",
  trophy:   "<polyline points='6 9 6 2 18 2 18 9'/><path d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2'/><rect x='6' y='18' width='12' height='4'/>",
  shoe:     "<path d='M2 16l4-10 4 6 4-4 6 8H2z'/>",
  // UI
  check:    "<polyline points='20 6 9 17 4 12'/>",
  checkCircle: "<path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/>",
  alert:    "<triangle points='10.29 3.86 1.82 18 22.18 18'><path d='M10.29 3.86L1.82 18h20.36zM12 9v4M12 17h.01'/></triangle><path d='M10.29 3.86L1.82 18h20.36z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>",
  warning:  "<path d='M10.29 3.86L1.82 18h20.36z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>",
  info:     "<circle cx='12' cy='12' r='10'/><line x1='12' y1='16' x2='12' y2='12'/><line x1='12' y1='8' x2='12.01' y2='8'/>",
  edit:     "<path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>",
  star:     "<polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'/>",
  fire:     "<path d='M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'/>",
  target:   "<circle cx='12' cy='12' r='10'/><circle cx='12' cy='12' r='6'/><circle cx='12' cy='12' r='2'/>",
  flag:     "<path d='M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z'/><line x1='4' y1='22' x2='4' y2='15'/>",
  // Navigation / UI
  home:     "<path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/>",
  chat:     "<path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/>",
  settings: "<line x1='4' y1='6' x2='20' y2='6'/><line x1='4' y1='12' x2='20' y2='12'/><line x1='4' y1='18' x2='20' y2='18'/>",
  user:     "<path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/>",
  calendar: "<rect x='3' y='4' width='18' height='18' rx='2' ry='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/>",
  map:      "<polygon points='1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6'/><line x1='8' y1='2' x2='8' y2='18'/><line x1='16' y1='6' x2='16' y2='22'/>",
  download: "<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/>",
  music:    "<path d='M9 18V5l12-2v13'/><circle cx='6' cy='18' r='3'/><circle cx='18' cy='16' r='3'/>",
  mute:     "<line x1='1' y1='1' x2='23' y2='23'/><path d='M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6'/><path d='M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23'/><line x1='12' y1='19' x2='12' y2='23'/><line x1='8' y1='23' x2='16' y2='23'/>",
  volume:   "<polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'/><path d='M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07'/>",
  chart:    "<line x1='18' y1='20' x2='18' y2='10'/><line x1='12' y1='20' x2='12' y2='4'/><line x1='6' y1='20' x2='6' y2='14'/>",
  smile:    "<circle cx='12' cy='12' r='10'/><path d='M8 14s1.5 2 4 2 4-2 4-2'/><line x1='9' y1='9' x2='9.01' y2='9'/><line x1='15' y1='9' x2='15.01' y2='9'/>",
  meh:      "<circle cx='12' cy='12' r='10'/><line x1='8' y1='15' x2='16' y2='15'/><line x1='9' y1='9' x2='9.01' y2='9'/><line x1='15' y1='9' x2='15.01' y2='9'/>",
  frown:    "<circle cx='12' cy='12' r='10'/><path d='M16 16s-1.5-2-4-2-4 2-4 2'/><line x1='9' y1='9' x2='9.01' y2='9'/><line x1='15' y1='9' x2='15.01' y2='9'/>",
  scale:    "<line x1='12' y1='3' x2='12' y2='21'/><path d='M3 6l9-3 9 3'/><path d='M6 12H3l3 6'/><path d='M18 12h3l-3 6'/>",
  bell:     "<path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'/><path d='M13.73 21a2 2 0 0 1-3.46 0'/>",
  shield:   "<path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/>",
  brain:    "<path d='M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66'/><path d='M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66'/>",
  rocket:   "<path d='M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z'/><path d='M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z'/><path d='M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0'/><path d='M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'/>",
  loader:   "<line x1='12' y1='2' x2='12' y2='6'/><line x1='12' y1='18' x2='12' y2='22'/><line x1='4.93' y1='4.93' x2='7.76' y2='7.76'/><line x1='16.24' y1='16.24' x2='19.07' y2='19.07'/><line x1='2' y1='12' x2='6' y2='12'/><line x1='18' y1='12' x2='22' y2='12'/>",
  timer:    "<circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>",
  ruler:    "<path d='M21.3 8.7l-8.6 8.6c-.4.4-1 .4-1.4 0l-5.6-5.6c-.4-.4-.4-1 0-1.4l8.6-8.6c.4-.4 1-.4 1.4 0l5.6 5.6c.4.4.4 1 0 1.4z'/><line x1='7.5' y1='10.5' x2='9' y2='12'/><line x1='10.5' y1='7.5' x2='12' y2='9'/><line x1='13.5' y1='4.5' x2='15' y2='6'/>",
  plus:     "<line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/>",
  x:        "<line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>",
  arrow_up: "<line x1='12' y1='19' x2='12' y2='5'/><polyline points='5 12 12 5 19 12'/>",
  globe:    "<circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/>",
  lock:     "<rect x='3' y='11' width='18' height='11' rx='2' ry='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/>",
  eye:      "<path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/>",
  question: "<circle cx='12' cy='12' r='10'/><path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'/><line x1='12' y1='17' x2='12.01' y2='17'/>",
};

// Export hjælpefunktion
export const Icon = ({ name, size = 20, color = '#0a0a0a' }) => {
  const path = PATHS[name];
  if (!path) return <Text style={{ fontSize: size * 0.8, color }}> </Text>;
  return ic(path, size, color);
};

// Convenience exports med fast størrelse
export const Ic = (name, size, color) => <Icon name={name} size={size} color={color} />;
