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

    beforeEach(async () => {
        await state.clearItems()
    })

    const testInitCounts = () => {
        expect(state.counts).toEqual(
            expect.objectContaining({
                completed: { h: 0, b: 0 },
                remaining: { h: 0, b: 0 },
            }),
        )
    }

    test('counts get initiated', testInitCounts)

    test('state can get initd from cache', async () => {
        testInitCounts() // Init counts State test should pass

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
        await testEstimateCounts()

        // After running estimates once, the cache should be filled
        expect(state._cache.expired).toBe(false)

        // Run same estimate counts test again with filled cache
        await testEstimateCounts()
    })

    test('import items can be iterated through', async () => {
        await testEstimateCounts()

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

    test('import items can be removed/marked-off', async () => {
        await testEstimateCounts()

        const histDiff = removeIntersection(DATA.histUrls, DATA.bmUrls)

        // These will change as items get marked off
        let expectedCompleted = { h: 0, b: 0 }
        let expectedRemaining = { h: histDiff.length, b: DATA.bmUrls.length }

        // Go through item chunks in state, removing the first item for each chunk, ensuring counts get updated
        for await (const { chunk, chunkKey } of state.fetchItems()) {
            const values = Object.entries(chunk)

            // Skip empty chunks
            if (!values.length) {
                continue
            }

            // Remove first item of chunk
            const [[itemKey, { type }]] = values
            await state.removeItem(chunkKey, itemKey)

            // Update our expected values (one got checked off, so +1 completed, -1 remaining)
            expectedCompleted = checkOff(expectedCompleted, type, 1)
            expectedRemaining = checkOff(expectedRemaining, type, -1)

            expect(state.counts.completed).toEqual(expectedCompleted)
            expect(state.counts.remaining).toEqual(expectedRemaining)
        }
    })
})
