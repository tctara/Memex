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
        .equals('Add tag')
        .count()

    const delTags = await db.eventLog
        .where('action')
        .equals('Delete tag')
        .count()

    const filterByTags = await db.eventLog
        .where('action')
        .equals('Filter by tag')
        .count()

    const totalTagsUsed = addTags + delTags + filterByTags

    console.log({ addTags, delTags, filterByTags, totalTagsUsed })

    // Domains Filtering Analysis
    const filterByDomain = await db.eventLog
        .where('category')
        .equals('domain')
        .count()

    console.log({ filterByDomain })
}
