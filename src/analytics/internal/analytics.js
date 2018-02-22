class Analytics {
    /**
     * Save to db
     * @param {any} params
     * @return {Promise<boolean>}
     */
    _saveToDB = params => {}

    /**
     * Track any user-invoked events internally.
     *
     * @param {EventTrackInfo} eventArgs
     */
    async trackEvent(eventArgs) {
        console.log(eventArgs)
        const params = {
            category: eventArgs.category,
            action: eventArgs.action,
            timestamp: Date.now(),
        }
        await this._saveToDB(params)
    }
}

export default Analytics
