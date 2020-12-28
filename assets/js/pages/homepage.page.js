parasails.registerPage('homepage', {
  //  ╦╔╗╔╦╔╦╗╦╔═╗╦    ╔═╗╔╦╗╔═╗╔╦╗╔═╗
  //  ║║║║║ ║ ║╠═╣║    ╚═╗ ║ ╠═╣ ║ ║╣
  //  ╩╝╚╝╩ ╩ ╩╩ ╩╩═╝  ╚═╝ ╩ ╩ ╩ ╩ ╚═╝
  data: {
    btcAddress: '',
    btcBalance: '0.0',
    btcBalanceUsd: '0.0',
    sendData: {
      destinationAddress: '',
      addressValidationClass: '',
      amountValidationClass: '',
      amount: '0.0',
      accountType: 'Email',
      currency: 'USD',
    },
    layoutData: {
      showQR: false,
      page: 'receive',
      copyAddressBtn: 'Copy address',
      sending: false
    },
    transactionData: {
      id: ''
    },
    error: ''
  },

  beforeMount: function() {
    if (window.location.href.includes('page=send')) {
      this.layoutData.page = 'send'
    }
  },
  mounted: async function(){
  },

  watch: {
    'layoutData.page': {
      handler (val) {
        if (val === 'send') {
          window.history.pushState(
            { page: 'Bento Wallet' },
            'Bento Wallet',
            '/?page=send'
          )
        } else if (window.location.href.includes('page=send')) {
          window.history.pushState(
            { page: 'Bento Wallet' },
            'Bento Wallet',
            '/'
          )
        }
      },
      deep: true,
    },

    'sendData.destinationAddress': {
      handler (val) {
        const re = /^[13mnt2][a-km-zA-HJ-NP-Z1-9]{25,34}$/
        if (re.test(val)) {
          this.sendData.accountType = 'Bitcoin'
        }
      },
      deep: true
    }
  },

  methods: {

    sendTransaction: async function() {
      if (!this.sendData.destinationAddress) this.sendData.addressValidationClass = 'input-incorrect'
      this.sendData.amountValidationClass = parseFloat(this.sendData.amount) > 0 ? '' : 'input-incorrect'
      if (!this.sendData.amountValidationClass && this.sendData.addressValidationClass === 'input-correct') {
        const conf = `You're about to send ${this.sendData.currency}${this.sendData.amount} to ${this.sendData.accountType.toLowerCase()} address ${this.sendData.destinationAddress}.\n\nIs this correct?`
        if (confirm(conf)) {
          this.layoutData.sending = true
          fetch('/api/v1/send-transaction', {
            method: 'POST',
            body: JSON.stringify({
              destinationAddress: this.sendData.destinationAddress,
              amount: this.sendData.amount,
              currency: this.sendData.currency || 'BTC',
              _csrf: window.SAILS_LOCALS._csrf
            })
          }).then(r => {
            if (r.status !== 200) {
              r.json().then(r => alert(r))
            } else {
              r.json().then(r => {
                this.layoutData.sending = false
                if (r.success === false) {
                  this.error = r.reason
                } else {
                  this.transactionData.id = r.transactionId
                  this.layoutData.page = 'sent'
                }
              })
            }
          })
        }
      }
    },

    sendMax: async function() {
      this.sendData.amount = this.sendData.currency === 'BTC' ? this.btcBalance : this.btcBalanceUsd
    },

    validateDestinationAddress: async function() {
      if (this.sendData.accountType === 'Email') {
        const re = /\S+@\S+\.\S+/
        this.sendData.addressValidationClass = re.test(this.sendData.destinationAddress) ? 'input-correct' : 'input-incorrect'
      } else {
        const re = /^[13mnt2][a-km-zA-HJ-NP-Z1-9]{25,34}$/
        this.sendData.addressValidationClass = re.test(this.sendData.destinationAddress) ? 'input-correct' : 'input-incorrect'
      }
    },

    copyToClipboard (evt, link) {
      evt.preventDefault()
      evt.stopPropagation()
      // @ts-ignore
      if (window.clipboardData && window.clipboardData.setData) {
        this.layoutData.openSnackbar = true
        // @ts-ignore
        return window.clipboardData.setData('Text', link)
      } else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
        const modalEl = document.getElementsByClassName('headline')[0]
        const textarea = document.createElement('textarea')
        textarea.textContent = link
        textarea.style.position = 'fixed'
        !modalEl ? document.body.appendChild(textarea) : modalEl.appendChild(textarea)
        textarea.select()
        try {
          return document.execCommand('copy')
        } catch (ex) {
          console.warn('Copy to clipboard failed.', ex)
          return false
        } finally {
          !modalEl ? document.body.removeChild(textarea) : modalEl.removeChild(textarea)
          this.layoutData.copyAddressBtn = 'Copied!'
          setTimeout(() => {
            this.layoutData.copyAddressBtn = 'Copy address'
          }, 2000)
        }
      }
    },

  }
});
