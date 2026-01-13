/**
 * @license
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
 * @file Geometry utilities for complex room architectures.
 * @author GitHub Copilot Extension
 */

'use strict';

const Utils = require('./utils.js');

/**
 * @class ComplexRoomGeometry
 * @description Utilities for managing complex 3D room geometries beyond simple
 * rectangular rooms. Supports polygonal walls, multiple zones, and portals.
 */
function ComplexRoomGeometry() {}

/**
 * Represents a polygonal wall surface with acoustic properties.
 * @typedef {Object} ComplexRoomGeometry~Wall
 * @property {Array<Array<Number>>} vertices Array of 3D vertices [x, y, z].
 * @property {String} material Acoustic material name.
 * @property {String} name Optional wall identifier.
 */

/**
 * Represents an acoustic zone within a complex room.
 * @typedef {Object} ComplexRoomGeometry~Zone
 * @property {String} id Zone identifier.
 * @property {Array<ComplexRoomGeometry~Wall>} walls Array of walls
 * defining the zone.
 * @property {Number} volume Zone volume in cubic meters.
 * @property {Array<String>} connectedZones IDs of connected zones.
 */

/**
 * Represents a portal connecting two zones.
 * @typedef {Object} ComplexRoomGeometry~Portal
 * @property {String} fromZone Source zone ID.
 * @property {String} toZone Destination zone ID.
 * @property {Array<Array<Number>>} vertices Portal opening vertices.
 * @property {Number} area Portal area in square meters.
 * @property {Number} transmissionCoefficient Audio transmission
 * coefficient (0-1).
 */

/**
 * Calculate the normal vector of a planar surface defined by vertices.
 * @param {Array<Array<Number>>} vertices Array of at least 3 vertices.
 * @return {Array<Number>} Normal vector [x, y, z].
 */
ComplexRoomGeometry.calculateNormal = function(vertices) {
  if (vertices.length < 3) {
    return [0, 1, 0]; // Default up vector
  }

  // Use first three vertices to calculate normal
  let v1 = [
    vertices[1][0] - vertices[0][0],
    vertices[1][1] - vertices[0][1],
    vertices[1][2] - vertices[0][2],
  ];
  let v2 = [
    vertices[2][0] - vertices[0][0],
    vertices[2][1] - vertices[0][1],
    vertices[2][2] - vertices[0][2],
  ];

  // Cross product
  let normal = Utils.crossProduct(v1, v2);
  return Utils.normalizeVector(normal);
};

/**
 * Calculate the area of a polygonal surface.
 * @param {Array<Array<Number>>} vertices Array of vertices.
 * @return {Number} Area in square meters.
 */
ComplexRoomGeometry.calculateArea = function(vertices) {
  if (vertices.length < 3) {
    return 0;
  }

  // Use shoelace formula for polygons (assumes planar)
  let area = 0;
  const n = vertices.length;

  // Project to 2D by finding dominant axis
  const normal = ComplexRoomGeometry.calculateNormal(vertices);
  const absNormal = [
    Math.abs(normal[0]), Math.abs(normal[1]), Math.abs(normal[2]),
  ];
  let dominantAxis = 0;
  if (absNormal[1] > absNormal[0]) dominantAxis = 1;
  if (absNormal[2] > absNormal[dominantAxis]) dominantAxis = 2;

  // Select projection plane
  const u = (dominantAxis + 1) % 3;
  const v = (dominantAxis + 2) % 3;

  // Calculate signed area
  for (let i = 0; i < n; i++) {
    let j = (i + 1) % n;
    area += vertices[i][u] * vertices[j][v];
    area -= vertices[j][u] * vertices[i][v];
  }

  return Math.abs(area) / 2;
};

/**
 * Calculate the distance from a point to a plane defined by vertices.
 * @param {Array<Number>} point Point [x, y, z].
 * @param {Array<Array<Number>>} vertices Plane vertices.
 * @return {Number} Distance in meters.
 */
ComplexRoomGeometry.pointToPlaneDistance = function(point, vertices) {
  if (vertices.length < 3) {
    return Infinity;
  }

  let normal = ComplexRoomGeometry.calculateNormal(vertices);
  let d = -(normal[0] * vertices[0][0] +
            normal[1] * vertices[0][1] +
            normal[2] * vertices[0][2]);

  let distance = Math.abs(
    normal[0] * point[0] +
    normal[1] * point[1] +
    normal[2] * point[2] + d
  );

  return distance;
};

/**
 * Calculate the centroid of a polygon.
 * @param {Array<Array<Number>>} vertices Array of vertices.
 * @return {Array<Number>} Centroid [x, y, z].
 */
ComplexRoomGeometry.calculateCentroid = function(vertices) {
  if (vertices.length === 0) {
    return [0, 0, 0];
  }

  let centroid = [0, 0, 0];
  for (let i = 0; i < vertices.length; i++) {
    centroid[0] += vertices[i][0];
    centroid[1] += vertices[i][1];
    centroid[2] += vertices[i][2];
  }

  centroid[0] /= vertices.length;
  centroid[1] /= vertices.length;
  centroid[2] /= vertices.length;

  return centroid;
};

/**
 * Check if a point is inside a convex polygon (2D projection).
 * @param {Array<Number>} point Point [x, y, z].
 * @param {Array<Array<Number>>} vertices Polygon vertices.
 * @return {Boolean} True if point is inside polygon.
 */
ComplexRoomGeometry.isPointInPolygon = function(point, vertices) {
  if (vertices.length < 3) {
    return false;
  }

  // Use ray casting algorithm on 2D projection
  const normal = ComplexRoomGeometry.calculateNormal(vertices);
  const absNormal = [
    Math.abs(normal[0]), Math.abs(normal[1]), Math.abs(normal[2]),
  ];
  let dominantAxis = 0;
  if (absNormal[1] > absNormal[0]) dominantAxis = 1;
  if (absNormal[2] > absNormal[dominantAxis]) dominantAxis = 2;

  const u = (dominantAxis + 1) % 3;
  const v = (dominantAxis + 2) % 3;

  const x = point[u];
  const y = point[v];
  let inside = false;

  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][u];
    const yi = vertices[i][v];
    const xj = vertices[j][u];
    const yj = vertices[j][v];

    const intersect = ((yi > y) !== (yj > y)) &&
                    (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * Calculate volume of a convex polyhedron using divergence theorem.
 * @param {Array<ComplexRoomGeometry~Wall>} walls Array of walls.
 * @return {Number} Volume in cubic meters.
 */
ComplexRoomGeometry.calculateVolume = function(walls) {
  let volume = 0;

  for (let i = 0; i < walls.length; i++) {
    let vertices = walls[i].vertices;
    if (vertices.length < 3) continue;

    let normal = ComplexRoomGeometry.calculateNormal(vertices);
    let centroid = ComplexRoomGeometry.calculateCentroid(vertices);
    let area = ComplexRoomGeometry.calculateArea(vertices);

    // Contribution to volume (divergence theorem)
    volume += (normal[0] * centroid[0] +
               normal[1] * centroid[1] +
               normal[2] * centroid[2]) * area;
  }

  return Math.abs(volume / 3);
};

/**
 * Find the closest wall to a point.
 * @param {Array<Number>} point Point [x, y, z].
 * @param {Array<ComplexRoomGeometry~Wall>} walls Array of walls.
 * @return {Object} Object with wall index and distance.
 */
ComplexRoomGeometry.findClosestWall = function(point, walls) {
  let minDistance = Infinity;
  let closestWallIndex = -1;

  for (let i = 0; i < walls.length; i++) {
    let distance = ComplexRoomGeometry.pointToPlaneDistance(
      point, walls[i].vertices
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestWallIndex = i;
    }
  }

  return {
    wallIndex: closestWallIndex,
    distance: minDistance,
  };
};

/**
 * Create a rectangular room as a set of walls (backward compatibility).
 * @param {Utils~RoomDimensions} dimensions Room dimensions.
 * @param {Utils~RoomMaterials} materials Wall materials.
 * @return {Array<ComplexRoomGeometry~Wall>} Array of 6 walls.
 */
ComplexRoomGeometry.createRectangularRoom = function(dimensions, materials) {
  let hw = dimensions.width / 2;
  let hh = dimensions.height / 2;
  let hd = dimensions.depth / 2;

  return [
    {
      name: 'left',
      material: materials.left || 'transparent',
      vertices: [
        [-hw, -hh, -hd], [-hw, hh, -hd],
        [-hw, hh, hd], [-hw, -hh, hd],
      ],
    },
    {
      name: 'right',
      material: materials.right || 'transparent',
      vertices: [
        [hw, -hh, -hd], [hw, -hh, hd],
        [hw, hh, hd], [hw, hh, -hd],
      ],
    },
    {
      name: 'front',
      material: materials.front || 'transparent',
      vertices: [
        [-hw, -hh, -hd], [hw, -hh, -hd],
        [hw, hh, -hd], [-hw, hh, -hd],
      ],
    },
    {
      name: 'back',
      material: materials.back || 'transparent',
      vertices: [
        [-hw, -hh, hd], [-hw, hh, hd],
        [hw, hh, hd], [hw, -hh, hd],
      ],
    },
    {
      name: 'down',
      material: materials.down || 'transparent',
      vertices: [
        [-hw, -hh, -hd], [-hw, -hh, hd],
        [hw, -hh, hd], [hw, -hh, -hd],
      ],
    },
    {
      name: 'up',
      material: materials.up || 'transparent',
      vertices: [
        [-hw, hh, -hd], [hw, hh, -hd],
        [hw, hh, hd], [-hw, hh, hd],
      ],
    },
  ];
};

module.exports = ComplexRoomGeometry;
