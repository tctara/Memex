import docuri from 'docuri'

import randomString from 'src/util/random-string'
import { generateVisitDocId } from 'src/activity-logger'

// Bookmarks related utility functions (TODO: Find appropriate space for this to live)
export const bookmarkKeyPrefix = 'bookmark/'
export const bookmarkDocsSelector = { _id: { $gte: bookmarkKeyPrefix, $lte: `${bookmarkKeyPrefix}\uffff` } }
export const convertBookmarkDocId = docuri.route(`${bookmarkKeyPrefix}:timestamp/:nonce`)
export const generateBookmarkDocId = ({
    timestamp = Date.now(),
    nonce = randomString(),
} = {}) => convertBookmarkDocId({ timestamp, nonce })

/**
 * Converts a browser.history.VisitItem to our visit document model.
 *
 * @param {history.VisitItem} visitItem The VisitItem fetched from browser API.
 * @param {IPageDoc} assocPageDoc The page doc that contains the page data for this visit.
 * @returns {IVisitDoc} Newly created visit doc dervied from visitItem data.
 */
export const transformToVisitDoc = assocPageDoc => visitItem => ({
    _id: generateVisitDocId({
        timestamp: visitItem.visitTime,
        // We set the nonce manually, to prevent duplicating items if
        // importing multiple times (thus making importHistory idempotent).
        nonce: visitItem.visitId,
    }),
    visitStart: visitItem.visitTime,
    referringVisitItemId: visitItem.referringVisitId,
    url: assocPageDoc.url,
    page: { _id: assocPageDoc._id },
})

/**
 * Converts a browser.bookmark.BookmarkTreeNode item to our bookmark document model.
 *
 * @param {bookmarks.BookmarkTreeNode} bookmarkItem The bookmark tree node item fetched from browser API.
 * @param {IPageDoc} assocPageDoc The page doc that contains the page data for this bookmark.
 * @returns {IBookmarkDoc} Newly created bookmark doc dervied from bookmarkItem data.
 */
export const transformToBookmarkDoc = assocPageDoc => bookmarkItem => ({
    _id: generateBookmarkDocId({
        timestamp: bookmarkItem.dateAdded,
        nonce: bookmarkItem.id,
    }),
    dateAdded: bookmarkItem.dateAdded,
    title: bookmarkItem.title,
    url: bookmarkItem.url,
    page: { _id: assocPageDoc._id },
})