export default class ItemProcessor {
    finished = false
    cancelled = false

    process(item) {
        return Promise.resolve()
    }

    cancel() {
        this.cancelled = true
    }
}
