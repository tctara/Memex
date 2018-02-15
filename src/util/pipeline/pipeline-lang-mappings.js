import {
    tokenizer as defTokenizer,
    trimmer,
    stopWordFilter,
    stemmer,
} from 'lunr'

import lunrLangs from './lunr-languages'

/**
 * Allowed stages. Also used to serialize pipelines.
 *
 * @typedef {('tokenizer'|'trimmer'|'stopWordFilter'|'stemmer')} PipelineStageLabel
 */

/**
 * Map of pipeline stage functions to run tokens through. Use of Map here as both order
 * and association is important for use-case.
 *
 * @typedef {Map<PipelineStageLabel, lunr.PipelineFunction>} PipelineStages
 */

/**
 * @param {{ [stage: PipelineStageLabel]: lunr.PipelineFunction | undefined }}
 * @return {PipelineStages}
 */
const createStages = ({
    tokenizer = defTokenizer, // Lots of languages apparently work fine with the 'en' tokenzier
    trimmer,
    stemmer,
    stopWordFilter,
}) =>
    new Map([
        ['tokenizer', tokenizer],
        ['trimmer', trimmer],
        ['stemmer', stemmer],
        ['stopWordFilter', stopWordFilter],
    ])

/**
 * Add custom processing stages for different languages in here - either custom functions or from libs.
 *
 * @type {{ [langKey: string]: PipelineStages }}
*/
const mappings = {
    en: createStages({
        trimmer,
        stopWordFilter,
        stemmer,
    }),
    // ... ADD HERE ...
}

// Augment static mappings with those provided by `lunr-languages` package
for (const [lang, stages] of lunrLangs) {
    mappings[lang] = createStages(stages)
}

/**
 * @param {string} lang The language key to grab pipeline stages for.
 * @return {PipelineStages} Will always default to the English mappings if an unknown language provided.
*/
export default lang => mappings[lang] || mappings.en
