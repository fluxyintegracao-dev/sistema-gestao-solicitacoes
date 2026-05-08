const liveUpdatesBroker = require('../services/liveUpdatesBroker');

module.exports = {
  stream(req, res) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    liveUpdatesBroker.connect({
      req,
      res,
      topics: req.query?.topics
    });
  }
};
