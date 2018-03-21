import moment from 'moment'

export default class ImportDataSources {
    static LOOKBACK_WEEKS = 12 // Browser history is limited to the last 3 months

    static DEF_HIST_PARAMS = {
        text: '',
        maxResults: 999999,
    }

    _createHistParams = time => ({
        ...ImportDataSources.DEF_HIST_PARAMS,
        endTime: time,
        startTime: moment(time)
            .subtract(1, 'week')
            .valueOf(),
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
            yield browser.history.search(this._createHistParams(time.valueOf()))
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
