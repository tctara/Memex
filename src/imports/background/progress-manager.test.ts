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

        // Concurrency setting is the upper-limit for # Processor instances
        expect(progress.processors.length).toBeLessThanOrEqual(concurrency)

        await promise

        // Should all be marked as finished now (we awaited the progress to complete)
        progress.processors.forEach(proc =>
            expect(proc).toEqual({ finished: true, cancelled: false }),
        )

        // Should be called # unique inputs
        const numProcessed =
            diff(DATA.histUrls, DATA.bmUrls).length + DATA.bmUrls.length

        // Observers should have been called
        expect(observer.next).toHaveBeenCalledTimes(numProcessed)
        expect(observer.complete).toHaveBeenCalledTimes(1)
    }

    const testInterruptedProgress = (concurrency: number) => async () => {
        const observer = { complete: jest.fn(), next: jest.fn() }
        const progress = new Progress({
            stateManager,
            observer,
            concurrency,
            Processor,
        })

        const promise = progress.start()
        progress.stop() // Immediately interrupt
        await promise

        // Processors should all be marked as cancelled + unfinished now
        expect(progress.processors.length).toBeLessThanOrEqual(concurrency)
        progress.processors.forEach(proc =>
            expect(proc).toEqual({ finished: false, cancelled: true }),
        )

        // Complete observer should not have been called
        expect(observer.next).toHaveBeenCalledTimes(0)
        expect(observer.complete).toHaveBeenCalledTimes(0)
    }

    const testRestartInterruptedProgress = (
        concurrency: number,
    ) => async () => {
        const observer = { complete: jest.fn(), next: jest.fn() }
        const progress = new Progress({
            stateManager,
            observer,
            concurrency,
            Processor,
        })

        const promise = progress.start()
        progress.stop() // Immediately interrupt
        await promise
        await progress.start() // Restart and wait for completion

        // Run all the same "full progress" tests; should all pass same as if progress wasn't interrupted
        progress.processors.forEach(proc =>
            expect(proc).toEqual({ finished: true, cancelled: false }),
        )
        const numProcessed =
            diff(DATA.histUrls, DATA.bmUrls).length + DATA.bmUrls.length
        expect(observer.next).toHaveBeenCalledTimes(numProcessed)
        expect(observer.complete).toHaveBeenCalledTimes(1)
    }

    // Run some tests at diff concurrency levels
    test('full progress (1x conc.)', testProgress(1))
    test('full progress (10x conc)', testProgress(10))
    test('full progress (20x conc)', testProgress(20))
    test('interrupted progress (1x conc.)', testInterruptedProgress(1))
    test('interrupted progress (10x conc)', testInterruptedProgress(10))
    test('interrupted progress (20x conc)', testInterruptedProgress(20))
    test(
        'restart interrupted progress (1x conc)',
        testRestartInterruptedProgress(1),
    )
    test(
        'restart interrupted progress (10x conc)',
        testRestartInterruptedProgress(10),
    )
    test(
        'restart interrupted progress (20x conc)',
        testRestartInterruptedProgress(20),
    )
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
