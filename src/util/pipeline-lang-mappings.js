import { tokenizer, trimmer, stopWordFilter, stemmer } from 'lunr'

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
const createStages = ({ tokenizer, trimmer, stemmer, stopWordFilter }) =>
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
    en: createStages({ tokenizer, trimmer, stopWordFilter, stemmer }),
}

/**
 * @param {string} lang The language key to grab pipeline stages for.
 * @return {PipelineStages}
*/
export default lang => mappings[lang] || mappings.en
