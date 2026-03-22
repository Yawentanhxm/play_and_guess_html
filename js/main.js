document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    window._gameInstance = game;  // 暴露给 room.js 使用
    // 页面一加载完就预加载 MIDI，单人/多人都能立即使用
    game.preloadSongs();
});
