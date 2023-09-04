const { getReview } = require('app/services/reviews/get.js');
const { getUser } = require('app/services/users/get.js');
const { Sentry } = require('app/config.js');
const { errorLogger, infoLogger, warnLogger } = require('lib/logger.js');
const get = require('lodash/get');
const createMailingContact = require('app/services/mail/contact/create.js');
const { LIKED_REVIEWS_MAILING_LIST } = require('app/services/mail/contact/constants.js');
const { getContactPreferences } = require('app/services/contact_preferences/get.js');
const isNil = require('lodash/isNil');

/*
  Technically this module doesn't "send" a like email to the user when someone likes their review. Instead,
  it uploads the user to a Sendgrid list or segment so that we can use Sendgrid's automation feature so that we can
  get better analytics and easily control how many emails we send.
*/

module.exports = async (data, eventInfo) => {
  let eventId = null;
  let eventName = null;

  try {
    eventId = get(eventInfo, 'id', null);
    eventName = get(eventInfo, 'name', null);
    infoLogger(`EVENT ID (${eventId}): starting execution of event consumer for event: ${eventName}`);

    const review = await getReview(data.reviewId);

    if (isNil(review)) throw new Error(`cannot upload user to sendgrid automation list with non-existant review ${data.reviewId}`);

    const user = await getUser({ id: review.userId });

    if (isNil(user)) throw new Error(`cannot upload user to sendgrid automation list with missing user ${review.userId}`);

    const contactPreferences = await getContactPreferences({ userId: review.userId });

    if (!contactPreferences || !contactPreferences.email_contact_consent) {
      warnLogger(
        `EVENT ID (${eventId}): warning cannot upload user to sendgrid automation list where user contact preferences are falsely. User id: ${review.userId}`
      );
      return;
    };

    const emailContactFirstName = user.full_name.split(' ')[0];

    await createMailingContact({
      email: user.email,
      first_name: emailContactFirstName,
      mailing_list_id: LIKED_REVIEWS_MAILING_LIST,
    });
  } catch (error) {
    Sentry.captureException(error)
    errorLogger(`EVENT ID (${eventId}): ${error.toString()}`, error.stack);
  }
};
