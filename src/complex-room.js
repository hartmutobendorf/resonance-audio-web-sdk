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
 * @file Complex room model supporting multiple zones and
 * non-rectangular geometries.
 * @author GitHub Copilot Extension
 */

'use strict';

// Internal dependencies.
const LateReflections = require('./late-reflections.js');
const EarlyReflections = require('./early-reflections.js');
const ComplexRoomGeometry = require('./complex-room-geometry.js');
const Utils = require('./utils.js');

/**
 * @class ComplexRoom
 * @description Advanced room model that supports multiple acoustic zones,
 * non-rectangular geometries, and complex architectures like churches or
 * concert halls. Each zone can have its own acoustic properties and zones
 * can be connected via portals.
 * @param {AudioContext} context
 * Associated {@link
 * https://developer.mozilla.org/en-US/docs/Web/API/AudioContext AudioContext}.
 * @param {Object} options
 * @param {Float32Array} options.listenerPosition
 * The listener's initial position (in meters). Defaults to
 * {@linkcode Utils.DEFAULT_POSITION DEFAULT_POSITION}.
 * @param {Array<ComplexRoomGeometry~Zone>} options.zones
 * Array of acoustic zones. If not provided, creates a single default zone.
 * @param {Array<ComplexRoomGeometry~Portal>} options.portals
 * Array of portals connecting zones. Defaults to empty array.
 * @param {Number} options.speedOfSound
 * Speed of sound (in meters/second). Defaults to
 * {@linkcode Utils.DEFAULT_SPEED_OF_SOUND DEFAULT_SPEED_OF_SOUND}.
 */
function ComplexRoom(context, options) {
  // Use defaults for undefined arguments.
  if (options == undefined) {
    options = {};
  }
  if (options.listenerPosition == undefined) {
    options.listenerPosition = Utils.DEFAULT_POSITION.slice();
  }
  if (options.zones == undefined) {
    // Create a default rectangular zone for backward compatibility
    options.zones = [{
      id: 'default',
      walls: ComplexRoomGeometry.createRectangularRoom(
        Utils.DEFAULT_ROOM_DIMENSIONS,
        Utils.DEFAULT_ROOM_MATERIALS
      ),
      volume: 0,
      connectedZones: [],
    }];
  }
  if (options.portals == undefined) {
    options.portals = [];
  }
  if (options.speedOfSound == undefined) {
    options.speedOfSound = Utils.DEFAULT_SPEED_OF_SOUND;
  }

  // Store zones and portals
  this._zones = options.zones;
  this._portals = options.portals;
  this.speedOfSound = options.speedOfSound;
  this._listenerPosition = options.listenerPosition;
  this._context = context;

  // Calculate volumes for zones if not provided
  for (let i = 0; i < this._zones.length; i++) {
    if (!this._zones[i].volume || this._zones[i].volume === 0) {
      this._zones[i].volume = ComplexRoomGeometry.calculateVolume(
        this._zones[i].walls
      );
    }
  }

  // Determine initial zone for listener
  this._currentZone = this._findZoneForPosition(options.listenerPosition);

  // Create audio processing modules for current zone
  this._initializeAudioModules(context, this._currentZone);

  // Create output node
  this.output = context.createGain();
  this.early.output.connect(this.output);
  this._merger = context.createChannelMerger(4);
  this.late.output.connect(this._merger, 0, 0);
  this._merger.connect(this.output);
}

/**
 * Initialize audio modules (early and late reflections) for a zone.
 * @param {AudioContext} context Audio context.
 * @param {ComplexRoomGeometry~Zone} zone Zone to initialize for.
 * @private
 */
ComplexRoom.prototype._initializeAudioModules = function(context, zone) {
  // Calculate equivalent dimensions for the zone (approximate box)
  let dimensions = this._calculateEquivalentDimensions(zone);

  // Calculate absorption coefficients from materials
  let absorptionCoefficients = this._getCoefficientsFromWalls(zone.walls);

  // Calculate reverb durations
  let durations = this._getDurationsFromZone(zone, absorptionCoefficients);

  // Create early reflections module
  let reflectionCoefficients =
    this._computeReflectionCoefficients(absorptionCoefficients);

  this.early = new EarlyReflections(context, {
    dimensions: dimensions,
    coefficients: reflectionCoefficients,
    speedOfSound: this.speedOfSound,
    listenerPosition: this._listenerPosition,
  });

  // Create late reflections module
  this.late = new LateReflections(context, {
    durations: durations,
  });
};

/**
 * Calculate equivalent box dimensions for a zone (for early reflections).
 * @param {ComplexRoomGeometry~Zone} zone Zone to calculate for.
 * @return {Utils~RoomDimensions} Equivalent dimensions.
 * @private
 */
ComplexRoom.prototype._calculateEquivalentDimensions = function(zone) {
  // Find bounding box of all walls
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < zone.walls.length; i++) {
    let vertices = zone.walls[i].vertices;
    for (let j = 0; j < vertices.length; j++) {
      minX = Math.min(minX, vertices[j][0]);
      maxX = Math.max(maxX, vertices[j][0]);
      minY = Math.min(minY, vertices[j][1]);
      maxY = Math.max(maxY, vertices[j][1]);
      minZ = Math.min(minZ, vertices[j][2]);
      maxZ = Math.max(maxZ, vertices[j][2]);
    }
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  };
};

/**
 * Get absorption coefficients from walls.
 * @param {Array<ComplexRoomGeometry~Wall>} walls Array of walls.
 * @return {Object} Absorption coefficients per direction.
 * @private
 */
ComplexRoom.prototype._getCoefficientsFromWalls = function(walls) {
  // Initialize coefficients
  let coefficients = {
    left: new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS),
    right: new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS),
    front: new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS),
    back: new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS),
    down: new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS),
    up: new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS),
  };

  // Aggregate coefficients by wall orientation
  let areas = {left: 0, right: 0, front: 0, back: 0, down: 0, up: 0};
  let weightedCoeffs = {
    left: new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS),
    right: new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS),
    front: new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS),
    back: new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS),
    down: new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS),
    up: new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS),
  };

  for (let i = 0; i < walls.length; i++) {
    let wall = walls[i];
    let normal = ComplexRoomGeometry.calculateNormal(wall.vertices);
    let area = ComplexRoomGeometry.calculateArea(wall.vertices);

    // Get material coefficients
    let materialCoeffs = Utils.ROOM_MATERIAL_COEFFICIENTS[wall.material] ||
                        Utils.ROOM_MATERIAL_COEFFICIENTS['transparent'];

    // Determine primary direction based on normal
    const absNormal = [
      Math.abs(normal[0]), Math.abs(normal[1]), Math.abs(normal[2]),
    ];
    let direction;

    if (absNormal[0] > absNormal[1] && absNormal[0] > absNormal[2]) {
      direction = normal[0] > 0 ? 'right' : 'left';
    } else if (absNormal[1] > absNormal[2]) {
      direction = normal[1] > 0 ? 'up' : 'down';
    } else {
      direction = normal[2] > 0 ? 'back' : 'front';
    }

    // Weight coefficients by area
    areas[direction] += area;
    for (let j = 0; j < Utils.NUMBER_REVERB_FREQUENCY_BANDS; j++) {
      weightedCoeffs[direction][j] += materialCoeffs[j] * area;
    }
  }

  // Calculate area-weighted average
  for (let dir in coefficients) {
    if (areas[dir] > 0) {
      for (let j = 0; j < Utils.NUMBER_REVERB_FREQUENCY_BANDS; j++) {
        coefficients[dir][j] = weightedCoeffs[dir][j] / areas[dir];
      }
    } else {
      // Use default if no walls in this direction
      let defaultCoeffs = Utils.ROOM_MATERIAL_COEFFICIENTS['transparent'];
      for (let j = 0; j < Utils.NUMBER_REVERB_FREQUENCY_BANDS; j++) {
        coefficients[dir][j] = defaultCoeffs[j];
      }
    }
  }

  return coefficients;
};

/**
 * Calculate reverb durations for a zone.
 * @param {ComplexRoomGeometry~Zone} zone Zone to calculate for.
 * @param {Object} coefficients Absorption coefficients.
 * @return {Float32Array} Reverb durations per frequency band.
 * @private
 */
ComplexRoom.prototype._getDurationsFromZone = function(zone, coefficients) {
  let durations = new Float32Array(Utils.NUMBER_REVERB_FREQUENCY_BANDS);

  let volume = zone.volume;
  if (volume < Utils.ROOM_MIN_VOLUME) {
    return durations;
  }

  // Calculate total surface area
  let totalArea = 0;
  for (let i = 0; i < zone.walls.length; i++) {
    totalArea += ComplexRoomGeometry.calculateArea(zone.walls[i].vertices);
  }

  if (totalArea === 0) {
    return durations;
  }

  // Acoustic constant
  let k = Utils.TWENTY_FOUR_LOG10 / this.speedOfSound;

  for (let i = 0; i < Utils.NUMBER_REVERB_FREQUENCY_BANDS; i++) {
    // Calculate effective absorptive area
    let absorptionArea = 0;
    for (let j = 0; j < zone.walls.length; j++) {
      let wall = zone.walls[j];
      let area = ComplexRoomGeometry.calculateArea(wall.vertices);
      let materialCoeffs = Utils.ROOM_MATERIAL_COEFFICIENTS[wall.material] ||
                          Utils.ROOM_MATERIAL_COEFFICIENTS['transparent'];
      absorptionArea += materialCoeffs[i] * area;
    }

    let meanAbsorption = absorptionArea / totalArea;

    // Compute reverberation using Eyring equation
    durations[i] = Utils.ROOM_EYRING_CORRECTION_COEFFICIENT * k * volume /
      (-totalArea * Math.log(1 - meanAbsorption) + 4 *
      Utils.ROOM_AIR_ABSORPTION_COEFFICIENTS[i] * volume);
  }

  return durations;
};

/**
 * Compute reflection coefficients from absorption coefficients.
 * @param {Object} absorptionCoefficients Absorption coefficients.
 * @return {Object} Reflection coefficients.
 * @private
 */
ComplexRoom.prototype._computeReflectionCoefficients =
    function(absorptionCoefficients) {
  let reflectionCoefficients = [];
  for (let property in Utils.DEFAULT_REFLECTION_COEFFICIENTS) {
    if (Utils.DEFAULT_REFLECTION_COEFFICIENTS.hasOwnProperty(property)) {
      reflectionCoefficients[property] = 0;
      for (let j = 0; j < Utils.NUMBER_REFLECTION_AVERAGING_BANDS; j++) {
        let bandIndex = j + Utils.ROOM_STARTING_AVERAGING_BAND;
        reflectionCoefficients[property] +=
          absorptionCoefficients[property][bandIndex];
      }
      reflectionCoefficients[property] /=
        Utils.NUMBER_REFLECTION_AVERAGING_BANDS;
      reflectionCoefficients[property] =
        Math.sqrt(1 - reflectionCoefficients[property]);
    }
  }
  return reflectionCoefficients;
};

/**
 * Find which zone contains a given position.
 * @param {Array<Number>} position Position [x, y, z].
 * @return {ComplexRoomGeometry~Zone} Zone containing the position,
 * or first zone if not found.
 * @private
 */
ComplexRoom.prototype._findZoneForPosition = function(position) {
  // For now, use simple bounding box test
  // More sophisticated point-in-polyhedron test could be added
  for (let i = 0; i < this._zones.length; i++) {
    let zone = this._zones[i];
    let dimensions = this._calculateEquivalentDimensions(zone);

    // Simple bounding box check
    if (Math.abs(position[0]) <= dimensions.width / 2 &&
        Math.abs(position[1]) <= dimensions.height / 2 &&
        Math.abs(position[2]) <= dimensions.depth / 2) {
      return zone;
    }
  }

  // Default to first zone if not found
  return this._zones[0];
};

/**
 * Set the listener's position (in meters).
 * @param {Number} x X coordinate.
 * @param {Number} y Y coordinate.
 * @param {Number} z Z coordinate.
 */
ComplexRoom.prototype.setListenerPosition = function(x, y, z) {
  this._listenerPosition = [x, y, z];

  // Check if listener changed zones
  let newZone = this._findZoneForPosition(this._listenerPosition);
  if (newZone !== this._currentZone) {
    // Zone transition - could trigger acoustic transition
    this._currentZone = newZone;
    // In a full implementation, we'd smoothly transition between zones
  }

  // Update early reflections
  this.early.speedOfSound = this.speedOfSound;
  this.early.setListenerPosition(x, y, z);

  // Calculate attenuation based on zone boundaries
  let gain = this._calculateZoneAttenuation(x, y, z);
  this.output.gain.value = gain;
};

/**
 * Calculate attenuation based on distance from zone boundaries.
 * @param {Number} x X coordinate.
 * @param {Number} y Y coordinate.
 * @param {Number} z Z coordinate.
 * @return {Number} Gain value (0-1).
 * @private
 */
ComplexRoom.prototype._calculateZoneAttenuation = function(x, y, z) {
  let minDistanceOutside = Infinity;

  // Check distance to all zone boundaries
  for (let i = 0; i < this._zones.length; i++) {
    let zone = this._zones[i];
    let dimensions = this._calculateEquivalentDimensions(zone);

    // Simple bounding box distance calculation
    let dx = Math.max(0, Math.abs(x) - dimensions.width / 2);
    let dy = Math.max(0, Math.abs(y) - dimensions.height / 2);
    let dz = Math.max(0, Math.abs(z) - dimensions.depth / 2);
    let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    minDistanceOutside = Math.min(minDistanceOutside, distance);
  }

  if (minDistanceOutside > Utils.EPSILON_FLOAT) {
    let gain = 1 - minDistanceOutside /
        Utils.LISTENER_MAX_OUTSIDE_ROOM_DISTANCE;
    return Math.max(0, Math.min(1, gain));
  }

  return 1;
};

/**
 * Add a new zone to the complex room.
 * @param {ComplexRoomGeometry~Zone} zone Zone to add.
 */
ComplexRoom.prototype.addZone = function(zone) {
  // Calculate volume if not provided
  if (!zone.volume || zone.volume === 0) {
    zone.volume = ComplexRoomGeometry.calculateVolume(zone.walls);
  }

  this._zones.push(zone);
};

/**
 * Add a portal connecting two zones.
 * @param {ComplexRoomGeometry~Portal} portal Portal to add.
 */
ComplexRoom.prototype.addPortal = function(portal) {
  // Calculate area if not provided
  if (!portal.area || portal.area === 0) {
    portal.area = ComplexRoomGeometry.calculateArea(portal.vertices);
  }

  this._portals.push(portal);

  // Update zone connectivity
  for (let i = 0; i < this._zones.length; i++) {
    if (this._zones[i].id === portal.fromZone) {
      if (!this._zones[i].connectedZones.includes(portal.toZone)) {
        this._zones[i].connectedZones.push(portal.toZone);
      }
    }
    if (this._zones[i].id === portal.toZone) {
      if (!this._zones[i].connectedZones.includes(portal.fromZone)) {
        this._zones[i].connectedZones.push(portal.fromZone);
      }
    }
  }
};

/**
 * Get the current zone containing the listener.
 * @return {ComplexRoomGeometry~Zone} Current zone.
 */
ComplexRoom.prototype.getCurrentZone = function() {
  return this._currentZone;
};

/**
 * Get all zones in the complex room.
 * @return {Array<ComplexRoomGeometry~Zone>} Array of zones.
 */
ComplexRoom.prototype.getZones = function() {
  return this._zones;
};

/**
 * Get all portals in the complex room.
 * @return {Array<ComplexRoomGeometry~Portal>} Array of portals.
 */
ComplexRoom.prototype.getPortals = function() {
  return this._portals;
};

/**
 * Set properties for a specific zone.
 * @param {String} zoneId Zone identifier.
 * @param {Array<ComplexRoomGeometry~Wall>} walls Updated walls for the zone.
 */
ComplexRoom.prototype.setZoneProperties = function(zoneId, walls) {
  for (let i = 0; i < this._zones.length; i++) {
    if (this._zones[i].id === zoneId) {
      this._zones[i].walls = walls;
      this._zones[i].volume = ComplexRoomGeometry.calculateVolume(walls);

      // If this is the current zone, update audio modules
      if (this._zones[i] === this._currentZone) {
        let absorptionCoefficients = this._getCoefficientsFromWalls(walls);
        let durations = this._getDurationsFromZone(
          this._zones[i],
          absorptionCoefficients
        );
        this.late.setDurations(durations);

        let dimensions = this._calculateEquivalentDimensions(this._zones[i]);
        let reflectionCoefficients =
          this._computeReflectionCoefficients(absorptionCoefficients);
        this.early.setRoomProperties(dimensions, reflectionCoefficients);
      }
      break;
    }
  }
};

module.exports = ComplexRoom;
