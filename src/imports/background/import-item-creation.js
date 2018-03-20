import normalizeUrl from 'src/util/encode-url-for-id'
import { grabExistingKeys } from 'src/search'
import { blacklist } from 'src/blacklist/background'
import { isLoggable } from 'src/activity-logger'
import { IMPORT_TYPE } from 'src/options/imports/constants'
import DataSources from './data-sources'

// Binds an import type to a function that transforms a history/bookmark doc to an import item.
const transformBrowserToImportItem = type => item => ({
    browserId: item.id,
    url: item.url,
    type,
})

export default class ImportItemCreator {
    /**
     * @param {number} [histLimit=Infinity] Limit of history items to create.
     * @param {number} [bmLimit=Infinity] Limit of bookmark items to create.
     */
    constructor(
        { histLimit = Infinity, bmLimit = Infinity },
        sources = new DataSources(),
    ) {
        this._histLimit = histLimit
        this._bmLimit = bmLimit

        this._dataSources = sources

        this.existingDataReady = new Promise((resolve, reject) =>
            this._initExistingChecks()
                .then(resolve)
                .catch(reject),
        )
    }

    static _limitMap = (items, limit) => new Map([...items].slice(0, limit))

    async _initExistingChecks() {
        this.isBlacklisted = await blacklist.checkWithBlacklist()

        // Grab existing data keys from DB
        const keySets = await grabExistingKeys()
        this.histKeys = keySets.histKeys
        this.bmKeys = keySets.bmKeys
    }

    /**
    *
    * Performs all needed filtering on a collection of history or bookmarks
    *
    * @param {(item: any) => any} [transform=noop] Opt. transformformation fn turning current iterm into import item structure.
    * @param {(url: string) => bool} [alreadyExists] Opt. checker function to check against existing data.
    * @return {(items: any[]) => Map<string, any>} Function that filters array of browser items into a Map of encoded URL strings to import items.
    */
    _filterItemsByUrl = (
        transform = f => f,
        alreadyExists = url => false,
    ) => items => {
        const importItems = new Map()

        for (let i = 0; i < items.length; i++) {
            // Exclude item if any of the standard checks fail
            if (!isLoggable(items[i]) || this.isBlacklisted(items[i])) {
                continue
            }

            // Asssociate the item with the encoded URL in results Map
            try {
                const normalizedUrl = normalizeUrl(items[i].url)

                if (!alreadyExists(normalizedUrl)) {
                    importItems.set(normalizedUrl, transform(items[i]))
                }
            } catch (err) {
                continue
            }
        }

        return importItems
    }

    /**
     * @generator
     * Handles fetching and filtering the history URLs in time period batches,
     * yielding those batches.
     */
    async *_createHistItems() {
        const filterByUrl = this._filterItemsByUrl(
            transformBrowserToImportItem(IMPORT_TYPE.HISTORY),
            url => this.histKeys.has(url),
        )
        let itemCount = 0

        for await (const historyItemBatch of this._dataSources.history()) {
            const prevCount = itemCount
            const itemsMap = filterByUrl(historyItemBatch)

            // If no items in given period of history, go to next period
            if (!itemsMap.size) {
                continue
            }

            itemCount += itemsMap.size

            if (itemCount >= this._histLimit) {
                return yield {
                    data: ImportItemCreator._limitMap(
                        itemsMap,
                        this._histLimit - prevCount,
                    ),
                    type: IMPORT_TYPE.HISTORY,
                }
            }

            if (!itemsMap.size) {
                continue
            }

            yield { data: itemsMap, type: IMPORT_TYPE.HISTORY }
        }
    }

    async *_createBmItems() {
        // Chrome and FF seem to ID their bookmark data differently. Root works from '' in FF
        //  but needs '0' in Chrome. `runtime.getBrowserInfo` is only available on FF web ext API
        const rootId =
            typeof browser.runtime.getBrowserInfo === 'undefined' ? '0' : ''

        const filterByUrl = this._filterItemsByUrl(
            transformBrowserToImportItem(IMPORT_TYPE.BOOKMARK),
            url => this.bmKeys.has(url),
        )
        let itemCount = 0

        for await (const bmItemBatch of this._dataSources.bookmarks({
            id: rootId,
        })) {
            const prevCount = itemCount
            const itemsMap = filterByUrl(bmItemBatch)
            itemCount += itemsMap.size

            if (itemCount >= this._bmLimit) {
                return yield {
                    data: ImportItemCreator._limitMap(
                        itemsMap,
                        this._bmLimit - prevCount,
                    ),
                    type: IMPORT_TYPE.BOOKMARK,
                }
            }

            if (!itemsMap.size) {
                continue
            }

            yield { data: itemsMap, type: IMPORT_TYPE.BOOKMARK }
        }
    }

    /**
     * Main interface method, allowing incremental creation of different import item types.
     *
     * @generator
     * @yields {any} Object containing `type` and `data` keys, with string and
     *  `Map<string, ImportItem>` types, respectively.
     */
    async *createImportItems() {
        if (this._bmLimit > 0) {
            yield* this._createBmItems()
        }

        if (this._histLimit > 0) {
            // Yield history items in chunks
            yield* this._createHistItems()
        }
    }
}
