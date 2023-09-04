// Event emitter module for The Green Book Project's backend. Original intention was to build a proof-of-concept using Node's core 'events' module and later to swtich to a more durable solution using a Redis-based pub-sub queue 

const EventEmitter = require('events');
const EventDefinitions = require('app/events/event_definitions.js');
const { Sentry } = require('app/config');
const find = require('lodash/find');
const isNil = require('lodash/isNil');
const each = require('lodash/each');
const uuidv4 = require('uuid/v4');
const { errorLogger, infoLogger } = require('lib/logger.js');
const eventHandlers = require('app/events/event_handlers/index.js');

const eventEmitter = new EventEmitter();

const publishEvent = (eventName = '', eventProperties = {}) => {
  const eventId = uuidv4();
  try {
    infoLogger(
      `EVENT ID (${eventId}): attempting to publish event: ${eventName} with properties: ${JSON.stringify(eventProperties)}`
    );

    const eventDefinition = find(EventDefinitions, definition => definition.name === eventName);

    if (isNil(eventDefinition)) throw new Error(`cannot publish event ${eventName} without an event definition`);
    // Check to ensure that each

    each(eventDefinition.properties, (eventDefinitionValue, eventDefinitionKey) => {
      const eventProperty = eventProperties[eventDefinitionKey];

      if (eventDefinitionValue.required && isNil(eventProperty)) throw new Error(`cannot publish event ${eventName} with required property ${eventDefinitionKey} set to nullish value: ${eventProperty}`);

      // if event property's value type doesn't match the value type defined in event definitions, throw error
      const eventPropertyType = typeof eventProperty;

      if (eventDefinitionValue.type === 'array') {
        if (Array.isArray(eventProperty)) return;

        throw new Error(`cannot publish event ${eventName} with required property ${eventDefinitionKey} not to set to an array: ${eventPropertyType}`);
      }


      if ((eventDefinitionValue.type !== eventPropertyType) && (eventDefinitionKey !== 'customFields') && !isNil(eventProperty)) {

        throw new Error(`invalid event property value for ${eventName}, key: ${eventDefinitionKey}, invalid value: ${eventProperty}, invalid value type: ${typeof eventProperty}, property definition type ${eventDefinitionValue.type}`);
      }
    });

    eventEmitter.emit(
      eventName,
      eventProperties,
      {
        id: eventId,
        name: eventName,
        timestamp: (new Date()).toISOString()
      },
    );

    infoLogger(`EVENT ID (${eventId}): published event ${eventName.toUpperCase()} with properties: ${JSON.stringify(eventProperties)}`);
  } catch (error) {
    Sentry.captureException(error);
    errorLogger(`EVENT ID (${eventId}): ${error.toString()}`, error.stack);
  }
};


const initiate = () => {
  try {
    infoLogger('INITIATING APP EVENT EMITTER');
    eventHandlers.forEach(({ name, callback }) => eventEmitter.on(name, callback));
  } catch (error) {
    Sentry.captureException(error);
    errorLogger(error.toString(), error.stack);
  }
};

const appEventEmitter = {
  initiate,
  publish: publishEvent,
};


module.exports = appEventEmitter;
