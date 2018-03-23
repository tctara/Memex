/* eslint-env jest */

import { ImportStateManager as State } from './import-state'
import DataSources from './data-sources'
import ItemCreator from './item-creator'

import * as DATA from './import-state.test.data'

jest.mock('src/blacklist/background/interface')
jest.mock('src/util/encode-url-for-id')
jest.mock('src/activity-logger')
jest.mock('src/search')
jest.mock('./cache')
jest.mock('./data-sources')

const removeIntersection = (a = [], b = []) => {
    const checkSet = new Set(b)
    return a.filter(val => !checkSet.has(val))
}

describe('Import items derivation', () => {
    let state

    beforeAll(() => {
        // Init fake data source
        const dataSources = new DataSources({
            history: DATA.history,
            bookmarks: DATA.bookmarks,
        })

        const itemCreator = new ItemCreator({ dataSources })
        state = new State({ itemCreator })
    })

    // Clear and force re-calc for each test
    beforeEach(async () => {
        await state.clearItems()
        await state.fetchEsts()
    })

    test('state can get initd from cache', async () => {
        // Force update mock Cache with fake counts
        state._cache.counts = { ...DATA.fakeCacheCounts }

        // Force initing state from cache
        await state._initFromCache()

        // State counts should now equal to the mock Cache's new data
        expect(state.counts).toEqual(DATA.fakeCacheCounts)
    })

    // Will set up import items state and ensure counts are valid
    const testEstimateCounts = async () => {
        // Try to fetch ests (should invoke the ItemCreator -> DataSources to estimate counts, if cache expired)
        const counts = await state.fetchEsts()

        // Check the returned counts
        expect(counts.completed).toEqual({ h: 0, b: 0 })
        expect(counts.remaining).toEqual({
            h: DATA.histUrls.length - DATA.bmUrls.length,
            b: DATA.bmUrls.length,
        })

        // Check that those same counts are cached on the State instance's mock Cache, and also the State instance
        expect(state._cache.counts).toEqual(counts)
        expect(state.counts).toEqual(counts)
    }

    test('counts can be calculated (cache miss)', async () => {
        // Ensure cache is dirtied
        state.dirtyEsts()
        expect(state._cache.expired).toBe(true)

        await testEstimateCounts()
    })

    test('counts can be calculated (cache hit)', async () => {
        // The cache should already be filled from `fetchEsts` running before test
        expect(state._cache.expired).toBe(false)

        // Run same estimate counts test again with filled cache
        await testEstimateCounts()
    })

    test('import items can be iterated through', async () => {
        const bookmarkItemUrls = []
        const historyItemUrls = []

        // For each item in each chunk, save the URL as bookmark/history and
        for await (const { chunk } of state.fetchItems()) {
            Object.values(chunk).forEach(item => {
                if (item.type === 'h') {
                    historyItemUrls.push(item.url)
                } else {
                    bookmarkItemUrls.push(item.url)
                }
            })
        }

        expect(bookmarkItemUrls).toEqual(DATA.bmUrls)

        // Ensure we don't check the intersecting bm URLs in expected history URLs
        const histDiff = removeIntersection(DATA.histUrls, DATA.bmUrls)
        expect(historyItemUrls).toEqual(histDiff)
    })

    const checkOff = (count, type, inc = 1) => ({
        ...count,
        [type]: count[type] + inc,
    })

    async function forEachChunk(asyncCb, includeErrs = false) {
        for await (const { chunk, chunkKey } of state.fetchItems(includeErrs)) {
            const values = Object.entries(chunk)

            // Skip empty chunks
            if (!values.length) {
                continue
            }

            await asyncCb(values, chunkKey)
        }
    }

    test('import items can be removed/marked-off', async () => {
        const histDiff = removeIntersection(DATA.histUrls, DATA.bmUrls)

        // These will change as items get marked off
        let expectedCompleted = { h: 0, b: 0 }
        let expectedRemaining = { h: histDiff.length, b: DATA.bmUrls.length }

        // For the first item of chunk, remove it, recalc expected counts, then check
        await forEachChunk(async ([[itemKey, { type }]], chunkKey) => {
            await state.removeItem(chunkKey, itemKey)

            // Update our expected values (one got checked off, so +1 completed, -1 remaining)
            expectedCompleted = checkOff(expectedCompleted, type, 1)
            expectedRemaining = checkOff(expectedRemaining, type, -1)

            expect(state.counts.completed).toEqual(expectedCompleted)
            expect(state.counts.remaining).toEqual(expectedRemaining)
        })
    })

    test('import items can be flagged as errors', async () => {
        const histDiff = removeIntersection(DATA.histUrls, DATA.bmUrls)
        const flaggedUrls = []

        // Remaining will change as items get marked as errors; completed won't
        const expectedCompleted = { h: 0, b: 0 }
        let expectedRemaining = { h: histDiff.length, b: DATA.bmUrls.length }

        // For the first item of chunk, flag it, recalc expected counts, then check
        await forEachChunk(async ([[itemKey, { type, url }]], chunkKey) => {
            await state.flagItemAsError(chunkKey, itemKey)
            flaggedUrls.push(url) // Keep track of the URLs we are flagging

            // Update our expected values (one got checked off, so +1 completed, -1 remaining)
            expectedRemaining = checkOff(expectedRemaining, type, -1)

            expect(state.counts.completed).toEqual(expectedCompleted)
            expect(state.counts.remaining).toEqual(expectedRemaining)
        })

        // Do another read, storing all error'd + okay item URLs
        const errordUrls = []
        const okayUrls = []
        await forEachChunk(async (values, chunkKey) => {
            const trackingArr = chunkKey.startsWith('err')
                ? errordUrls
                : okayUrls
            trackingArr.push(...values.map(([, item]) => item.url))
        }, true)

        // Error'd URLs from the read should be the same as the ones we have been keeping track of
        //  as we've been flagging
        expect(errordUrls).toEqual(flaggedUrls)

        // There should be no intersection between okay and errord URLs
        const errordSet = new Set(errordUrls)
        let intersected = false
        okayUrls.forEach(url => {
            if (errordSet.has(url)) {
                intersected = true
            }
        })
        expect(intersected).toBe(false)
    })
})
