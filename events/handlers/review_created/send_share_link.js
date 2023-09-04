const { errorLogger, infoLogger } = require('lib/logger.js');
const { Sentry, sendgridClient, getEnv } = require('app/config');
const { getUser } = require('app/services/users/get.js');
const { getContactPreferences } = require('app/services/contact_preferences/get.js');
const get = require('lodash/get');
const isEmpty = require('lodash/isEmpty');
const {
  REVIEW_CREATORS_MAILING_LIST,
  SENDGRID_CONTACT_CUSTOM_FIELDS,
} = require('app/services/mail/contact/constants.js');
const url = require('url');

const buildReviewShareLink = (reviewId) => {
  const NODE_ENV = getEnv('NODE_ENV');

  if (NODE_ENV === 'development') {
    const port = getEnv('PORT');

    return url.format({
      port,
      protocol: 'http',
      hostname: 'localhost',
      pathname: `review/${reviewId}`,
      query: {
        utm_source: 'sendgrid',
        utm_medium: 'email',
        utm_campaign: 'review_creator_journey',
      },
    });
  }

  return url.format({
    protocol: 'https',
    hostname: 'www.thegreenbookproject.io',
    pathname: `review/${reviewId}`,
    query: {
      utm_source: 'sendgrid',
      utm_medium: 'email',
      utm_campaign: 'review_creator_journey',
    },
  });
};

module.exports = async (data, eventInfo) => {
  let eventId = null;
  let eventName = null;

  try {
    eventId = get(eventInfo, 'id', null);
    eventName = get(eventInfo, 'name', null);
    infoLogger(`EVENT ID (${eventId}): starting execution of event consumer for event: ${eventName}`);

    if (isEmpty(data)) throw new Error(`malformed event consumed for review_created consumer. EVENT ID (${eventId})`);

    const reviewCreator = await getUser({ id: data.userId });

    if (isEmpty(reviewCreator)) {
      throw new Error(`no matching user found for review. reviewId: ${data.id}, userId: ${data.userId}`)
    }

    const contactPreferences = await getContactPreferences({ userId: reviewCreator.id });
    const emailContactConsent = get(contactPreferences, 'email_contact_consent', false);

    if (!emailContactConsent) {
      infoLogger(`EVENT ID (${eventId}): contact not uploaded to sendgrid. Reason: email_contact_consent=${emailContactConsent}`)
      return;
    }

    const firstName = reviewCreator.full_name.split(' ')[0];
    const reviewShareLink = buildReviewShareLink(data.id);

    const sendgridParams ={
      method: 'PUT',
      url: '/v3/marketing/contacts',
      body: {
        list_ids: [REVIEW_CREATORS_MAILING_LIST],
        contacts: [
          {
            email: reviewCreator.email,
            first_name: firstName,
            custom_fields: {
              // Solution: https://github.com/sendgrid/sendgrid-nodejs/issues/953
              [SENDGRID_CONTACT_CUSTOM_FIELDS[0].id]: 'yes',
              [SENDGRID_CONTACT_CUSTOM_FIELDS[1].id]: data.id,
              [SENDGRID_CONTACT_CUSTOM_FIELDS[2].id]: reviewShareLink,
            },
          },
        ],
      },
    };

    const response = await sendgridClient.request(sendgridParams);
    const statusCode = get(response, '[0].statusCode');
    const sendgridJobId = get(response, '[0].body.job_id');

    infoLogger(`EVENT ID (${eventId}): contact uploaded to sendgrid list ${REVIEW_CREATORS_MAILING_LIST}`);
    infoLogger(`EVENT ID (${eventId}): sendgrid contact upload status code ${statusCode}, sendgrid job id: ${sendgridJobId}`)

    infoLogger(`EVENT ID (${eventId}): finished execution of event consumer for event: ${eventName}`);
  } catch (error) {
    Sentry.captureException(error);
    errorLogger(`EVENT ID (${eventId}): ${error.toString()}`, error.stack);
  }
};
