const eventPropertyTypes = ['string', 'object', 'number', 'array'];

const events = [
  {
    name: 'review:created',
    properties: {
      id: {
        type: 'number',
        required: true,
      },
      description: {
        type: 'string',
        required: true,
      },
      isAnonymous: {
        type: 'boolean',
        required: true,
      },
      isFlagged: {
        type: 'boolean',
        required: true,
      },
      color: {
        type: 'string',
        required: true,
      },
      likeCount: {
        type: 'number',
        required: true,
      },
      userId: {
        type: 'number',
        required: true,
      },
      placeId: {
        type: 'number',
        required: true,
      },
      place_name: {
        type: 'string',
        required: true,
      },
      customFields: {
        type: 'object',
        required: false,
      },
    },
  },
  {
    name: 'mass_push_notification:requested',
    properties: {
      platform: {
        type: 'string',
        required: true,
      },
      title: {
        type: 'string',
        required: true,
      },
      subtitle: {
        type: 'string',
        required: false,
      },
      body: {
        type: 'string',
        required: true,
      },
      send_time: {
        type: 'string',
        required: true,
      },
      data: {
        type: 'string',
        required: false,
      },
      is_test: {
        type: 'boolean',
        required: false,
      },
      test_recipient_email: {
        type: 'string',
        required: false,
      },
    },
  }, {
    name: 'mass_push_notification:completed',
    properties: {
      messageId: {
        type: 'string',
        required: true,
      },
      tickets: {
        type: 'array',
        required: true,
      },
    },
  },
  {
    name: 'push_token:created',
    properties: {
      userId: {
        type: 'number',
        required: true,
      },
      value: {
        type: 'string',
        required: true,
      },
      type: {
        type: 'string',
        required: true,
      },
    },
  },
  {
    name: 'like:created',
    properties: {
      id: {
        type: 'number',
        required: true,
      },
      type: {
        type: 'string',
        required: true,
      },
      userId: {
        type: 'number',
        required: true,
      },
      reviewId: {
        type: 'number',
        required: true,
      },
    },
  },
  {
    name: 'answer:created',
    properties: {
      id: {
        type: 'number',
        required: true,
      },
      description: {
        type: 'string',
        required: true,
      },
      userId: {
        type: 'number',
        required: true,
      },
      parentId: {
        type: 'number',
        required: false,
      },
      questionId: {
        type: 'number',
        required: true,
      },
    },
  }
];

module.exports = events;
module.exports.eventPropertyTypes = eventPropertyTypes;
