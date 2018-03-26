export default class {
    finished = false
    cancelled = false

    process(item) {
        return new Promise(res =>
            setTimeout(() => res({ status: 'Success' }), 10),
        )
    }

    cancel() {
        this.cancelled = true
    }
}
