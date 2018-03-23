import urlList from './url-list.test.data'

// Make first 20 in list bookmarks; overlaps with history
export const bmUrls = urlList.slice(0, 20)
export const histUrls = [...urlList]

let idIt = 0

const createBrowserItem = type => url => ({ id: idIt++, url, type })

export const bookmarks = bmUrls.map(createBrowserItem('b'))
export const history = histUrls.map(createBrowserItem('h'))

export const fakeCacheCounts = {
    completed: { b: 42, h: 13 },
    remaining: { b: 1, h: 27 },
}
