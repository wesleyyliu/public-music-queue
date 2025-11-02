/**
 * WebSocket Event Names
 * Shared between client and server to ensure consistency
 */

// Queue Events - Client to Server
export const QUEUE_ADD = 'queue:add';
export const QUEUE_REMOVE = 'queue:remove';
export const QUEUE_REQUEST = 'queue:request';

// Queue Events - Server to Client
export const QUEUE_UPDATED = 'queue:updated';
export const QUEUE_ITEM_ADDED = 'queue:item_added';
export const QUEUE_ITEM_REMOVED = 'queue:item_removed';
export const QUEUE_REORDERED = 'queue:reordered';

// Voting Events - Client to Server
export const VOTE_UP = 'vote:up';
export const VOTE_DOWN = 'vote:down';
export const VOTE_REMOVE = 'vote:remove';

// Voting Events - Server to Client
export const VOTE_CHANGED = 'vote:changed';
export const VOTE_UPDATED = 'vote:updated';

// Playback Events - Client to Server
export const PLAYBACK_NEXT = 'playback:next';
export const PLAYBACK_SYNC_REQUEST = 'playback:sync:request';

// Playback Events - Server to Client
export const PLAYBACK_STARTED = 'playback:started';
export const PLAYBACK_PROGRESS = 'playback:progress';
export const PLAYBACK_ENDED = 'playback:ended';
export const PLAYBACK_SYNC = 'playback:sync';

// User Events - Client to Server
export const USER_JOIN = 'user:join';
export const USER_LEAVE = 'user:leave';
export const USER_ACTIVITY = 'user:activity';

// User Events - Server to Client
export const USERS_COUNT = 'users:count';
export const USERS_ONLINE = 'users:online';
export const USER_CONNECTED = 'user:connected';
export const USER_DISCONNECTED = 'user:disconnected';

// Chat Events (Stretch Feature) - Client to Server
export const CHAT_MESSAGE = 'chat:message';
export const CHAT_REACTION = 'chat:reaction';

// Chat Events (Stretch Feature) - Server to Client
export const CHAT_MESSAGE_RECEIVED = 'chat:message:received';
export const CHAT_REACTION_RECEIVED = 'chat:reaction:received';

// Connection Events
export const CONNECTION = 'connection';
export const DISCONNECT = 'disconnect';
export const RECONNECT = 'reconnect';
export const ERROR = 'error';

// System Events
export const SYSTEM_MESSAGE = 'system:message';
export const SYSTEM_ERROR = 'system:error';

// Export all events for easy import
export const EVENTS = {
  // Queue
  QUEUE_ADD,
  QUEUE_REMOVE,
  QUEUE_REQUEST,
  QUEUE_UPDATED,
  QUEUE_ITEM_ADDED,
  QUEUE_ITEM_REMOVED,
  QUEUE_REORDERED,
  
  // Voting
  VOTE_UP,
  VOTE_DOWN,
  VOTE_REMOVE,
  VOTE_CHANGED,
  VOTE_UPDATED,
  
  // Playback
  PLAYBACK_NEXT,
  PLAYBACK_SYNC_REQUEST,
  PLAYBACK_STARTED,
  PLAYBACK_PROGRESS,
  PLAYBACK_ENDED,
  PLAYBACK_SYNC,
  
  // Users
  USER_JOIN,
  USER_LEAVE,
  USER_ACTIVITY,
  USERS_COUNT,
  USERS_ONLINE,
  USER_CONNECTED,
  USER_DISCONNECTED,
  
  // Chat
  CHAT_MESSAGE,
  CHAT_REACTION,
  CHAT_MESSAGE_RECEIVED,
  CHAT_REACTION_RECEIVED,
  
  // Connection
  CONNECTION,
  DISCONNECT,
  RECONNECT,
  ERROR,
  
  // System
  SYSTEM_MESSAGE,
  SYSTEM_ERROR,
};

export default EVENTS;

