/**
 * Complex Room Architecture Example
 * Demonstrates the use of ComplexRoom for modeling churches and concert halls
 */

let audioContext;
let complexRoom;
let audioElement;
let audioSource;
let soundSource;
let audioReady = false;

const Geometry = ResonanceAudio.ComplexRoomGeometry;

// Architecture definitions
const architectures = {
  church: function() {
    // Main nave
    let nave = {
      id: 'nave',
      walls: Geometry.createRectangularRoom(
        {width: 15, height: 12, depth: 30},
        {
          left: 'brick-bare', right: 'brick-bare',
          front: 'brick-bare', back: 'brick-bare',
          up: 'wood-ceiling', down: 'marble',
        }
      ),
      volume: 5400,
      connectedZones: ['chapel'],
    };

    // Side chapel
    let chapel = {
      id: 'chapel',
      walls: Geometry.createRectangularRoom(
        {width: 8, height: 8, depth: 10},
        {
          left: 'brick-bare', right: 'brick-bare',
          front: 'brick-bare', back: 'brick-bare',
          up: 'wood-ceiling', down: 'marble',
        }
      ),
      volume: 640,
      connectedZones: ['nave'],
    };

    // Portal between nave and chapel
    let portal = {
      fromZone: 'nave',
      toZone: 'chapel',
      vertices: [
        [7.5, 0, 5], [7.5, 6, 5],
        [7.5, 6, 8], [7.5, 0, 8],
      ],
      area: 18,
      transmissionCoefficient: 0.7,
    };

    return {zones: [nave, chapel], portals: [portal]};
  },

  concerthall: function() {
    // Stage area
    let stage = {
      id: 'stage',
      walls: Geometry.createRectangularRoom(
        {width: 20, height: 10, depth: 15},
        {
          left: 'wood-panel', right: 'wood-panel',
          front: 'wood-panel', back: 'curtain-heavy',
          up: 'wood-ceiling', down: 'wood-panel',
        }
      ),
      volume: 3000,
      connectedZones: ['audience'],
    };

    // Main audience area
    let audience = {
      id: 'audience',
      walls: Geometry.createRectangularRoom(
        {width: 25, height: 8, depth: 30},
        {
          left: 'plaster-smooth', right: 'plaster-smooth',
          front: 'curtain-heavy', back: 'plaster-smooth',
          up: 'acoustic-ceiling-tiles', down: 'wood-panel',
        }
      ),
      volume: 6000,
      connectedZones: ['stage', 'balcony'],
    };

    // Balcony
    let balcony = {
      id: 'balcony',
      walls: Geometry.createRectangularRoom(
        {width: 25, height: 4, depth: 10},
        {
          left: 'plaster-smooth', right: 'plaster-smooth',
          front: 'plaster-smooth', back: 'plaster-smooth',
          up: 'acoustic-ceiling-tiles', down: 'wood-panel',
        }
      ),
      volume: 1000,
      connectedZones: ['audience'],
    };

    let portal1 = {
      fromZone: 'stage',
      toZone: 'audience',
      vertices: [
        [0, 0, 7.5], [20, 0, 7.5],
        [20, 8, 7.5], [0, 8, 7.5],
      ],
      area: 160,
      transmissionCoefficient: 0.95,
    };

    let portal2 = {
      fromZone: 'audience',
      toZone: 'balcony',
      vertices: [
        [0, 6, -15], [25, 6, -15],
        [25, 8, -15], [0, 8, -15],
      ],
      area: 50,
      transmissionCoefficient: 0.8,
    };

    return {zones: [stage, audience, balcony], portals: [portal1, portal2]};
  },

  cathedral: function() {
    // Main cathedral space
    let main = {
      id: 'main',
      walls: Geometry.createRectangularRoom(
        {width: 20, height: 18, depth: 40},
        {
          left: 'marble', right: 'marble',
          front: 'marble', back: 'marble',
          up: 'marble', down: 'marble',
        }
      ),
      volume: 14400,
      connectedZones: ['transept', 'apse'],
    };

    // Transept (cross section)
    let transept = {
      id: 'transept',
      walls: Geometry.createRectangularRoom(
        {width: 30, height: 15, depth: 12},
        {
          left: 'marble', right: 'marble',
          front: 'marble', back: 'marble',
          up: 'marble', down: 'marble',
        }
      ),
      volume: 5400,
      connectedZones: ['main'],
    };

    // Apse (altar area)
    let apse = {
      id: 'apse',
      walls: Geometry.createRectangularRoom(
        {width: 15, height: 20, depth: 12},
        {
          left: 'marble', right: 'marble',
          front: 'marble', back: 'marble',
          up: 'marble', down: 'marble',
        }
      ),
      volume: 3600,
      connectedZones: ['main'],
    };

    let portal1 = {
      fromZone: 'main',
      toZone: 'transept',
      vertices: [
        [0, 0, 5], [15, 0, 5],
        [15, 12, 5], [0, 12, 5],
      ],
      area: 180,
      transmissionCoefficient: 0.85,
    };

    let portal2 = {
      fromZone: 'main',
      toZone: 'apse',
      vertices: [
        [0, 0, 20], [15, 0, 20],
        [15, 15, 20], [0, 15, 20],
      ],
      area: 225,
      transmissionCoefficient: 0.9,
    };

    return {zones: [main, transept, apse], portals: [portal1, portal2]};
  },
};

/**
 * Initialize audio context and complex room
 */
function initAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext);

  // Create audio element
  audioElement = document.createElement('audio');
  audioElement.src = 'resources/speech-sample.wav';
  audioElement.crossOrigin = 'anonymous';
  audioElement.load();
  audioElement.loop = true;

  audioSource = audioContext.createMediaElementSource(audioElement);

  // Load initial architecture
  loadArchitecture('church');

  audioReady = true;
}

/**
 * Load a specific architecture
 * @param {string} architectureName Name of the architecture to load.
 */
function loadArchitecture(architectureName) {
  if (!audioContext) return;

  let architecture = architectures[architectureName]();

  // Create complex room
  if (complexRoom) {
    // Disconnect old room
    complexRoom.output.disconnect();
  }

  complexRoom = new ResonanceAudio.ComplexRoom(audioContext, {
    zones: architecture.zones,
    portals: architecture.portals,
    listenerPosition: [
      parseFloat(document.getElementById('listenerX').value),
      parseFloat(document.getElementById('listenerY').value),
      parseFloat(document.getElementById('listenerZ').value),
    ],
  });

  // Create source if needed
  if (!soundSource && audioSource) {
    soundSource = complexRoom.early.input;
    audioSource.connect(soundSource);
    audioSource.connect(complexRoom.late.input);
  }

  complexRoom.output.connect(audioContext.destination);

  // Update UI
  updateRoomInfo();
  updatePositions();
}

/**
 * Update room information display
 */
function updateRoomInfo() {
  if (!complexRoom) return;

  document.getElementById('totalZones').textContent =
    complexRoom.getZones().length;
  document.getElementById('totalPortals').textContent =
    complexRoom.getPortals().length;

  let currentZone = complexRoom.getCurrentZone();
  document.getElementById('currentZone').textContent =
    currentZone ? currentZone.id : 'N/A';
}

/**
 * Update source and listener positions
 */
function updatePositions() {
  if (!audioReady || !complexRoom) return;

  // Update listener position
  let listenerX = parseFloat(document.getElementById('listenerX').value);
  let listenerY = parseFloat(document.getElementById('listenerY').value);
  let listenerZ = parseFloat(document.getElementById('listenerZ').value);

  complexRoom.setListenerPosition(listenerX, listenerY, listenerZ);

  // Update display values
  document.getElementById('listenerXValue').textContent = listenerX;
  document.getElementById('listenerYValue').textContent = listenerY;
  document.getElementById('listenerZValue').textContent = listenerZ;

  document.getElementById('sourceXValue').textContent =
      document.getElementById('sourceX').value;
  document.getElementById('sourceYValue').textContent =
      document.getElementById('sourceY').value;
  document.getElementById('sourceZValue').textContent =
      document.getElementById('sourceZ').value;

  // Update current zone display
  let currentZone = complexRoom.getCurrentZone();
  document.getElementById('currentZone').textContent =
    currentZone ? currentZone.id : 'N/A';
}

/**
 * Page load handler
 */
window.addEventListener('load', function() {
  // Play button
  let playButton = document.getElementById('playButton');
  playButton.addEventListener('click', function(event) {
    if (!audioReady) {
      initAudio();
    }

    if (event.target.textContent === 'Play') {
      event.target.textContent = 'Pause';
      audioElement.play();
    } else {
      event.target.textContent = 'Play';
      audioElement.pause();
    }
  });

  // Architecture selector
  let archSelector = document.getElementById('architectureSelect');
  archSelector.addEventListener('change', function(event) {
    loadArchitecture(event.target.value);
  });

  // Position controls
  ['sourceX', 'sourceY', 'sourceZ', 'listenerX', 'listenerY',
   'listenerZ'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', updatePositions);
  });
});
