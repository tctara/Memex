/* eslint-env jest */

import { ImportStateManager as State } from './import-state'

jest.mock('./cache')
jest.mock('./item-creator')

describe('Import items derivation', () => {
    let state

    beforeAll(() => {
        state = new State()
    })

    beforeEach(async () => {
        await state.clearItems()
    })

    test('counts get initiated', async () => {
        expect(state.counts).toEqual(
            expect.objectContaining({
                completed: { h: 0, b: 0 },
                remaining: { h: 0, b: 0 },
            }),
        )
    })
})
