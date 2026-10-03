/* ═══════════════════════════════════════════════════════════════════════
   Client-side throttle helpers — UTP Adjunct Lecture
   ═══════════════════════════════════════════════════════════════════════
   The server limits every point-earning action (and every socket event), but a
   student can still hammer a button faster than the network can answer. These
   helpers keep the browser from generating that traffic in the first place:

     createThrottledEmitter()  — per-event minimum gap + a hard cap on bursts,
                                 plus a friendly "slow down" toast
     createDebouncedEmitter()  — collapse a burst of triggers into one emit
   ═══════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  // Matches the server defaults in server.js so the browser pushes back before
  // the server has to. Override per event with createThrottledEmitter options.
  var DEFAULT_RULES = {
    'student:feedback': { gapMs: 10000, maxPerWindow: 6, windowMs: 60000, label: 'feedback' },
    'student:question': { gapMs: 15000, maxPerWindow: 5, windowMs: 60000, label: 'question' },
    'student:quiz': { gapMs: 1500, maxPerWindow: 12, windowMs: 60000, label: 'answer' },
    'student:survey': { gapMs: 1500, maxPerWindow: 12, windowMs: 60000, label: 'vote' },
  };

  function notify(message) {
    // showToast() comes from toast.js, which the pages load before this file.
    if (typeof global.showToast === 'function') global.showToast(message, 'warn');
    else console.warn('[throttle]', message);
  }

  function formatWait(ms) {
    return Math.max(1, Math.ceil(ms / 1000)) + 's';
  }

  /**
   * Minimum-gap throttle around socket.emit().
   * @param {object} socket - the socket.io client
   * @param {string} event - event name to send
   * @param {object} [options] - { gapMs, maxPerWindow, windowMs, label, quiet }
   * @returns {function} (payload) => boolean  (true when the emit went out)
   */
  function createThrottledEmitter(socket, event, options) {
    var rule = Object.assign({}, DEFAULT_RULES[event] || {}, options || {});
    var gapMs = rule.gapMs || 0;
    var maxPerWindow = rule.maxPerWindow || 0;
    var windowMs = rule.windowMs || 60000;
    var label = rule.label || 'request';

    var lastSentAt = 0;
    var sentInWindow = 0;
    var windowStart = 0;

    return function throttledEmit(payload) {
      var now = Date.now();

      if (gapMs > 0 && now - lastSentAt < gapMs) {
        if (!rule.quiet) notify('Slow down a moment — try again in ' + formatWait(gapMs - (now - lastSentAt)) + '.');
        return false;
      }

      if (maxPerWindow > 0) {
        if (now - windowStart >= windowMs) {
          windowStart = now;
          sentInWindow = 0;
        }
        if (sentInWindow >= maxPerWindow) {
          if (!rule.quiet) {
            notify('You\'ve hit the limit of ' + maxPerWindow + ' ' + label + 's for now — thanks!');
          }
          return false;
        }
        sentInWindow++;
      }

      lastSentAt = now;
      socket.emit(event, payload);
      return true;
    };
  }

  /**
   * Trailing debounce around socket.emit(): many triggers, one send.
   * Used for button-mash-prone read requests (e.g. dashboard polls).
   * @returns {function} (payload) => void
   */
  function createDebouncedEmitter(socket, event, waitMs) {
    var timer = null;
    var lastPayload;
    return function debouncedEmit(payload) {
      lastPayload = payload;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        socket.emit(event, lastPayload);
      }, waitMs || 250);
    };
  }

  global.RateLimit = {
    DEFAULT_RULES: DEFAULT_RULES,
    createThrottledEmitter: createThrottledEmitter,
    createDebouncedEmitter: createDebouncedEmitter,
  };
})(window);
