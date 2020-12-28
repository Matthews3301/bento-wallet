module.exports = {


  friendlyName: 'Login',


  description: 'Log in using the provided email and password combination.',


  extendedDescription:
`This action attempts to look up the user record in the database with the
specified email address.  Then, if such a user exists, it uses
bcrypt to compare the hashed password from the database with the provided
password attempt.`,


  inputs: {

    emailAddress: {
      description: 'The email to try in this attempt, e.g. "irl@example.com".',
      type: 'string',
      required: true
    },

    password: {
      description: 'The unencrypted password to try in this attempt, e.g. "passwordlol".',
      type: 'string',
      required: true
    },

    rememberMe: {
      description: 'Whether to extend the lifetime of the user\'s session.',
      extendedDescription:
`Note that this is NOT SUPPORTED when using virtual requests (e.g. sending
requests over WebSockets instead of HTTP).`,
      type: 'boolean'
    }

  },


  exits: {

    success: {
      description: 'The requesting user agent has been successfully logged in.',
    },

    badCombo: {
      description: `The provided email and password combination does not
      match any user in the database.`,
      responseType: 'unauthorized'
      // ^This uses the custom `unauthorized` response located in `api/responses/unauthorized.js`.
      // To customize the generic "unauthorized" response across this entire app, change that file
      // (see api/responses/unauthorized).
      //
      // To customize the response for _only this_ action, replace `responseType` with
      // something else.  For example, you might set `statusCode: 498` and change the
      // implementation below accordingly (see http://sailsjs.com/docs/concepts/controllers).
    }

  },


  fn: async function ({emailAddress, password}) {

    const newEmailAddress = emailAddress.toLowerCase();
    var userRecord = await User.findOne({
      emailAddress: newEmailAddress,
    });

    if (!userRecord) {

      const { address, publicKey, mnemonic, wif } = await sails.helpers.createAddress()

      var newUserRecord = await User.create(_.extend({
        emailAddress: newEmailAddress,
        password: await sails.helpers.passwords.hashPassword(password),
        bitcoinData: {
          btcAddress: address,
          btcPublicKey: publicKey,
          btcPrivateWif: wif,
          btcMnemonic: mnemonic,
          btcBalance: 0,
          btcLast: Date.now()
        },
        tosAcceptedByIp: this.req.ip
      }, sails.config.custom.verifyEmailAddresses? {
        emailProofToken: await sails.helpers.strings.random('url-friendly'),
        emailProofTokenExpiresAt: Date.now() + sails.config.custom.emailProofTokenTTL,
        emailStatus: 'unconfirmed'
      }:{}))
        .intercept('E_UNIQUE', 'emailAlreadyInUse')
        .intercept({name: 'UsageError'}, 'invalid')
        .fetch()

      if (sails.config.custom.verifyEmailAddresses) {
        // Send "confirm account" email
        await sails.helpers.sendTemplateEmail.with({
          to: newEmailAddress,
          subject: 'Please confirm your account',
          template: 'email-verify-account',
          templateData: {
            token: newUserRecord.emailProofToken
          }
        })
      } else {
        sails.log.info('Skipping new account email verification... (since `verifyEmailAddresses` is disabled)')
      }

      this.req.session.userId = newUserRecord.id

      await sails.helpers.sendTemplateEmail.with({
        to: newEmailAddress,
        subject: 'Here are the details of your Bento Wallet',
        template: 'email-new-account',
        templateData: {
          mnemonic: mnemonic.split(' ')
        }
      })

    } else {
      await sails.helpers.passwords.checkPassword(password, userRecord.password)
        .intercept('incorrect', 'badCombo');

      if (this.req.isSocket) {
        sails.log.warn(
          'Received `rememberMe: true` from a virtual request, but it was ignored\n'+
          'because a browser\'s session cookie cannot be reset over sockets.\n'+
          'Please use a traditional HTTP request instead.'
        );
      } else {
        this.req.session.cookie.maxAge = sails.config.custom.rememberMeCookieMaxAge;
      }

      this.req.session.userId = userRecord.id
    }

  }

};
