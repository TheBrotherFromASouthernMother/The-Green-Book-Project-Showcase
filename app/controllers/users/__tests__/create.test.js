const createUser = require('app/services/users/create.js');
const createContactPreferences = require('app/services/contact_preferences/create.js');
const createMailingContact = require('app/services/mail/contact/create.js');
const { issueToken } = require('lib/auth.js');
const { Sentry, sendgridMail} = require('app/config.js');
const { errorLogger, infoLogger } = require('lib/logger.js');
const { ValidationError, ValidationErrorItem } = require('sequelize');
const { REGISTERED_USER_MAILING_LIST } = require('app/services/mail/contact/constants.js');
const signup = require('app/controllers/users/create.js');

jest.mock('app/services/users/create.js');
jest.mock('app/services/contact_preferences/create.js');
jest.mock('app/services/mail/contact/create.js');
jest.mock('lib/auth.js', () => ({ issueToken: jest.fn() }));
jest.mock('app/config.js', () => ({
  Sentry: { captureException: jest.fn() },
  sendgridMail: { send: jest.fn() },
  getEnv: () => 'production',
}));
jest.mock('lib/logger.js', () => ({ errorLogger: jest.fn(), infoLogger: jest.fn() }));


const userEmail = 'christian@thegreenbook.io';
const userPhoneNumber = '+some_valid_phone_number';
const userFirstName = 'Erik';
const userFullName = `${userFirstName} Stevens`;
const userId = 5905;

describe('signup', () => {
  let request;
  let response;

  beforeEach(() => {
    request = {
      headers: {
        'accept-language': 'en',
        platform: 'ios',
        'x-platform': 'ios',
      },
      body: {
        user: {
          email: userEmail,
          password: 'P@ssword1234',
          phone_number: userPhoneNumber,
          full_name: userFullName,
        },
        contact_consent: {
          email_contact_consent: true,
          email_contact_consent_text:
            "Please join our mailing list, we're desperate",
          sms_contact_consent: true,
          sms_contact_consent_text:
            "We're using this phone number to verify your account",
        },
      },
    };

    response = {
      status: jest.fn(),
      json: jest.fn(),
    };
  });

  describe('when the user data is empty', () => {
    let error;

    beforeEach(() => {
      request.body.user = null;
      error = new Error('Cannot create new user with values: null');
    });

    it('reports an error to Sentry', async () => {
      await signup(request, response);
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('logs the error', async () => {
      await signup(request, response);
      expect(errorLogger).toHaveBeenCalledWith(error.toString(), expect.any(String));
    });

    it('sets the response status to 400', async () => {
      await signup(request, response);
      expect(response.status).toHaveBeenCalledWith(400);
    });

    it('returns a response object with the correct parameters', async () => {
      await signup(request, response);
      expect(response.json).toHaveBeenCalledWith({
        message: 'user info cannot be null',
        body: null,
        error: ['null_data'],
      });
    });
  });

  it('calls the user createUser function with the correct fields', async () => {
    request.headers['accept-language'] = undefined;
    await signup(request, response);
    expect(createUser).toHaveBeenCalledWith({
      email: userEmail,
      password: 'P@ssword1234',
      phone_number: 'some_valid_phone_number',
      full_name: userFullName,
      locale: 'en-US',
      country_code: 'US',
      sign_up_device_type: 'ios',
    });
  });

  describe('when there is a validation error creating the user', () => {
    let validationError;

    beforeEach(() => {
      const validationErrorItem = new ValidationErrorItem(
        'email must be unique',
        'unique violation',
        'email',
        'christian@thegreenbook.io',
        'not_unique',
        'not_unique',
      );
      validationError = new ValidationError();
      validationError.errors = [validationErrorItem];
      createUser.mockRejectedValue(validationError);
    });

    it('reports the error to Sentry', async () => {
      await signup(request, response);
      expect(Sentry.captureException).toHaveBeenCalledWith(validationError);
    });

    it('logs the error', async () => {
      await signup(request, response);
      expect(errorLogger).toHaveBeenCalledWith(validationError.toString(), expect.any(String));
    });

    it('set the response status to 403', async () => {
      await signup(request, response);
      expect(response.status).toHaveBeenCalledWith(403);
    });

    it('returns a response object with the correct message', async () => {
      await signup(request, response);
      expect(response.json).toHaveBeenCalledWith({
        message: 'error validating user input data',
        body: null,
        error: ['validation_error', 'email_not_unique'],
      });
    });
  });

  describe('when the new user record is null', () => {
    it('sets the response status to 500', async () => {
      createUser.mockResolvedValue(null);
      await signup(request, response);
      expect(response.status).toHaveBeenCalledWith(500);
    });

    it('returns a json response object with the message error creating new user', async () => {
      createUser.mockResolvedValue(null);
      await signup(request, response);
      expect(response.json).toHaveBeenCalledWith({
        message: 'error creating new user',
        body: null,
        error: ['internal_error'],
      });
    });
  });

  describe('when the user has been sucessfully created', () => {
    beforeEach(() => {
      createContactPreferences.mockResolvedValue({});
      sendgridMail.send.mockResolvedValue({});
      createUser.mockResolvedValue({
        id: userId,
        email: 'christian@thegreenbook.io',
        password: 'somehashedpaswword',
        phone_number: '+some_valid_phone_number',
        full_name: 'Erik Stevens',
      });
      issueToken.mockResolvedValue('jwt token');
    });

    it('creates the users contact preferences', async () => {
      await signup(request, response);
      expect(createContactPreferences).toHaveBeenCalledWith({
        userId,
        email_contact_consent: true,
        email_contact_consent_text:
          "Please join our mailing list, we're desperate",
        sms_contact_consent: true,
        sms_contact_consent_text:
          "We're using this phone number to verify your account",
      });
    });

    describe('when the user has consented to marketing emails', () => {
      const jobId = 'Xb61fU-7targz';

      beforeEach(() => {
        createMailingContact.mockResolvedValue({
          statusCode: 202,
          job_id: jobId,
        });
      });

      it('logs a message showing that a contact is about to be uploaded to sendgrid', async () => {
        await signup(request, response);
        expect(infoLogger).toHaveBeenCalledWith('Start: Sending contact to Sendgrid');
      });

      it('adds the user to a marketing mailing list', async () => {
        await signup(request, response);
        expect(createMailingContact).toHaveBeenCalledWith({
          email: userEmail,
          first_name: userFirstName,
          mailing_list_id: REGISTERED_USER_MAILING_LIST
        })
      });

      it('logs that the request was successfull and the sendgrid job id', async () => {
        await signup(request, response);
        expect(infoLogger).toHaveBeenCalledWith(`Complete: Sending contact to Sendgrid. Job ID: ${jobId}`);
      });
    });

    describe('when the user has NOT consented to marketing emails', () => {
      beforeEach(() => {
        request.body.contact_consent.email_contact_consent = false;
      });

      it('sends a transactional welcome email through sendgrid', async () => {
        await signup(request, response);
        expect(sendgridMail.send).toHaveBeenCalledWith({
          to: [{ email: userEmail, name: userFirstName }],
          subject: 'Welcome to the Green Book Project!',
          from: {
            email: 'ops@thegreenbook.io',
            name: 'The Green Book Project Team',
          },
          template_id: 'd-52d23df98b814010820c5b915e2556dc',
          dynamic_template_data: {
            first_name: userFirstName,
          },
          sendAt: expect.any(Number),
        });
      });
    });


    it('sets the response status to 201', async () => {
      await signup(request, response);
      expect(response.status).toHaveBeenCalledWith(201);
    });


    it('returns a json response containing the new user data (without the password) and an authentication token', async () => {
      await signup(request, response);
      expect(response.json).toHaveBeenCalledWith({
        message: 'new user created',
        body: {
          newUser: {
            id: userId,
            email: userEmail,
            phone_number: userPhoneNumber,
            full_name: userFullName,
          },
          token: 'jwt token',
        },
        error: null,
      });
    });
  });
});
