import {
    saveToDBEventLog,
    saveToDBEventLink,
    saveToDBEventPage,
} from './eventLog'

class Analytics {
    /**
     * Save to db
     * @param {any} params
     * @return {Promise<boolean>}
     */
    _saveToDB = async params => {
        const event = {
            ...params,
            timestamp: Date.now(),
        }

        if (params.category) await saveToDBEventLog(event)
        if (params.url) await saveToDBEventLink(event)
        if (params.action_name) await saveToDBEventPage(event)
    }

    /**
     * Track any user-invoked events internally.
     *
     * @param {EventTrackInfo} eventArgs
     */
    async trackEvent(eventArgs) {
        const params = {
            category: eventArgs.category,
            action: eventArgs.action,
        }
        await this._saveToDB(params)
    }

    /**
     * Track user link clicks.
     *
     * @param {LinkTrackInfo} linkArgs
     */
    async trackLink({ linkType, url }) {
        const params = linkType === 'link' ? { link: url } : { download: url }
        return this._saveToDB({ ...params, url })
    }

    /**
     * Track user page visits.
     *
     * @param {string} args.title The title of the page to track
     */
    async trackPage({ title }) {
        return this._saveToDB({ action_name: encodeURIComponent(title) })
    }
}

export default Analytics
