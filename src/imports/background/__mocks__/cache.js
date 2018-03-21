import { mapToObject } from 'src/util/map-set-helpers'

export default class Cache {
    static INIT_ESTS = {
        calculatedAt: 0,
        completed: { b: 0, h: 0 },
        remaining: { b: 0, h: 0 },
    }

    expired = true
    chunks = []
    errChunks = []

    counts = {
        completed: { ...Cache.INIT_ESTS.completed },
        remaining: { ...Cache.INIT_ESTS.remaining },
    }

    persistItems(data) {
        this.chunks.push(mapToObject(data))
    }

    async *getItems(includeErrs = false) {
        for (const chunkKey in this.chunks) {
            yield { chunkKey, chunk: this.chunks[chunkKey] }
        }

        if (includeErrs) {
            for (const chunkKey in this.errChunks) {
                yield { chunkKey, chunk: this.errChunks[chunkKey] }
            }
        }
    }

    async removeItem(chunkKey, itemKey) {
        const { [itemKey]: toRemove, ...remaining } = this.chunks[chunkKey]
        this.chunks[chunkKey] = remaining
        return toRemove
    }

    async flagItemAsError(itemKey, item) {}

    async clear() {
        this.expired = true
        this.chunks = []
        this.errChunks = []
    }
}
