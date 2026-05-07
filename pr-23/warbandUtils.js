/**
 * Mordheim Warband Builder - Import/Export Utilities
 *
 * Pure utility functions for serializing and deserializing warbands.
 * Uses UMD pattern to work both in the browser and as a CommonJS module (Node.js).
 */
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.WarbandUtils = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Serialize a warband object to a formatted JSON string.
     * @param {Object} warband
     * @returns {string}
     */
    function serializeWarband(warband) {
        return JSON.stringify(warband, null, 2);
    }

    /**
     * Deserialize a JSON string back into a warband object.
     * @param {string} jsonString
     * @returns {Object}
     */
    function deserializeWarband(jsonString) {
        return JSON.parse(jsonString);
    }

    /**
     * Generate a safe filename for exporting a warband (spaces replaced with underscores).
     * @param {string} warbandName
     * @returns {string}
     */
    function generateExportFilename(warbandName) {
        return `${warbandName.replace(/\s+/g, '_')}.json`;
    }

    return { serializeWarband, deserializeWarband, generateExportFilename };
}));
