let audio: HTMLAudioElement | null = null
let unlockAttempted = false

function getAudio() {
    if (typeof window === 'undefined') return null
    if (!audio) {
        audio = new Audio('/sounds/new-order.wav')
        audio.preload = 'auto'
        audio.volume = 0.72
    }
    return audio
}

export function unlockOrderSound() {
    if (unlockAttempted || typeof window === 'undefined') return
    unlockAttempted = true
    const player = getAudio()
    if (!player) return
    // Loading the audio during a user gesture is enough to prepare it. Calling
    // play() here can leak a sound during navigation even when no order arrived.
    player.load()
}

export async function playOrderSound() {
    const player = getAudio()
    if (!player) return false
    try {
        player.currentTime = 0
        await player.play()
        return true
    } catch {
        return false
    }
}

export function stopOrderSound() {
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
}
