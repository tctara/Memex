import lunr from 'lunr'

import getPipelineStages from './pipeline-lang-mappings'

export default class Pipeline extends lunr.Pipeline {
    static DEF_LANG = 'en'
    static TOKENIZER_STAGE = 'tokenizer'

    constructor(lang = Pipeline.DEF_LANG) {
        super()

        this._lang = lang
        this._initPipeline()
    }

    /**
     * Register and add all specified stages for set language.
     *
     * @return {lunr.Pipeline}
     */
    _initPipeline() {
        const stages = getPipelineStages(this._lang)

        for (const [label, stage] of stages) {
            if (stage == null) {
                continue
            }

            // Override default pipeline tokenizer with language-specified one
            if (label === Pipeline.TOKENIZER_STAGE) {
                this.tokenizer = stage
                continue
            }

            Pipeline.registerFunction(stage, label)
            this.add(stage)
        }
    }

    /**
     * Main functional method. Pass in text and receive back processed `lunr.Token`s as your terms.
     *
     * @param {string} input
     * @return {lunr.Token[]}
     */
    process(input) {
        const tokens = this.tokenizer(input)

        return this.run(tokens)
    }
}
