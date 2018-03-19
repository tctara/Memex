import moment from 'moment'

export default class ImportDataSources {
    static LOOKBACK_WEEKS = 12 // Browser history is limited to the last 3 months

    /**
     * @param {number} startTime The time to start search from for browser history.
     * @param {number} [endTime=Date.now()] The time to end search from for browser history.
     * @param {number} [limit=999999] The limit to number of items to return
     * @returns {Array<browser.history.HistoryItem>} All history items in browser.
     */
    _fetchHistItems = ({ startTime, endTime = Date.now(), limit = 999999 }) =>
        browser.history.search({
            text: '',
            maxResults: limit,
            startTime,
            endTime,
        })

    async *history() {
        // Get all history from browser (last 3 months), filter on existing DB pages
        const baseTime = moment().subtract(
            ImportDataSources.LOOKBACK_WEEKS,
            'weeks',
        )

        // Fetch and filter history in week batches to limit space
        for (
            let time = moment();
            time.isAfter(baseTime);
            time.subtract(1, 'week')
        ) {
            yield this._fetchHistItems({
                startTime: moment(time)
                    .subtract(1, 'week')
                    .valueOf(),
                endTime: time.valueOf(),
            })
        }
    }

    /**
     * Recursively traverses BFS-like from the specified node in the BookmarkTree,
     * yielding the transformed bookmark ImportItems at each dir level.
     *
     * @generator
     * @param {browser.BookmarkTreeNode} dirNode BM node representing a bookmark directory.
     * @param {(items: browser.BookmarkTreeNode[]) => Map<string, ImportItem>} filter
     * @yields {Map<string, ImportItem>} Bookmark items in current level.
     */
    async *bookmarks(dirNode) {
        // Folders don't contain `url`; recurse!
        const children = await browser.bookmarks.getChildren(dirNode.id)

        // Split into folders and bookmarks
        const childGroups = children.reduce(
            (prev, childNode) => {
                const stateKey = !childNode.url ? 'dirs' : 'bms'

                return {
                    ...prev,
                    [stateKey]: [...prev[stateKey], childNode],
                }
            },
            { dirs: [], bms: [] },
        )

        yield childGroups.bms

        // Recursively process next levels (not expected to get deep)
        for (const dirNode of childGroups.dirs) {
            yield* this.bookmarks(dirNode)
        }
    }
}
