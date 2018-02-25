/**
 * Save to internal storgae temporary then It'll save into Dexie
 *
 * @param {event} event
 */
async function saveToDB(params) {
    let eventLog = (await browser.storage.local.get('event_log'))['event_log']
    console.log(eventLog)

    if (eventLog === undefined) {
        eventLog = [params]
    } else {
        eventLog.push(params)
    }
    await browser.storage.local.set({ event_log: eventLog })
}

export default saveToDB
