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

    /**
     * Calculate the warband rating for a given list of fighters.
     * Standard fighters count as 5 points + experience.
     * Large fighters (e.g. Ogres) count as 20 points + experience.
     * @param {Array} fighters - Array of fighter objects with `is_large` and `exp` fields.
     * @returns {{ normalCount: number, bigCount: number, totalExp: number, total: number }}
     */
    function calculateWarbandRating(fighters) {
        let normalCount = 0;
        let bigCount = 0;
        let totalExp = 0;

        (fighters || []).forEach(f => {
            if (f.is_large) {
                bigCount++;
            } else {
                normalCount++;
            }
            totalExp += parseInt(f.exp) || 0;
        });

        const total = normalCount * 5 + bigCount * 20 + totalExp;
        return { normalCount, bigCount, totalExp, total };
    }

    return { serializeWarband, deserializeWarband, generateExportFilename, calculateWarbandRating };
}));
