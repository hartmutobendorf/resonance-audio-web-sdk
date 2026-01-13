/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Test ComplexRoom object.
 */
describe('ComplexRoom', function() {
  // This test is async, override timeout threshold to 5 sec.
  this.timeout(5000);

  const sampleRate = 48000;
  const Geometry = ResonanceAudio.ComplexRoomGeometry;

  let context;
  let complexRoom;
  let bufferSource;

  beforeEach(function() {
    context = new OfflineAudioContext(4, 1024, sampleRate);
  });

  describe('Single zone operation', function() {
    it('Should create default room with single zone', function() {
      complexRoom = new ResonanceAudio.ComplexRoom(context, {});
      expect(complexRoom.getZones().length).to.equal(1);
      expect(complexRoom.getCurrentZone()).to.exist;
    });

    it('Should produce output with single zone', function(done) {
      complexRoom = new ResonanceAudio.ComplexRoom(context, {
        zones: [{
          id: 'main',
          walls: Geometry.createRectangularRoom(
            {width: 5, height: 3, depth: 4},
            {
              left: 'brick-bare', right: 'brick-bare',
              front: 'brick-bare', back: 'brick-bare',
              up: 'wood-ceiling', down: 'wood-panel',
            }
          ),
          volume: 60,
          connectedZones: [],
        }],
      });

      bufferSource = context.createBufferSource();
      bufferSource.buffer = context.createBuffer(1, 1, sampleRate);
      bufferSource.buffer.getChannelData(0)[0] = 1;

      bufferSource.connect(complexRoom.early.input);
      bufferSource.connect(complexRoom.late.input);
      complexRoom.output.connect(context.destination);
      bufferSource.start();

      context.startRendering().then(function(renderedBuffer) {
        let outputPower = 0;
        for (let i = 0; i < renderedBuffer.numberOfChannels; i++) {
          let buffer = renderedBuffer.getChannelData(i);
          for (let j = 0; j < buffer.length; j++) {
            outputPower += buffer[j] * buffer[j];
          }
        }
        expect(outputPower).to.be.above(0);
        done();
      });
    });
  });

  describe('Multi-zone operation', function() {
    it('Should create room with multiple zones', function() {
      let zone1 = {
        id: 'hall',
        walls: Geometry.createRectangularRoom(
          {width: 10, height: 5, depth: 20},
          {
            left: 'marble', right: 'marble',
            front: 'marble', back: 'marble',
            up: 'wood-ceiling', down: 'marble',
          }
        ),
        volume: 1000,
        connectedZones: ['chapel'],
      };

      let zone2 = {
        id: 'chapel',
        walls: Geometry.createRectangularRoom(
          {width: 8, height: 8, depth: 12},
          {
            left: 'brick-bare', right: 'brick-bare',
            front: 'brick-bare', back: 'brick-bare',
            up: 'wood-ceiling', down: 'marble',
          }
        ),
        volume: 768,
        connectedZones: ['hall'],
      };

      complexRoom = new ResonanceAudio.ComplexRoom(context, {
        zones: [zone1, zone2],
      });

      expect(complexRoom.getZones().length).to.equal(2);
      expect(complexRoom.getZones()[0].id).to.equal('hall');
      expect(complexRoom.getZones()[1].id).to.equal('chapel');
    });

    it('Should add zones dynamically', function() {
      complexRoom = new ResonanceAudio.ComplexRoom(context, {});
      expect(complexRoom.getZones().length).to.equal(1);

      let newZone = {
        id: 'annex',
        walls: Geometry.createRectangularRoom(
          {width: 3, height: 2.5, depth: 4},
          {
            left: 'concrete-block-coarse', right: 'concrete-block-coarse',
            front: 'concrete-block-coarse', back: 'concrete-block-coarse',
            up: 'concrete-block-coarse', down: 'concrete-block-coarse',
          }
        ),
        volume: 30,
        connectedZones: [],
      };

      complexRoom.addZone(newZone);
      expect(complexRoom.getZones().length).to.equal(2);
    });
  });

  describe('Portal management', function() {
    it('Should add portals between zones', function() {
      let zone1 = {
        id: 'room1',
        walls: Geometry.createRectangularRoom(
          {width: 5, height: 3, depth: 5},
          {
            left: 'brick-bare', right: 'brick-bare',
            front: 'brick-bare', back: 'brick-bare',
            up: 'wood-ceiling', down: 'wood-panel',
          }
        ),
        volume: 75,
        connectedZones: [],
      };

      let zone2 = {
        id: 'room2',
        walls: Geometry.createRectangularRoom(
          {width: 4, height: 3, depth: 4},
          {
            left: 'concrete-block-coarse', right: 'concrete-block-coarse',
            front: 'concrete-block-coarse', back: 'concrete-block-coarse',
            up: 'concrete-block-coarse', down: 'concrete-block-coarse',
          }
        ),
        volume: 48,
        connectedZones: [],
      };

      complexRoom = new ResonanceAudio.ComplexRoom(context, {
        zones: [zone1, zone2],
      });

      let portal = {
        fromZone: 'room1',
        toZone: 'room2',
        vertices: [
          [2.5, 0, 0], [2.5, 2, 0],
          [2.5, 2, 1.5], [2.5, 0, 1.5],
        ],
        area: 3, // 2m x 1.5m
        transmissionCoefficient: 0.8,
      };

      complexRoom.addPortal(portal);
      expect(complexRoom.getPortals().length).to.equal(1);
      expect(complexRoom.getZones()[0].connectedZones).to.include('room2');
      expect(complexRoom.getZones()[1].connectedZones).to.include('room1');
    });
  });

  describe('Listener positioning', function() {
    it('Should update listener position', function() {
      complexRoom = new ResonanceAudio.ComplexRoom(context, {});
      complexRoom.setListenerPosition(1, 0.5, -1);
      // Should not throw error
      expect(complexRoom).to.exist;
    });

    it('Should handle zone transitions', function() {
      let zone1 = {
        id: 'zone1',
        walls: Geometry.createRectangularRoom(
          {width: 10, height: 3, depth: 10},
          {
            left: 'brick-bare', right: 'brick-bare',
            front: 'brick-bare', back: 'brick-bare',
            up: 'wood-ceiling', down: 'wood-panel',
          }
        ),
        volume: 300,
        connectedZones: [],
      };

      complexRoom = new ResonanceAudio.ComplexRoom(context, {
        zones: [zone1],
        listenerPosition: [0, 0, 0],
      });

      expect(complexRoom.getCurrentZone().id).to.equal('zone1');

      // Move listener within zone
      complexRoom.setListenerPosition(2, 0, 2);
      expect(complexRoom.getCurrentZone().id).to.equal('zone1');
    });
  });

  describe('Zone properties', function() {
    it('Should update zone properties', function() {
      let zone = {
        id: 'modifiable',
        walls: Geometry.createRectangularRoom(
          {width: 5, height: 3, depth: 5},
          {
            left: 'brick-bare', right: 'brick-bare',
            front: 'brick-bare', back: 'brick-bare',
            up: 'wood-ceiling', down: 'wood-panel',
          }
        ),
        volume: 75,
        connectedZones: [],
      };

      complexRoom = new ResonanceAudio.ComplexRoom(context, {
        zones: [zone],
      });

      let newWalls = Geometry.createRectangularRoom(
        {width: 8, height: 4, depth: 8},
        {
          left: 'marble', right: 'marble',
          front: 'marble', back: 'marble',
          up: 'marble', down: 'marble',
        }
      );

      complexRoom.setZoneProperties('modifiable', newWalls);
      expect(complexRoom.getZones()[0].walls.length).to.equal(6);
    });
  });
});
