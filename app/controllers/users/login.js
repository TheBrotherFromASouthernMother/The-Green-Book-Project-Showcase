const omit = require('lodash/omit');
const get = require('lodash/get');
const isEmpty = require('lodash/isEmpty');
const trimEnd = require('lodash/trimEnd');
const bcrypt = require('bcrypt');
const {
  BadRequest,
  NotFound,
  Unauthorized,
  TooManyRequests,
} = require('http-errors');
const moment = require('moment');
const validator = require('validator');

const { getUser } = require('app/services/users/get.js');
const { updateLoginInfo } = require('app/services/users/update.js');
const { issueToken } = require('lib/auth.js');
const { Sentry } = require('app/config.js');
const { errorLogger } = require('lib/logger.js');
const redisUtils = require('db/redis/utils.js');
const { getPushToken } = require('app/services/push_tokens/get.js');
const { parsePhoneNumberFromString } = require('libphonenumber-js/mobile');
const { getOne: getProfilePhoto } = require('app/services/media/get.js');

const getRedisLoginAttemptKey = email => `login-attempts-${email}`;

const checkLoginAttempts = async (email, ipAddress) => {
  const key = getRedisLoginAttemptKey(email);
  const attempt = await redisUtils.hgetallAsync(key);

  return attempt && attempt.ipAddress === ipAddress ? attempt : null;
};

const setLoginAttempts = async (email, ipAddress) => {
  const key = getRedisLoginAttemptKey(email);
  const previousAttempts = await checkLoginAttempts(email, ipAddress);
  let numberOfPreviousAttempts = 0;
  if (previousAttempts) {
    numberOfPreviousAttempts = previousAttempts.attemptCount;
  }

  await redisUtils.hmsetAsync(key, {
    email,
    ipAddress,
    attemptCount: parseInt(numberOfPreviousAttempts, 10) + 1,
    timestamp: moment().toString(),
  });
  await redisUtils.expireAsync(key, 600); // 10 minutes
};

async function authenticateLogin(req) {
  const { email, phoneNumber, password } = req.body;

  const parsedPhoneNumberObject = parsePhoneNumberFromString(phoneNumber || '', 'US');
  const parsedPhoneNumber = get(parsedPhoneNumberObject, 'number');

  const isValidLogin = parsedPhoneNumber || (email && validator.isEmail(email));

  let user;
  let userQuery;

  const trimmedEmail = trimEnd(email);

  if (isValidLogin) {
    userQuery = await getUser({ email: trimmedEmail, phoneNumber: parsedPhoneNumber});
  } else {
    throw new BadRequest(
      `Invalid login from email: ${email}, phone: ${phoneNumber}`
    );
  }

  if (isEmpty(userQuery)) throw new NotFound('user not found');

  const previousLoginAttempts = await checkLoginAttempts(
    userQuery.email,
    req.ipAddress
  );

  if (
    previousLoginAttempts &&
    parseInt(previousLoginAttempts.attemptCount, 10) === 5
  ) {
    throw new TooManyRequests('too many password failures');
  }

  const passwordIsCorrect = await bcrypt.compare(password, userQuery.password);

  if (passwordIsCorrect) {
    /*
      WARNING (OJO): This line is very important. It keeps hashed passwords from being leaked to the web. Do NOT change without
      talking to me
    */
    user = omit(userQuery, ['password']);
  } else {
    await setLoginAttempts(userQuery.email, req.ipAddress);
    if (
      previousLoginAttempts &&
      parseInt(previousLoginAttempts.attemptCount, 10) === 4
    ) {
      throw new TooManyRequests('too many password failures');
    }
    throw new Unauthorized('password incorrect');
  }

  const needsVerification = !user.sms_activated;
  const token = await issueToken(user);
  await updateLoginInfo(userQuery.email);
  // eslint-disable-next-line camelcase
  const push_token = await getPushToken({ userId: userQuery.id });
  const profilePhoto = await getProfilePhoto({ userId: user.id });

  // NOTE: Prevents user from bypassing the verification check
  if (needsVerification) return {
    user: { ...user, push_token },
    token: null,
    needsVerification,
  };

  return { user: { ...user, push_token }, token, needsVerification, profile_photo: profilePhoto };
}

async function loginController(req, res) {
  try {
    const loginData = await authenticateLogin(req);
    res.status(200);
    return res.json({
      message: 'login successful',
      body: loginData,
      error: null,
    });
  } catch (err) {
    Sentry.captureException(err);
    errorLogger(err.toString(), err.stack);
    const statusCode = get(err, 'statusCode');
    let message = 'unsuccessful login';

    if (statusCode) {
      res.status(statusCode);
      ({ message } = err);
    } else {
      res.status(500);
    }
    return res.json({
      message,
      body: null,
      // eslint-disable-next-line camelcase
      error: ['internal_error'],
    });
  }
}

module.exports = loginController;
