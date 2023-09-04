const { sendShareLinkEventHandler } = require('events/handlers/review_created/send_share_link.js');
const { updatePushNotificationSettingsHandler } = require('app/events/event_handlers/push_token_created/index.js');

const eventHandlers = [
  { name: 'review:created', callback: sendShareLinkEventHandler },
  { name: 'like:created', callback: sendLikeEmailHandler },
  // { name: 'mass_push_notification:requested', callback: scheduleMassPushNotificationEventHandler },
  // { name: 'push_token:created', callback: updatePushNotificationSettingsHandler },
  // { name: 'like:created', callback: createInAppNotificationHandler },
  // { name: 'like:created', callback: sendLikePushNotifcationHandler },
  // { name: 'answer:created', callback: sendAnswerPushNotificationHandler },
];
