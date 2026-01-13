# Complex Room Architecture Feature

## Overview

The Resonance Audio Web SDK has been extended with support for complex room architectures, enabling realistic acoustic modeling of sophisticated spaces such as churches, concert halls, and cathedrals. This feature goes beyond the original simple rectangular room model to support:

- **Multiple acoustic zones** with different properties
- **Non-rectangular geometries** using polygon-based wall definitions
- **Zone connectivity** via portals
- **Dynamic zone transitions** based on listener position

## Key Components

### 1. ComplexRoomGeometry

A utility module providing geometric calculations for complex room architectures:

- **Wall representation**: Polygonal surfaces with vertices and materials
- **Zone representation**: Collections of walls forming acoustic spaces
- **Portal representation**: Openings connecting zones
- **Geometric utilities**: Normal calculation, area computation, volume calculation, distance calculations

### 2. ComplexRoom

The main room model class that extends the original Room functionality:

- **Multi-zone management**: Add and manage multiple acoustic zones
- **Dynamic acoustics**: Automatically updates reflections based on current zone
- **Portal management**: Define connections between zones
- **Backward compatibility**: Works with existing ResonanceAudio API

## Usage Examples

### Creating a Simple Church

```javascript
const Geometry = ResonanceAudio.ComplexRoomGeometry;

// Define the main nave
const nave = {
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

// Define a side chapel
const chapel = {
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

// Define portal between zones
const portal = {
  fromZone: 'nave',
  toZone: 'chapel',
  vertices: [
    [7.5, 0, 5], [7.5, 6, 5],
    [7.5, 6, 8], [7.5, 0, 8],
  ],
  area: 18,
  transmissionCoefficient: 0.7,
};

// Create complex room
const complexRoom = new ResonanceAudio.ComplexRoom(audioContext, {
  zones: [nave, chapel],
  portals: [portal],
  listenerPosition: [0, 0, 0],
});

// Connect audio source
audioSource.connect(complexRoom.early.input);
audioSource.connect(complexRoom.late.input);
complexRoom.output.connect(audioContext.destination);

// Update listener position
complexRoom.setListenerPosition(x, y, z);
```

### Creating Custom Polygonal Walls

```javascript
// Define a custom polygonal wall (e.g., slanted ceiling)
const customWall = {
  name: 'slanted-ceiling',
  material: 'wood-ceiling',
  vertices: [
    [-5, 3, -10],  // Bottom left front
    [5, 3, -10],   // Bottom right front
    [5, 6, 10],    // Top right back
    [-5, 6, 10],   // Top left back
  ],
};

// Add to zone walls
const customZone = {
  id: 'custom',
  walls: [customWall, /* ... more walls ... */],
  volume: 0,  // Will be calculated automatically
  connectedZones: [],
};
```

### Dynamically Adding Zones

```javascript
// Add a new zone at runtime
const newZone = {
  id: 'balcony',
  walls: Geometry.createRectangularRoom(
    {width: 20, height: 4, depth: 8},
    {
      left: 'plaster-smooth', right: 'plaster-smooth',
      front: 'plaster-smooth', back: 'plaster-smooth',
      up: 'acoustic-ceiling-tiles', down: 'wood-panel',
    }
  ),
  volume: 640,
  connectedZones: [],
};

complexRoom.addZone(newZone);
```

### Adding Portals Between Zones

```javascript
const doorway = {
  fromZone: 'hallway',
  toZone: 'room',
  vertices: [
    [0, 0, 5], [2, 0, 5],
    [2, 2.5, 5], [0, 2.5, 5],
  ],
  area: 5,  // 2m x 2.5m
  transmissionCoefficient: 0.9,
};

complexRoom.addPortal(doorway);
```

## API Reference

### ComplexRoomGeometry

#### Static Methods

- `calculateNormal(vertices)` - Calculate normal vector of a planar surface
- `calculateArea(vertices)` - Calculate area of a polygonal surface
- `calculateCentroid(vertices)` - Calculate centroid of a polygon
- `pointToPlaneDistance(point, vertices)` - Calculate distance from point to plane
- `isPointInPolygon(point, vertices)` - Check if point is inside polygon
- `calculateVolume(walls)` - Calculate volume of convex polyhedron
- `findClosestWall(point, walls)` - Find closest wall to a point
- `createRectangularRoom(dimensions, materials)` - Create rectangular room walls

### ComplexRoom

#### Constructor

```javascript
new ComplexRoom(context, options)
```

**Options:**
- `listenerPosition` - Initial listener position [x, y, z]
- `zones` - Array of zone objects
- `portals` - Array of portal objects
- `speedOfSound` - Speed of sound in m/s (default: 343)

#### Methods

- `setListenerPosition(x, y, z)` - Update listener position
- `addZone(zone)` - Add a new zone
- `addPortal(portal)` - Add a new portal
- `getCurrentZone()` - Get the zone containing the listener
- `getZones()` - Get all zones
- `getPortals()` - Get all portals
- `setZoneProperties(zoneId, walls)` - Update a zone's walls

#### Properties

- `output` - Audio output node (connect to destination)
- `early` - Early reflections submodule
- `late` - Late reflections submodule
- `speedOfSound` - Current speed of sound

## Architecture Examples

### Concert Hall

A concert hall with stage, main audience area, and balcony:

```javascript
const concertHall = {
  stage: {width: 20, height: 10, depth: 15, material: 'wood-panel'},
  audience: {width: 25, height: 8, depth: 30, material: 'plaster-smooth'},
  balcony: {width: 25, height: 4, depth: 10, material: 'acoustic-ceiling-tiles'},
};
```

### Cathedral

A cathedral with main space, transept, and apse:

```javascript
const cathedral = {
  main: {width: 20, height: 18, depth: 40, material: 'marble'},
  transept: {width: 30, height: 15, depth: 12, material: 'marble'},
  apse: {width: 15, height: 20, depth: 12, material: 'marble'},
};
```

## Performance Considerations

- **Zone complexity**: More zones increase computational cost
- **Portal count**: Each portal adds connectivity calculations
- **Polygon complexity**: Keep wall polygon vertex counts reasonable
- **Update frequency**: Listener position updates trigger acoustic recalculations

## Acoustic Modeling Details

### Early Reflections

- Uses ray-tracing for primary reflections
- Calculates delays based on wall distances
- Applies material-based attenuation

### Late Reflections (Reverb)

- Uses Eyring equation for reverb time calculation
- Accounts for total surface area and absorption
- Frequency-dependent reverb across 9 bands

### Zone Transitions

- Smooth attenuation when approaching zone boundaries
- Automatic zone detection based on listener position
- Future: Implement smooth acoustic crossfading

## Future Enhancements

Potential improvements for the complex room architecture:

1. **Advanced zone transitions**: Smooth acoustic crossfading between zones
2. **Sound propagation through portals**: Model sound transmission between zones
3. **Curved surfaces**: Support for non-planar walls
4. **Diffraction modeling**: Sound bending around edges and through openings
5. **Occlusion**: Model acoustic shadowing by walls
6. **Point-in-polyhedron tests**: More accurate zone detection
7. **Performance optimizations**: Spatial partitioning, caching

## Testing

The implementation includes comprehensive unit tests:

- `test/test-complex-room-geometry.js` - Geometry utility tests
- `test/test-complex-room.js` - ComplexRoom functionality tests

Run tests with:
```bash
npm test
```

## Example Application

See `examples/complex-room.html` for a complete interactive example demonstrating:
- Multiple architecture presets (church, concert hall, cathedral)
- Dynamic source and listener positioning
- Real-time zone information display
- Audio playback with spatial acoustics

## Backward Compatibility

The ComplexRoom feature is fully backward compatible:

- Original Room class remains unchanged
- ComplexRoomGeometry provides helper for creating rectangular rooms
- Can create simple rectangular room as single-zone ComplexRoom
- All existing examples and tests continue to work

## License

Copyright 2017 Google Inc. All Rights Reserved.
Licensed under the Apache License, Version 2.0.
