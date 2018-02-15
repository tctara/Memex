/**
 * This module wraps around the slightly awkward interface of `lunr-languages`, which makes it
 * hard when you only care about part of lunr (pipeline in our case). Takes care of binding
 * the language pipeline fns to a lunr instance, then extracting them and exposing a Map of
 * them for use in a custom Pipeline.
 */

import lunr from 'lunr'
import stem from 'lunr-languages/lunr.stemmer.support'
import de from 'lunr-languages/lunr.de'
import fr from 'lunr-languages/lunr.fr'
import du from 'lunr-languages/lunr.du'
import es from 'lunr-languages/lunr.es'
import hu from 'lunr-languages/lunr.hu'
import it from 'lunr-languages/lunr.it'
import fi from 'lunr-languages/lunr.fi'
import da from 'lunr-languages/lunr.da'
import no from 'lunr-languages/lunr.no'
import pt from 'lunr-languages/lunr.pt'
import ru from 'lunr-languages/lunr.ru'
import ro from 'lunr-languages/lunr.ro'

export const lunrLangs = [
    'de',
    'fr',
    'du',
    'es',
    'hu',
    'it',
    'fi',
    'da',
    'no',
    'pt',
    'ru',
    'ro',
]

// Set up access to the pipeline functions provided by `lunr-languages` - painful...
stem(lunr)
de(lunr)
fr(lunr)
du(lunr)
es(lunr)
hu(lunr)
it(lunr)
fi(lunr)
da(lunr)
no(lunr)
pt(lunr)
ru(lunr)
ro(lunr)

/**
 * @param {any} The function bound to the `lunr` constructor via `lunr-languages` language constructor.
 * @return {any} The extracted `lunr-languages` pipeline functions for use in our Pipeline.
 */
const extractPipelineStages = ({
    stemmer,
    tokenizer,
    trimmer,
    stopWordFilter,
    ...lunrLangFn
}) => ({
    stemmer,
    tokenizer,
    trimmer,
    stopWordFilter,
})

/**
 * @type {Map<string, any>} Maps from 2-char language keys to a PipelineStages object containing those
 *  `lunr.PipelineFunction`s extracted from `lunr-languages` package.
 */
export default new Map(
    lunrLangs.map(lang => [lang, extractPipelineStages(lunr[lang])]),
)
