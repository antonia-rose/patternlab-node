'use strict';

/*
 * handlebars pattern engine for patternlab-node
 *
 * Geoffrey Pursell, Brian Muenzenmeyer, and the web community.
 * Licensed under the MIT license.
 *
 * Many thanks to Brad Frost and Dave Olsen for inspiration, encouragement, and advice.
 *
 */

/*
 * ENGINE SUPPORT LEVEL:
 *
 * Full. Partial calls and lineage hunting are supported. Handlebars does not
 * support the mustache-specific syntax extensions, style modifiers and pattern
 * parameters, because their use cases are addressed by the core Handlebars
 * feature set. It also does not support verbose partial syntax, because it
 * seems like it can't tolerate slashes in partial names. But honestly, did you
 * really want to use the verbose syntax anyway? I don't.
 *
 */

const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');

// regexes, stored here so they're only compiled once
const findPartialsRE = /{{#?>\s*([\w-\/.]+)(?:.|\s+)*?}}/g;
const findListItemsRE = /({{#( )?)(list(I|i)tems.)(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)( )?}}/g;
const findAtPartialBlockRE = /{{#?>\s*@partial-block\s*}}/g;

function escapeAtPartialBlock(partialString) {
  var partial = partialString.replace(
    findAtPartialBlockRE,
    '&#123;{> @partial-block }&#125;'
  );
  return partial;
}

var engine_handlebars = {
  engine: Handlebars,
  engineName: 'handlebars',
  engineFileExtension: ['.hbs', '.handlebars'],

  // partial expansion is only necessary for Mustache templates that have
  // style modifiers or pattern parameters (I think)
  expandPartials: false,

  // render it
  renderPattern: function renderPattern(pattern, data, partials) {
    if (partials) {
      Handlebars.registerPartial(partials);
    }

    var compiled = Handlebars.compile(escapeAtPartialBlock(pattern.template));

    return Promise.resolve(compiled(data));
  },

  registerPartial: function(pattern) {
    // register exact partial name
    Handlebars.registerPartial(pattern.patternPartial, pattern.template);

    Handlebars.registerPartial(pattern.verbosePartial, pattern.template);
  },

  // find and return any {{> template-name }} within pattern
  findPartials: function findPartials(pattern) {
    var matches = pattern.template.match(findPartialsRE);
    return matches;
  },
  findPartialsWithStyleModifiers: function() {
    // TODO: make the call to this from oPattern objects conditional on their
    // being implemented here.
    return [];
  },

  // returns any patterns that match {{> value(foo:"bar") }} or {{>
  // value:mod(foo:"bar") }} within the pattern
  findPartialsWithPatternParameters: function() {
    // TODO: make the call to this from oPattern objects conditional on their
    // being implemented here.
    return [];
  },
  findListItems: function(pattern) {
    var matches = pattern.template.match(findListItemsRE);
    return matches;
  },

  // given a pattern, and a partial string, tease out the "pattern key" and
  // return it.
  findPartial: function(partialString) {
    var partial = partialString.replace(findPartialsRE, '$1');
    return partial;
  },

  spawnFile: function(config, fileName) {
    const paths = config.paths;
    const metaFilePath = path.resolve(paths.source.meta, fileName);
    try {
      fs.statSync(metaFilePath);
    } catch (err) {
      //not a file, so spawn it from the included file
      const metaFileContent = fs.readFileSync(
        path.resolve(__dirname, '..', '_meta/', fileName),
        'utf8'
      );
      fs.outputFileSync(metaFilePath, metaFileContent);
    }
  },

  /**
   * Checks to see if the _meta directory has engine-specific head and foot files,
   * spawning them if not found.
   *
   * @param {object} config - the global config object from core, since we won't
   * assume it's already present
   */
  spawnMeta: function(config) {
    this.spawnFile(config, '_00-head.hbs');
    this.spawnFile(config, '_01-foot.hbs');
  },
};

module.exports = engine_handlebars;