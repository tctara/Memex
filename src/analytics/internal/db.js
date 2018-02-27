import Dexie from 'dexie'

const db = new Dexie('webmemex')
db.version(1).stores({
    eventlog: `timestamp, action, category`,
    eventlink: `timestamp, linkType, url`,
    eventpage: `timestamp, action_name`,
    Search: `id, count`,
    Tag: `id, count`,
})

export default db
