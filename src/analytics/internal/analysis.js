import db from './db'

export async function searches() {
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
}
