export default class {
    completedHistCount = 0
    completedBmCount = 0

    set limits(value) {
        this._limits = value
    }

    initData = () => Promise.resolve()

    async *createImportItems() {}
}
