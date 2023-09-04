const _ = require('lodash');
const moment = require('moment');
const { ValidationError } = require('sequelize');
const createUser = require('services/users/create.js');
const createContactPreferences = require('services/contact_preferences/create.js');
const { REGISTERED_USER_MAILING_LIST } = require('services/mail/contact/constants.js');
const createMailingContact = require('services/mail/contact/create.js');
const { issueToken } = require('lib/auth.js');
const normalizeLocalizationInfo = require('lib/locale.js');
const { Sentry, sendgridMail, getEnv } = require('app/config.js');
const { errorLogger, infoLogger } = require('lib/logger.js');
const parsePhoneNumber = require('lib/parse_phone_number.js');

const buildWelcomeEmail = ({ email, firstName }) => {

  const minutesToDelay = getEnv('ENV') === 'production' ? 5 : 1;
  const welcomeEmail = {
    to: [{ email, name: firstName }],
    subject: 'Welcome to the Green Book Project!',
    from: {
      email: 'ops@thegreenbook.io',
      name: 'The Green Book Project Team',
    },
    template_id: 'd-52d23df98b814010820c5b915e2556dc',
    dynamic_template_data: {
      first_name: firstName,
    },
    sendAt: moment().add(minutesToDelay, 'minutes').unix()
  };

  return welcomeEmail;
};

const handleEmail = async ({ email, fullName, emailContactConsent = false }) => {
  const firstName = (fullName && fullName.split(' ')[0]) || 'Welcome';
  const welcomeEmail = buildWelcomeEmail({ email, firstName });

  if (emailContactConsent) {
    infoLogger('Start: Sending contact to Sendgrid');
    const sendgridResponse = await createMailingContact({
      email,
      first_name: firstName,
      mailing_list_id: REGISTERED_USER_MAILING_LIST,
    });
    infoLogger(
      // eslint-disable-next-line camelcase
      `Complete: Sending contact to Sendgrid. Job ID: ${sendgridResponse.job_id}`
    );
  } else {
    await sendgridMail.send(welcomeEmail);
  }
};

const buildUniqueViolationShortCode = validateError => {
  const invalidField = _.get(validateError, 'errors[0].path');
  const validatorKey = _.get(validateError, 'errors[0].validatorKey');

  if (validatorKey === 'not_unique') {
    if (invalidField === 'phone_number') {
      return 'phone_number_not_unique';
    }

    if (invalidField === 'email') {
      return 'email_not_unique';
    }
  }

  return null;
};

const setSignUpDeviceType = (requestHeaders) => {
  const defaultPlatformType = 'unknown';
  const platformType = _.get(requestHeaders, 'platform') || _.get(requestHeaders, 'x-platform') || defaultPlatformType;
  const acceptablePlatformTypes = ['ios', 'android', 'web'];
  if (acceptablePlatformTypes.includes(platformType.toLowerCase())) return platformType;
  return defaultPlatformType;
};

async function signUpAndAuthenticate(req, res) {
  // eslint-disable-next-line camelcase
  const { user, contact_consent } = req.body;

  const lang = _.get(req, 'headers.accept-language');
  if (_.isEmpty(user)) {
    const error = new Error(`Cannot create new user with values: ${user}`);
    Sentry.captureException(error);
    errorLogger(error.toString(), error.stack);
    res.status(400);
    return res.json({
      message: 'user info cannot be null',
      body: null,
      error: ['null_data'],
    });
  }

  let createdUser;

  const localizationInfo = normalizeLocalizationInfo({
    lang,
    locale: user.locale,
    country: user.country,
  });

  const device = setSignUpDeviceType(req.headers);
  const phoneNumber = parsePhoneNumber(user.phone_number);
  const newUserData = {
    ..._.pick(user, ['full_name', 'email', 'password']),
    ...localizationInfo,
    phone_number: phoneNumber,
    sign_up_device_type: device,
  };

  try {
    createdUser = await createUser(newUserData);
  } catch (error) {
    Sentry.captureException(error);
    errorLogger(error.toString(), error.stack);
    if (error instanceof ValidationError) {
      const uniqueViolationShortCode = buildUniqueViolationShortCode(error);
      res.status(403);
      return res.json({
        message: 'error validating user input data',
        body: null,
        error: ['validation_error', uniqueViolationShortCode],
      });
    }
  }

  if (!createdUser) {
    res.status(500);
    return res.json({
      message: 'error creating new user',
      body: null,
      error: ['internal_error'],
    });
  }

  try {
    await createContactPreferences({
      userId: createdUser.id,
      // eslint-disable-next-line camelcase
      ...contact_consent,
    });

    await handleEmail({
      email: createdUser.email,
      fullName: createdUser.full_name,
      emailContactConsent: contact_consent.email_contact_consent,
    });

  } catch (error) {
    Sentry.captureException(error);
    errorLogger(error.toString(), error.stack);
  }

  const newUser = _.omit(createdUser, ['password']);
  const token = await issueToken(newUser);
  res.status(201);
  return res.json({
    message: 'new user created',
    body: { newUser, token },
    error: null,
  });
}

module.exports = signUpAndAuthenticate;
