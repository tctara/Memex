import db from './db'

/**
 * Save to internal storgae temporary then It'll save into Dexie
 *
 * @param {event} event
 */
export async function saveToDBEventLog(params) {
    console.log('Here1')
    await db.eventlog.add(params)

    const count = await db[params.category].toArray()

    await db[params.category].put({
        id: 0,
        count: count.length ? count[0].count + 1 : 1,
    })
    console.log(await db.Search.toArray())

    // let eventLog = (await browser.storage.local.get('event_log'))['event_log']

    // if (eventLog === undefined) {
    //     eventLog = [params]
    // } else {
    //     eventLog.push(params)
    // }
    // await browser.storage.local.set({ event_log: eventLog })
}

export async function saveToDBEventLink(params) {
    await db.eventlink.add(params)
    console.log(await db.eventlink.toArray())
}

export async function saveToDBEventPage(params) {
    await db.eventpage.add(params)
    console.log(await db.eventpage.toArray())
}
