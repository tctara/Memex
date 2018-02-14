import lunr from 'lunr'

import getPipelineStages from './pipeline-lang-mappings'

// All languages we support need to be statically imported to be included in the bundle; these are just example
import 'lunr-languages/lunr.de'
import 'lunr-languages/lunr.fr'
import 'lunr-languages/lunr.du'
import 'lunr-languages/lunr.es'
import 'lunr-languages/lunr.hu'

/**
 * Abstracts away the rest of lunr to provide an interface to
 * the main token-processing pipeline.
 */
export default class Pipeline {
    static DEF_LANG = 'en'
    static TOKENIZER_STAGE = 'tokenizer'

    constructor(lang = Pipeline.DEF_LANG, lunrConstructor = lunr) {
        this._lang = lang
        this._lunr = lunrConstructor

        this._initLangAddons()
        this._initPipeline()
    }

    // English doesn't need configuring; it's default on lunr
    get _shouldLoadLang() {
        return this._lang !== Pipeline.DEF_LANG
    }

    /**
     * Dynamically require and apply the particular addon language to the lunr constructor.
     * Really painful way to do it, as we only care about the pipeline part.
     *
     * @throws {Error} If set language isn't avaiable - TODO: ensure this doesn't happen.
     */
    _initLangAddons() {
        require('lunr-languages/lunr.stemmer.support')(this._lunr)

        if (this._shouldLoadLang) {
            require(`lunr-languages/lunr.${this._lang}`)(this._lunr)
        }
    }

    /**
     * Register and add all specified stages for set language.
     * TODO: need to somehow juggle the `lunr-languages` auto-added pipeline stages and whatever custom
     *   stages we support.
     *
     * @return {lunr.Pipeline}
     */
    _initPipeline() {
        const that = this

        // Apparently we have to create a lunr.Builder instance to use `lunr-languages` pipeline stages
        const { pipeline } = this._lunr(function() {
            if (that._shouldLoadLang) {
                // This adds the stages associated with set language to the pipeline
                this.use(that._lunr[that._lang])
            }
        })

        // Add our custom pipeline stages for different languages
        const stages = getPipelineStages(this._lang)

        for (const [label, stage] of stages) {
            if (stage == null) {
                continue
            }

            // Override default lunr.Builder tokenizer with language-specified one
            if (label === Pipeline.TOKENIZER_STAGE) {
                this._tokenize = stage
                continue
            }

            lunr.Pipeline.registerFunction(stage, label)
            pipeline.add(stage)
        }

        this._pipeline = pipeline
    }

    /**
     * Main functional method. Pass in text and receive back processed `lunr.Token`s as your terms.
     *
     * @param {string} input
     * @return {lunr.Token[]}
     */
    process(input) {
        const tokens = this._tokenize(input)

        return this._pipeline.run(tokens)
    }
}
