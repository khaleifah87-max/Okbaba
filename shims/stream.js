/**
 * Stub for Node.js 'stream' module.
 * The ws package used by @supabase/realtime-js requires this, but in React Native
 * the native WebSocket is used directly, so ws (and its stream dependency) are never
 * actually called at runtime.
 */
'use strict';

class Duplex {}
class Readable {}
class Writable {}
class Transform {}
class PassThrough {}
class Stream {}

module.exports = {
  Duplex,
  Readable,
  Writable,
  Transform,
  PassThrough,
  Stream,
};