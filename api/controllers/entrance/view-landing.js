module.exports = {


  friendlyName: 'View landing',


  description: 'Display "Landing" page.',


  exits: {

    success: {
      viewTemplatePath: 'pages/landing',
    },

    redirect: {
      description: 'The requesting user is already logged in.',
      responseType: 'redirect'
    }

  },


  fn: async function () {

    return {landing: true};

  }


};
