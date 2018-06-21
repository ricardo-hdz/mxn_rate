'use strict';

// Create specific endpoint
const ENDPOINT_RATES = 'http://www.apilayer.net/api/live?access_key=6e36ba1b01cf1b5c6ce5867f5a02dc8b&source=USD&currencies=MXN&format=1';

const Alexa = require('ask-sdk');
const rp = require('request-promise');

let skill;
let lastTimestamp = null;
let lastRate = null;

const cardName = 'MXN Exchange Rate';
const intentName = 'ExchangeIntent';

let requestOptions = {
    method: 'GET',
    uri: ENDPOINT_RATES,
    headers: {
        'content-type': 'application/json'
    },
    json: true,
    resolveWithFullResponse: false
};

async function getData() {
    return rp(requestOptions)
        .then(function(response) {
            return response;
        })
        .catch(function(error) {
            console.log(`Error while retrieving exchange rate: ${error}`);
            return err;
        });
}

async function getCurrentExchangeRate() {
    // if data is fresh dont request
    let fresh = isFresh();
    console.log(`Is data fresh ${fresh}`);

    if (fresh) {
        return `The current MXN to USD exchange rate is: ${lastRate}`;
    }

    let data = await getData();
    if (data && data.success === true) {
        let rate = data.quotes.USDMXN;
        rate = Number.parseFloat(rate).toFixed(2);

        lastRate = rate;
        lastTimestamp = data.timestamp;

        let speechText = `The current MXN to USD exchange rate is: ${rate}`;
        return speechText;
    } else {
        lastRate = null;
        lastTimestamp = null;
        return 'Sorry, I\'m unable to get the current exchange rate. Try again later!';
    }
}

function isFresh() {
    if (lastTimestamp !== null) {
        var last = new Date(lastTimestamp * 1000);
        var now = new Date();
        if (
            last.getDate() === now.getDate() &&
            last.getMonth() === now.getMonth() &&
            (now.getHours() - last.getHours) <= 1 &&
            (now.getMinutes() - last.getMinutes()) < 10
        ) {
            return true;
        }
    }
    return false;
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Welcome to MXN Exchange Rate, you can ask: what is today\'s peso exchange rate?';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard(cardName, speechText)
            .getResponse();
    }
};

const ExchangeIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === intentName;
    },
    async handle(handlerInput) {
        let speechText = await getCurrentExchangeRate();

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard(cardName, speechText)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = 'You can ask me: what is today\'s peso exchange rate?';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard(cardName, speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'Adios!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard(cardName, speechText)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        //any cleanup logic goes here
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
      return true;
    },
    handle(handlerInput, error) {
      console.log(`Error handled: ${error.message}`);

      return handlerInput.responseBuilder
        .speak('Sorry, I can\'t understand the command. Please say again.')
        .reprompt('Sorry, I can\'t understand the command. You can ask me: what is today\'s peso exchange rate?')
        .getResponse();
    },
};

exports.handler = async function (event, context) {
    console.log(`REQUEST++++${JSON.stringify(event)}`);
    if (!skill) {
      skill = Alexa.SkillBuilders.custom()
        .addRequestHandlers(
          LaunchRequestHandler,
          ExchangeIntentHandler,
          HelpIntentHandler,
          CancelAndStopIntentHandler,
          SessionEndedRequestHandler,
        )
        .addErrorHandlers(ErrorHandler)
        .create();
    }

    return skill.invoke(event,context);
  }