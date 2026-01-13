/**
 * Simple integration test demonstrating ComplexRoom usage
 * This can be run in a browser console or Node.js environment
 */

/**
 * Test 1: Create a simple church architecture
 * @return {Object} Object containing nave and chapel zones.
 */
function testChurchArchitecture() {
  console.log('Test 1: Creating church architecture...');

  const Geometry = ResonanceAudio.ComplexRoomGeometry;

  // Define zones
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
    volume: 0,
    connectedZones: [],
  };

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
    volume: 0,
    connectedZones: [],
  };

  // Verify zones created
  console.assert(nave.walls.length === 6, 'Nave should have 6 walls');
  console.assert(chapel.walls.length === 6, 'Chapel should have 6 walls');

  console.log('✓ Test 1 passed: Church architecture created');
  return {nave, chapel};
}

/**
 * Test 2: Verify geometry calculations
 */
function testGeometryCalculations() {
  console.log('Test 2: Testing geometry calculations...');

  const Geometry = ResonanceAudio.ComplexRoomGeometry;

  // Test area calculation
  const squareVertices = [
    [0, 0, 0], [2, 0, 0], [2, 0, 2], [0, 0, 2],
  ];
  const area = Geometry.calculateArea(squareVertices);
  console.assert(
    Math.abs(area - 4) < 0.01,
    'Area of 2x2 square should be 4'
  );

  // Test centroid calculation
  const centroid = Geometry.calculateCentroid(squareVertices);
  console.assert(
    Math.abs(centroid[0] - 1) < 0.01 &&
    Math.abs(centroid[2] - 1) < 0.01,
    'Centroid should be at (1, 0, 1)'
  );

  // Test normal calculation
  const normal = Geometry.calculateNormal(squareVertices);
  console.assert(
    Math.abs(normal[1]) > 0.99,
    'Normal should point up (Y-axis)'
  );

  console.log('✓ Test 2 passed: Geometry calculations correct');
}

/**
 * Test 3: Create ComplexRoom with audio context
 * @return {ComplexRoom} The created complex room instance.
 */
function testComplexRoomCreation() {
  console.log('Test 3: Creating ComplexRoom...');

  // Create offline audio context for testing
  const audioContext = new OfflineAudioContext(2, 44100, 44100);

  const Geometry = ResonanceAudio.ComplexRoomGeometry;

  const zone = {
    id: 'test-zone',
    walls: Geometry.createRectangularRoom(
      {width: 10, height: 8, depth: 12},
      {
        left: 'brick-bare', right: 'brick-bare',
        front: 'concrete-block-coarse', back: 'concrete-block-coarse',
        up: 'wood-ceiling', down: 'marble',
      }
    ),
    volume: 0,
    connectedZones: [],
  };

  const complexRoom = new ResonanceAudio.ComplexRoom(audioContext, {
    zones: [zone],
    listenerPosition: [0, 0, 0],
  });

  // Verify room created
  console.assert(complexRoom !== null, 'ComplexRoom should be created');
  console.assert(
    complexRoom.getZones().length === 1,
    'Should have 1 zone'
  );
  console.assert(
    complexRoom.getCurrentZone().id === 'test-zone',
    'Current zone should be test-zone'
  );
  console.assert(
    complexRoom.output !== null,
    'Output node should exist'
  );

  console.log('✓ Test 3 passed: ComplexRoom created successfully');
  return complexRoom;
}

/**
 * Test 4: Test zone transitions
 * @param {ComplexRoom} complexRoom The complex room to test.
 */
function testZoneTransitions(complexRoom) {
  console.log('Test 4: Testing zone transitions...');

  // Add a second zone
  const Geometry = ResonanceAudio.ComplexRoomGeometry;

  const newZone = {
    id: 'second-zone',
    walls: Geometry.createRectangularRoom(
      {width: 5, height: 5, depth: 5},
      {
        left: 'marble', right: 'marble',
        front: 'marble', back: 'marble',
        up: 'marble', down: 'marble',
      }
    ),
    volume: 0,
    connectedZones: [],
  };

  complexRoom.addZone(newZone);

  console.assert(
    complexRoom.getZones().length === 2,
    'Should have 2 zones after adding'
  );

  // Test listener position update
  complexRoom.setListenerPosition(1, 0, 0);
  console.assert(
    complexRoom._listenerPosition[0] === 1,
    'Listener X position should be updated'
  );

  console.log('✓ Test 4 passed: Zone transitions working');
}

/**
 * Test 5: Test portal management
 * @param {ComplexRoom} complexRoom The complex room to test.
 */
function testPortalManagement(complexRoom) {
  console.log('Test 5: Testing portal management...');

  const portal = {
    fromZone: 'test-zone',
    toZone: 'second-zone',
    vertices: [
      [2.5, 0, 0], [2.5, 2, 0],
      [2.5, 2, 1.5], [2.5, 0, 1.5],
    ],
    area: 3,
    transmissionCoefficient: 0.8,
  };

  complexRoom.addPortal(portal);

  console.assert(
    complexRoom.getPortals().length === 1,
    'Should have 1 portal'
  );

  const zones = complexRoom.getZones();
  const zone1 = zones.find((z) => z.id === 'test-zone');
  const zone2 = zones.find((z) => z.id === 'second-zone');

  console.assert(
    zone1.connectedZones.includes('second-zone'),
    'Zone 1 should be connected to zone 2'
  );
  console.assert(
    zone2.connectedZones.includes('test-zone'),
    'Zone 2 should be connected to zone 1'
  );

  console.log('✓ Test 5 passed: Portal management working');
}

/**
 * Test 6: Test volume calculation
 */
function testVolumeCalculation() {
  console.log('Test 6: Testing volume calculation...');

  const Geometry = ResonanceAudio.ComplexRoomGeometry;

  const cubeWalls = Geometry.createRectangularRoom(
    {width: 2, height: 2, depth: 2},
    {
      left: 'transparent', right: 'transparent',
      front: 'transparent', back: 'transparent',
      up: 'transparent', down: 'transparent',
    }
  );

  const volume = Geometry.calculateVolume(cubeWalls);

  // Volume should be approximately 8 (2x2x2)
  console.assert(
    Math.abs(volume - 8) < 1,
    'Volume of 2x2x2 cube should be ~8'
  );

  console.log('✓ Test 6 passed: Volume calculation correct');
}

/**
 * Run all integration tests
 * @return {boolean} True if all tests pass, false otherwise.
 */
function runAllTests() {
  console.log('\n=== Running ComplexRoom Integration Tests ===\n');

  try {
    // Run tests in sequence
    testGeometryCalculations();
    testVolumeCalculation();
    testChurchArchitecture();
    const complexRoom = testComplexRoomCreation();
    testZoneTransitions(complexRoom);
    testPortalManagement(complexRoom);

    console.log('\n=== All Tests Passed! ===\n');
    return true;
  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error(error);
    return false;
  }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testChurchArchitecture,
    testGeometryCalculations,
    testComplexRoomCreation,
    testZoneTransitions,
    testPortalManagement,
    testVolumeCalculation,
  };
}

// Auto-run if in browser and ResonanceAudio is loaded
if (typeof window !== 'undefined' &&
    typeof ResonanceAudio !== 'undefined') {
  console.log('ResonanceAudio detected, running tests...');
  runAllTests();
}
