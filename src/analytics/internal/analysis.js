import db from './db'

export async function searches() {
    // Search Analysis
    const totalSearches = await db.eventLog
        .where('category')
        .equals('Search')
        .count()
    const unsuccessfulSearches = await db.eventLog
        .where('action')
        .startsWith('Unsuccessful search')
        .count()
    const successfulSearches = totalSearches - unsuccessfulSearches
    const popupSearches = await db.eventLog
        .where('action')
        .equals('Popup search')
        .count()

    console.log({
        totalSearches,
        unsuccessfulSearches,
        successfulSearches,
        popupSearches,
    })

    // Tagging Analysis
    const addTags = await db.eventLog
        .where('action')
        .equals('Add Tag')
        .count()

    const delTags = await db.eventLog
        .where('action')
        .equals('Delete Tag')
        .count()

    const filterByTags = await db.eventLog
        .where('action')
        .equals('Filter by Tag')
        .count()

    const totalTagsUsed = addTags + delTags + filterByTags

    console.log({ addTags, delTags, filterByTags, totalTagsUsed })
}
