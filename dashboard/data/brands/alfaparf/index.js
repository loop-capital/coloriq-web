// Alfaparf Milano brand exports for ColorIq
// Line: Evolution of the Color (Permanent)

const evolutionShades = require('./evolution-shades.json');
const evolutionSpecs = require('./evolution-specs.json');

module.exports = {
  brand: 'alfaparf',
  displayName: 'Alfaparf Milano',
  lines: {
    evolution: {
      shades: evolutionShades,
      specs: evolutionSpecs,
    },
  },
  // Flat array of all shades for quick lookup
  allShades: evolutionShades.shades || [],
  // Specs lookup
  allSpecs: [evolutionSpecs],
};
