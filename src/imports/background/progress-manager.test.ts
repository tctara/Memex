/* eslint-env jest */

import { ImportStateManager as State } from './state-manager'
import DataSources from './data-sources'
import ItemCreator from './item-creator'
import Progress from './progress-manager'
import Processor from './item-processor'
import { ImportItem } from './types'

import * as urlLists from './url-list.test.data'
import initData, { TestData } from './state-manager.test.data'

jest.mock('src/blacklist/background/interface')
jest.mock('src/util/encode-url-for-id')
jest.mock('src/activity-logger')
jest.mock('src/search')
jest.mock('./item-processor')
jest.mock('./cache')
jest.mock('./data-sources')

jest.useFakeTimers()

const runSuite = (DATA: TestData) => async () => {
    let stateManager

    beforeAll(() => {
        // Init fake data source
        const dataSources = new DataSources({
            history: DATA.history,
            bookmarks: DATA.bookmarks,
        })

        const itemCreator = new ItemCreator({ dataSources })
        stateManager = new State({ itemCreator })
    })

    beforeEach(async () => {
        await stateManager.clearItems()
        await stateManager.fetchEsts()
    })

    const testProgress = async (concurrency: number) => {
        const observer = { complete: jest.fn(), next: jest.fn() }
        const progress = new Progress({
            stateManager,
            observer,
            concurrency,
            Processor,
        })

        expect(progress.stopped).toBe(true)
        const promise = progress.start()
        expect(progress.stopped).toBe(false)

        // item-processor mock should set up the fake `setTimeouts`, which this will force complete
        jest.runAllTimers()

        // Observers should have been called these amount of times
        expect(observer.next).toHaveBeenCalledTimes(concurrency)
        expect(observer.complete).toHaveBeenCalledTimes(1)

        return promise
    }

    test('concurrency setting ', async () => {
        await testProgress(1)
    })
}

describe(
    'Import progress manager (hist: 1000+, bm:200+) - no bm intersection',
    runSuite(initData(urlLists.large.slice(0, 10), [])),
)
