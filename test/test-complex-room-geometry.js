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
 * Test ComplexRoomGeometry utilities.
 */
describe('ComplexRoomGeometry', function() {
  const Geometry = ResonanceAudio.ComplexRoomGeometry;

  describe('#calculateNormal', function() {
    it('Should calculate normal for horizontal plane', function() {
      let vertices = [[0, 0, 0], [1, 0, 0], [1, 0, 1]];
      let normal = Geometry.calculateNormal(vertices);
      expect(Math.abs(normal[1])).to.be.closeTo(1, 0.01);
    });

    it('Should calculate normal for vertical plane', function() {
      let vertices = [[0, 0, 0], [0, 1, 0], [1, 1, 0]];
      let normal = Geometry.calculateNormal(vertices);
      expect(Math.abs(normal[2])).to.be.closeTo(1, 0.01);
    });
  });

  describe('#calculateArea', function() {
    it('Should calculate area of square', function() {
      let vertices = [
        [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1],
      ];
      let area = Geometry.calculateArea(vertices);
      expect(area).to.be.closeTo(1, 0.01);
    });

    it('Should calculate area of rectangle', function() {
      let vertices = [
        [0, 0, 0], [2, 0, 0], [2, 0, 3], [0, 0, 3],
      ];
      let area = Geometry.calculateArea(vertices);
      expect(area).to.be.closeTo(6, 0.01);
    });

    it('Should return 0 for degenerate polygon', function() {
      let vertices = [[0, 0, 0], [1, 0, 0]];
      let area = Geometry.calculateArea(vertices);
      expect(area).to.equal(0);
    });
  });

  describe('#calculateCentroid', function() {
    it('Should calculate centroid of square', function() {
      let vertices = [
        [0, 0, 0], [2, 0, 0], [2, 0, 2], [0, 0, 2],
      ];
      let centroid = Geometry.calculateCentroid(vertices);
      expect(centroid[0]).to.be.closeTo(1, 0.01);
      expect(centroid[1]).to.be.closeTo(0, 0.01);
      expect(centroid[2]).to.be.closeTo(1, 0.01);
    });

    it('Should return origin for empty vertices', function() {
      let vertices = [];
      let centroid = Geometry.calculateCentroid(vertices);
      expect(centroid[0]).to.equal(0);
      expect(centroid[1]).to.equal(0);
      expect(centroid[2]).to.equal(0);
    });
  });

  describe('#pointToPlaneDistance', function() {
    it('Should calculate distance to horizontal plane', function() {
      let vertices = [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]];
      let point = [0.5, 2, 0.5];
      let distance = Geometry.pointToPlaneDistance(point, vertices);
      expect(distance).to.be.closeTo(2, 0.01);
    });

    it('Should calculate distance to vertical plane', function() {
      let vertices = [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]];
      let point = [3, 0.5, 0.5];
      let distance = Geometry.pointToPlaneDistance(point, vertices);
      expect(distance).to.be.closeTo(3, 0.01);
    });
  });

  describe('#calculateVolume', function() {
    it('Should calculate volume of cube', function() {
      let walls = Geometry.createRectangularRoom(
        {width: 2, height: 2, depth: 2},
        {
          left: 'transparent', right: 'transparent',
          front: 'transparent', back: 'transparent',
          up: 'transparent', down: 'transparent',
        }
      );
      let volume = Geometry.calculateVolume(walls);
      expect(volume).to.be.closeTo(8, 0.5);
    });
  });

  describe('#createRectangularRoom', function() {
    it('Should create 6 walls for rectangular room', function() {
      let dimensions = {width: 4, height: 3, depth: 5};
      let materials = {
        left: 'brick-bare', right: 'brick-bare',
        front: 'concrete-block-coarse', back: 'concrete-block-coarse',
        up: 'wood-ceiling', down: 'wood-panel',
      };
      let walls = Geometry.createRectangularRoom(dimensions, materials);
      expect(walls.length).to.equal(6);
      expect(walls[0].name).to.equal('left');
      expect(walls[0].material).to.equal('brick-bare');
      expect(walls[0].vertices.length).to.equal(4);
    });
  });

  describe('#findClosestWall', function() {
    it('Should find closest wall to point', function() {
      let walls = Geometry.createRectangularRoom(
        {width: 10, height: 10, depth: 10},
        {
          left: 'transparent', right: 'transparent',
          front: 'transparent', back: 'transparent',
          up: 'transparent', down: 'transparent',
        }
      );
      let point = [4, 0, 0]; // Closer to right wall
      let result = Geometry.findClosestWall(point, walls);
      expect(result.wallIndex).to.equal(1); // right wall
      expect(result.distance).to.be.below(2);
    });
  });
});
