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
        expect(state.counts).toEqual(
            expect.objectContaining({ ...DATA.fakeCacheCounts }),
        )
    })

    const testEstimateCounts = async () => {
        // Try to fetch ests (should invoke the ItemCreator -> DataSources to estimate counts, if cache expired)
        const counts = await state.fetchEsts()

        // Check the returned counts
        expect(counts.completed).toEqual({ h: 0, b: 0 })
        expect(counts.remaining).toEqual({
            h: DATA.histUrls.length,
            b: DATA.bmUrls.length,
        })

        // Check that those same counts are cached on the State instance's mock Cache
        expect(state._cache.counts).toEqual({ ...counts })
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
})
