import urlRegex from 'url-regex'
import { SEARCH_ENGINES } from './constants'

// Get the window's current URL
// Do a regex match of URL against Search Engine's query URLs
// (Google for now)
// And extract the query

const href = window.location.href

if (href.match(SEARCH_ENGINES.google.regex) != null) {
    const url = new URL(href)
    const query = url.searchParams.get('q')
    search(query)
}
