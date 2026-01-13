# Complex Room Architecture - Quick Start Guide

This guide provides a quick introduction to using the new Complex Room Architecture features in Resonance Audio Web SDK.

## What's New?

The SDK now supports modeling complex architectural spaces like churches, concert halls, and cathedrals with:

✅ **Multiple acoustic zones** - Model different spaces with unique acoustic properties  
✅ **Polygonal walls** - Beyond simple rectangular rooms  
✅ **Zone connectivity** - Connect spaces via portals/doorways  
✅ **Dynamic acoustics** - Automatic updates as listener moves between zones  

## Basic Usage

### 1. Import the Module

```javascript
// After loading resonance-audio.js
const ComplexRoom = ResonanceAudio.ComplexRoom;
const Geometry = ResonanceAudio.ComplexRoomGeometry;
```

### 2. Define Your Architecture

```javascript
// Example: Simple church with nave and chapel
const nave = {
  id: 'nave',
  walls: Geometry.createRectangularRoom(
    {width: 15, height: 12, depth: 30},
    {
      left: 'brick-bare',
      right: 'brick-bare',
      front: 'brick-bare',
      back: 'brick-bare',
      up: 'wood-ceiling',
      down: 'marble',
    }
  ),
  connectedZones: ['chapel'],
};

const chapel = {
  id: 'chapel',
  walls: Geometry.createRectangularRoom(
    {width: 8, height: 8, depth: 10},
    {
      left: 'brick-bare',
      right: 'brick-bare',
      front: 'brick-bare',
      back: 'brick-bare',
      up: 'wood-ceiling',
      down: 'marble',
    }
  ),
  connectedZones: ['nave'],
};
```

### 3. Create the Complex Room

```javascript
const audioContext = new AudioContext();

const complexRoom = new ComplexRoom(audioContext, {
  zones: [nave, chapel],
  listenerPosition: [0, 0, 0],
});
```

### 4. Connect Audio

```javascript
// Connect your audio source
audioSource.connect(complexRoom.early.input);
audioSource.connect(complexRoom.late.input);

// Connect to output
complexRoom.output.connect(audioContext.destination);
```

### 5. Update Listener Position

```javascript
// As the listener moves through the space
complexRoom.setListenerPosition(x, y, z);

// Check which zone the listener is in
const currentZone = complexRoom.getCurrentZone();
console.log('Current zone:', currentZone.id);
```

## Pre-built Architecture Examples

### Church
```javascript
examples/complex-room.html?architecture=church
```

### Concert Hall
```javascript
examples/complex-room.html?architecture=concerthall
```

### Cathedral
```javascript
examples/complex-room.html?architecture=cathedral
```

## Advanced: Custom Polygonal Walls

```javascript
const customWall = {
  name: 'slanted-ceiling',
  material: 'wood-ceiling',
  vertices: [
    [-5, 3, -10],  // Bottom left
    [5, 3, -10],   // Bottom right
    [5, 6, 10],    // Top right
    [-5, 6, 10],   // Top left
  ],
};
```

## Available Materials

Use these material names for realistic acoustic properties:

- `transparent` - Open space
- `brick-bare` - Exposed brick
- `marble` - Marble surfaces
- `wood-ceiling` - Wood ceiling
- `wood-panel` - Wood paneling
- `acoustic-ceiling-tiles` - Acoustic tiles
- `concrete-block-coarse` - Rough concrete
- `curtain-heavy` - Heavy curtains
- `plaster-smooth` - Smooth plaster
- `glass-thin` / `glass-thick` - Glass surfaces

See `src/utils.js` for the complete list of 23 materials.

## Interactive Example

Open `examples/complex-room.html` in your browser to try the interactive demo:

- Switch between different architecture presets
- Move the audio source and listener in 3D space
- See real-time zone information
- Hear the acoustic differences

## API Documentation

For complete API documentation, see [COMPLEX_ROOM_DOCUMENTATION.md](COMPLEX_ROOM_DOCUMENTATION.md)

## Coordinate System

- **X-axis**: Left (-) to Right (+)
- **Y-axis**: Down (-) to Up (+)  
- **Z-axis**: Front (-) to Back (+)
- **Origin**: Center of the room

## Tips for Best Results

1. **Keep zones convex** - Works best with convex polyhedrons
2. **Reasonable vertex counts** - 4-8 vertices per wall is typical
3. **Accurate volumes** - Let the system calculate volumes automatically
4. **Portal placement** - Position portals where spaces actually connect
5. **Material selection** - Choose materials that match your real-world space

## Performance Notes

- More zones = more computation
- Simple geometries perform better
- Zone transitions are efficient
- Early/late reflections are calculated per-zone

## Troubleshooting

**No sound output?**
- Check that audio source is connected to both `early.input` and `late.input`
- Verify `output` is connected to destination

**Wrong acoustics?**
- Verify listener position is correct
- Check material selections
- Ensure zone volumes are reasonable

**Zone detection issues?**
- Verify wall vertices form closed volumes
- Check coordinate system orientation
- Ensure listener position uses correct units (meters)

## Next Steps

1. Try the example: `examples/complex-room.html`
2. Read full docs: `COMPLEX_ROOM_DOCUMENTATION.md`
3. Explore test files for more examples
4. Build your own complex architecture!

## Support

For issues, questions, or contributions, visit:
https://github.com/hartmutobendorf/resonance-audio-web-sdk
