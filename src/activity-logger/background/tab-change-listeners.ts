import { browser, Tabs } from 'webextension-polyfill-ts'

import searchIndex from '../../search'
import { whenPageDOMLoaded, whenTabActive } from '../../util/tab-events'
import { logPageVisit, logInitPageVisit } from './log-page-visit'
import { fetchFavIcon } from '../../page-analysis/background/get-fav-icon'
import { shouldLogTab, updateVisitInteractionData } from './util'
import { TabState, TabChangeListener } from './types'
import tabManager from './tab-manager'

// `tabs.onUpdated` event fires on tab open - generally takes a few ms, which we can skip attemping visit update
const fauxVisitThreshold = 100

export const handleVisitEnd: TabChangeListener = async function(
    tabId,
    { url },
    { incognito, active },
) {
    // Ensures the URL change counts as a new visit in tab state (tab ID doesn't change)
    const oldTab = tabManager.resetTab(tabId, active, url) as TabState

    // Send off request for updating that prev. visit's tab state, if active long enough
    if (
        oldTab != null &&
        oldTab.url !== url &&
        oldTab.activeTime > fauxVisitThreshold &&
        (await shouldLogTab({ url: oldTab.url, incognito } as Tabs.Tab))
    ) {
        updateVisitInteractionData(oldTab)
    }
}

/**
 * Handles scheduling the main page indexing logic that happens on browser tab URL change,
 * and updating the internally held tab manager state.
 */
export const handleUrl: TabChangeListener = async function(
    tabId,
    { url },
    tab,
) {
    await handleVisitEnd(tabId, { url }, tab).catch(e => e)

    if (await shouldLogTab(tab)) {
        // Run stage 1 of visit indexing
        await whenPageDOMLoaded({ tabId })
        await logInitPageVisit(tabId)

        // Schedule stage 2 of visit indexing soon after - if user stays on page
        tabManager.scheduleTabLog(tabId, () =>
            Promise.all([
                whenPageDOMLoaded({ tabId }),
                whenTabActive({ tabId }),
            ])
                .then(() => logPageVisit(tabId))
                .catch(err => {
                    return
                }),
        )
    }
}

/**
 * Handles fetching, and indexing the fav-icon once the tab updates, if needed.
 */
export const handleFavIcon: TabChangeListener = async function(
    tabId,
    { favIconUrl },
    tab,
) {
    if (
        (await shouldLogTab(tab)) &&
        !await searchIndex.domainHasFavIcon(tab.url)
    ) {
        const favIconDataUrl = await fetchFavIcon(favIconUrl)
        await searchIndex.addFavIcon(tab.url, favIconDataUrl)
    }
}
