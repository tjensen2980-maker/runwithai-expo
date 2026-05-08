import React from 'react';
import RunTracker from './RunTracker';

// Cykel-tracker er en wrapper omkring RunTracker med activityType='bike'.
// RunTracker indeholder al GPS-, kort-, baggrundstracking-logik som vi genbruger.
// Cykel-specifikke tilpasninger (MET-beregning baseret paa hastighed, KM/T display,
// /activities endpoint med bike-felter) sker inde i RunTracker via mode-checks.
export default function CycleTracker(props) {
  return <RunTracker {...props} activityType="bike" />;
}
