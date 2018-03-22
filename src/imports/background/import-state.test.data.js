export const bmUrls = [
    'https://example.com',
    'https://example.com/test',
    'https://example.com/another-one',
    'https://test.com',
    'https://test.com/test',
    'https://test.com/another-one',
]

export const histUrls = [
    'https://google.com',
    'https://google.com/test',
    'https://google.com/?q=dogs',
    'https://google.com/images',
    'https://google.com/cool-stuff',
]

let idIt = 0

const createBrowserItem = type => url => ({ id: idIt++, url, type })

export const bookmarks = bmUrls.map(createBrowserItem('b'))
export const history = [...bmUrls, ...histUrls].map(createBrowserItem('h'))

export const fakeCacheCounts = {
    completed: { b: 42, h: 13 },
    remaining: { b: 1, h: 27 },
}
