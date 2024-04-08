const millisecondsToTime = (milliseconds) => {
    const seconds = Number(milliseconds / 1000);
    
    let h = Math.floor(seconds / 3600)
    let m = Math.floor(seconds % 3600 / 60)
    let s = Math.floor(seconds % 3600 % 60)
    let ms = Math.floor(milliseconds % 1000)

    h = h > 0 ? h + 'h' : ''
    m = m > 0 ? m + 'm' : ''
    s = s > 0 ? s + 's' : ''
    ms = ms + 'ms'
    return [h, m, s, ms].filter(v => !!v).join(' ')
}

class Timer {
    timestamps = new Map()

    start (label) {
        this.timestamps.set(label, Date.now())
    }

    since (label) {
        if (!this.timestamps.has(label)) {
            throw new Error(`Timer ${label} does not exist`)
        }

        return Date.now() - this.timestamps.get(label)
    }

    end (label) {
        const time = this.since(label)
        this.timestamps.delete(label)

        return time
    }
}

export { millisecondsToTime, Timer }