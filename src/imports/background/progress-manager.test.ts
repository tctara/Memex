/* eslint-env jest */

import { ImportStateManager as State } from './state-manager'
import DataSources from './data-sources'
import ItemCreator from './item-creator'
import Progress from './progress-manager'
import Processor from './item-processor'
import { ImportItem } from './types'

import * as urlLists from './url-list.test.data'
import initData, { TestData, diff } from './state-manager.test.data'

jest.mock('src/blacklist/background/interface')
jest.mock('src/util/encode-url-for-id')
jest.mock('src/activity-logger')
jest.mock('src/search')
jest.mock('./item-processor')
jest.mock('./cache')
jest.mock('./data-sources')

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

        if (DATA.allowTypes) {
            stateManager.allowTypes = DATA.allowTypes
        }
    })

    beforeEach(async () => {
        await stateManager.clearItems()
        await stateManager.fetchEsts()
    })

    const testProgress = (concurrency: number) => async () => {
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

        await promise

        const numProcessed =
            diff(DATA.histUrls, DATA.bmUrls).length + DATA.bmUrls.length

        // Observers should have been called
        expect(observer.next).toHaveBeenCalledTimes(numProcessed)
        expect(observer.complete).toHaveBeenCalledTimes(1)
    }

    test('concurrency setting 1', testProgress(1))
    test('concurrency setting 5', testProgress(5))
    test('concurrency setting 10', testProgress(10))
    test('concurrency setting 15', testProgress(15))
    test('concurrency setting 20', testProgress(20))
}

describe(
    'Import progress manager (hist: 200+, bm:30)',
    runSuite(initData(urlLists.med, urlLists.med.slice(0, 30))),
)
describe(
    'Import progress manager (hist: 30, bm:200+) - no bm intersection',
    runSuite(initData(urlLists.large.slice(0, 30), urlLists.med)),
)
describe(
    'Import progress manager (hist: 500, bm:200+) - no bm intersection',
    runSuite(initData(urlLists.large.slice(500), urlLists.med)),
)
describe(
    'Import progress manager (hist: 200+, bm:disabled)',
    runSuite(initData(urlLists.med, [], { h: true, b: false })),
)
describe(
    'Import progress manager (hist: disabled, bm:200+)',
    runSuite(initData([], urlLists.med, { h: false, b: true })),
)
describe(
    'Import progress manager (hist: disabled, bm: disabled)',
    runSuite(initData([], [], { h: false, b: false })),
)
