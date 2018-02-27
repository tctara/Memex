import { createAction } from 'redux-act'
import analytics from 'src/analytics'

export const setFilterPopup = createAction('search-filters/setFilterPopup')
export const resetFilterPopup = createAction('search-filters/resetFilterPopup')
export const addTagFilter = createAction('search-filters/addTagFilter')
export const delTagFilter = createAction('search-filters/delTagFilter')
export const toggleTagFilter = createAction('search-filters/toggleTagFilter')
export const addDomainFilter = createAction('search-filters/addDomainFilter')
export const delDomainFilter = createAction('search-filters/delDomainFilter')
export const toggleDomainFilter = createAction(
    'search-filters/toggleDomainFilter',
)
export const setTagFilters = createAction('search-filters/setTagFilters')
export const setDomainFilters = createAction('search-filters/setDomainFilters')

export const resetFilters = createAction('search-filters/resetFilters')
export const showFilter = createAction('search-filters/showFilter')
export const toggleBookmarkFilter = createAction(
    'search-filters/toggleBookmarkFilter',
)

export const addTagFilterWithTracking = tag => dispatch => {
    analytics.trackEvent({ category: 'Tag', action: 'Filter by Tag' })
    dispatch(addTagFilter(tag))
}

export const delTagFilterWithTracking = tag => dispatch => {
    analytics.trackEvent({ category: 'Tag', action: 'Filter by Tag' })
    dispatch(delTagFilter(tag))
}

export const addDomainFilterWithTracking = domain => dispatch => {
    analytics.trackEvent({ category: 'Domain', action: 'Filter by Domain' })
    dispatch(addDomainFilter(domain))
}

export const delDomainFilterWithTracking = domain => dispatch => {
    analytics.trackEvent({ category: 'Domain', action: 'Filter by Domain' })
    dispatch(delDomainFilter(domain))
}
