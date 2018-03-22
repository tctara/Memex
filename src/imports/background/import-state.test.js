/* eslint-env jest */

import { ImportStateManager as State } from './import-state'
import DataSources from './data-sources'
import ItemCreator from './item-creator'

import * as DATA from './import-state.test.data'

jest.mock('src/blacklist/background/interface')
jest.mock('src/activity-logger')
jest.mock('src/search')
jest.mock('./cache')
jest.mock('./data-sources')

describe('Import items derivation', () => {
    let state

    beforeAll(() => {
        // Init fake data source
        const dataSources = new DataSources({
            history: DATA.history,
            bookmarks: DATA.bookmarks,
        })

        const itemCreator = new ItemCreator({ dataSources, testMode: true })
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
            h: DATA.histUrls.length,
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
        expect(historyItemUrls).toEqual(DATA.histUrls)
    })

    test('import items can be removed/marked-off', async () => {
        await testEstimateCounts()

        const itemsChunkIterable = state.fetchItems()

        // Remove the first item of first chunk (should be bookmarks)
        const { value: valA } = await itemsChunkIterable.next()
        await state.removeItem(valA.chunkKey, Object.keys(valA.chunk)[0])

        // Counts should have changed (-1 bookmark)
        expect(state.counts.completed).toEqual({ h: 0, b: 1 })
        expect(state.counts.remaining).toEqual({
            h: DATA.histUrls.length,
            b: DATA.bmUrls.length - 1,
        })

        // Remove the first item of first chunk (should be history)
        const { value: valB } = await itemsChunkIterable.next()
        await state.removeItem(valB.chunkKey, Object.keys(valB.chunk)[0])

        // Counts should have changed (-1 hist)
        expect(state.counts.completed).toEqual({ h: 1, b: 1 })
        expect(state.counts.remaining).toEqual({
            h: DATA.histUrls.length - 1,
            b: DATA.bmUrls.length - 1,
        })
    })
})
