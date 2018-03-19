import {
    IMPORT_TYPE as TYPE,
    OLD_EXT_KEYS,
} from 'src/options/imports/constants'
import { NUM_IMPORT_ITEMS as ONBOARDING_LIM } from 'src/overview/onboarding/constants'
import ItemCreator from './import-item-creation'
import ImportCache from './cache'

/**
 * Object with keys for each import item type and corresponding unsigned int values,
 * representing the estimates count for that particular type.
 *
 * @typedef {Object} ItemTypeCount
 * @property {number} h
 * @property {number} o
 * @property {number} b
 */

/**
 * @typedef {Object} EstimateCounts
 * @property {ItemTypeCount} remaining
 * @property {ItemTypeCount} completed
 */

export class ImportStateManager {
    static QUICK_MODE_ITEM_LIMITS = { histLimit: ONBOARDING_LIM, bmLimit: 0 }

    static DEF_ALLOW_TYPES = {
        [TYPE.HISTORY]: true,
        [TYPE.BOOKMARK]: true,
        [TYPE.OLD]: true,
    }

    /**
     * @type {any} Object containing boolean flags for each import item type key, representing whether
     *  or not that type should be saved to state (user configurable via UI import-type checkboxes).
     */
    allowTypes = ImportStateManager.DEF_ALLOW_TYPES

    /**
     * @type {ItemTypeCount}
     */
    completed

    /**
     * @type {ItemTypeCount}
     */
    remaining

    /**
     * @param {ImportCache} [cacheBackend] Affords state persistence.
     */
    constructor(cacheBackend = new ImportCache()) {
        this._cache = cacheBackend
    }

    /**
     * @returns {EstimateCounts}
     */
    get counts() {
        return {
            completed: this.completed,
            remaining: this.remaining,
        }
    }

    /**
     * @param {EstimateCounts} ests
     */
    set counts({ completed, remaining }) {
        this.completed = completed
        this.remaining = remaining
    }

    /**
     * @param {ImportItem} importItem
     * @param {boolean} isError
     */
    _markOffItem({ type }, isError) {
        this.remaining[type] -= 1

        if (!isError) {
            this.completed[type] += 1
        }
    }

    /**
     * Handles calculating the completed estimate counts for history, bookmark, and old-ext imports.
     *
     * @param {ImportItemCreator} creator Ready item creator instance to afford access to existing keys.
     */
    async _calcCompletedCounts(creator) {
        const {
            [OLD_EXT_KEYS.NUM_DONE]: numOldExtDone,
        } = await browser.storage.local.get({ [OLD_EXT_KEYS.NUM_DONE]: 0 })

        // Can sometimes return slightly different lengths for unknown reason
        const completedHistory = creator.histKeys.size - creator.bmKeys.size

        this.completed = {
            [TYPE.HISTORY]: completedHistory < 0 ? 0 : completedHistory,
            [TYPE.BOOKMARK]: creator.bmKeys.size,
            [TYPE.OLD]: numOldExtDone,
        }
    }

    /**
     * Handles calculating the remaining estimate counts for history, bookmark, and old-ext imports.
     *
     * @param {ImportItemCreator} creator Ready item creator instance to afford creating import items from browser data.
     */
    async _calcRemainingCounts(creator) {
        let bookmarkIds = new Set()

        // Import items creation will yield parts of the total items
        for await (let { data, type } of creator.createImportItems()) {
            if (type === TYPE.BOOKMARK) {
                // Bookmarks should always yield before history
                bookmarkIds = new Set([...bookmarkIds, ...data.keys()])
            } else if (type === TYPE.HISTORY) {
                // Don't include pages in history that exist as bookmarks as well
                data = new Map(
                    [...data].filter(([key]) => !bookmarkIds.has(key)),
                )
            }

            // Cache current processed chunk for checking against future chunks (count state change happens in here)
            const numAdded = await this._cache.persistItems(data, type)
            this.remaining[type] += numAdded // Inc count state
        }
    }

    /**
     * Main count calculation method which will create import items, and set state counts and item chunks.
     *
     * @param {boolean} quick Denotes whether or not to instantiate an ItemCreator instance with limited creation use.
     */
    async _calcCounts(quick) {
        this.counts = ImportCache.INIT_ESTS
        await this.clearItems()

        // Quick mode limits just to a small section of recent history
        const itemLimits = quick
            ? ImportStateManager.QUICK_MODE_ITEM_LIMITS
            : {}

        // Create new ImportItemCreator to create import items from which we derive counts
        const creator = new ItemCreator(itemLimits)
        await creator.existingDataReady

        await this._calcCompletedCounts(creator)
        await this._calcRemainingCounts(creator)
    }

    /**
     * Forces the persisted estimates state to be "dirtied", meaning next `fetchEsts` attempt will
     * require a complete recalc rather than using the persisted state/cache.
     */
    dirtyEsts() {
        this._cache.expired = true
    }

    /**
     * Attempts to fetch the estimate counts from local state or does a complete state recalculation
     * if it deems current state to be out-of-date.
     *
     * @param {boolean} [quick=false] Determines if quick mode is set (only limited recent history).
     * @return {EstimateCounts}
     */
    async fetchEsts(quick = false) {
        if (this._cache.expired) {
            // Perform calcs to update state
            await this._calcCounts(quick)
            await this._cache.persistEsts(this.counts)

            // Expire cache immediately if quick mode (next read attempt will recalc)
            if (quick) this._cache.expired = true
        }

        return this.counts
    }

    /**
     * @generator
     * @param {boolean} [includeErrs=true] Flag to decide whether to include error'd items in the Iterator.
     * @yields {any} Object containing `chunkKey` and `chunk` pair, corresponding to the chunk storage key
     *  and value at that storage key, respectively.
     */
    async *fetchItems(includeErrs = false) {
        yield* this._cache.getItems(includeErrs)
    }

    /**
     * Removes a single import item from its stored chunk.
     *
     * @param {string} chunkKey Storage key of chunk in which item wanted to remove exists.
     * @param {string} itemKey Key within chunk pointing item to remove.
     * @returns {ImportItem} The removed import item.
     */
    async removeItem(chunkKey, itemKey, isError = false) {
        const item = await this._cache.removeItem(chunkKey, itemKey)

        // Decrement remaining items count
        if (item != null) {
            this._markOffItem(item, isError)
        }

        return item
    }

    /**
     * Moves a single import item from its stored chunk to an error chunk.
     *
     * @param {string} chunkKey Storage key of chunk in which item wanted to flag exists.
     * @param {string} itemKey Key within chunk pointing item to flag.
     */
    async flagItemAsError(chunkKey, itemKey) {
        const item = await this.removeItem(chunkKey, itemKey, true)
        await this._cache.flagItemAsError(itemKey, item)
    }

    clearItems = () => this._cache.clear()
}

const instance = new ImportStateManager()

export default instance
