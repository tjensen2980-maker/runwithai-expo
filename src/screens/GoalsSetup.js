// src/screens/GoalsSetup.js
// Re-export wrapper: den gamle GoalsSetup er erstattet af den nye
// flettede Goals-skaerm. Vi videresender props saa eksisterende
// route ('goals' i App.js) ogsaa viser den nye Goals-komponent
// med daglige maal, ugentlige maal og ernaeringsplan.

import React from 'react';
import Goals from './Goals';

export default function GoalsSetup(props) {
    return <Goals {...props} />;
}
