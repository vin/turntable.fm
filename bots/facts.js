// Copyright 2011 Vineet Kumar

Bot = require('./bot').Bot;

FactBot = function(bot) {
  this.__proto__.__proto__ = bot;
  this.commandHandlers['what'] = this.onWhat;
  this.commandHandlers['facts'] = this.onFacts;
  this.friendCommandHandlers['fact'] = this.onFact;
  this.friendCommandHandlers['forget'] = this.onForget;
  this.facts = {};
};

FactBot.prototype.onWhat = function(text, userid, username) {
  var term = Bot.splitCommand(text)[1];
  if (!term) {
    this.reply("Usage: " + Bot.splitCommand(text)[0] + " <term>");
    return;
  }
  if (this.facts[term]) {
    this.reply(this.config.messages.fact
      .replace(/\{term\}/g, term)
      .replace(/\{definition\}/g, this.facts[term]));
  } else {
    this.reply(this.config.messages.unknownFact
      .replace(/\{term\}/g, term));
  }
};

FactBot.prototype.onFact = function(text, userid, username) {
  var args = Bot.splitCommand(text)[1];
  var split = args.split(/:(.+)/);
  var term = split[0];
  var definition = split[1] || "";
  if (!definition) {
    this.reply("Usage: " + Bot.splitCommand(text)[0] + " <term>: <definition>");
    return;
  }
  //TODO(vin): add persistence
  this.facts[term] = definition;
  this.reply(this.config.messages.fact
    .replace(/\{term\}/g, term)
    .replace(/\{definition\}/g, definition));
};

FactBot.prototype.onFacts = function(text, userid, username) {
  this.reply(this.config.messages.facts
      .replace(/\{list\}/g, Object.keys(this.facts).join(', ')));
};

FactBot.prototype.onForget = function(text, userid, username) {
  var term = Bot.splitCommand(text)[1];
  if (!term) {
    this.reply("Usage: " + Bot.splitCommand(text)[0] + " <fact>");
    return;
  }
  if (this.facts[term]) {
    this.reply(this.config.messages.forget
        .replace(/\{term\}/g, term)
        .replace(/\{definition\}/g, this.facts[term]));
    delete this.facts[term];
  } else {
    this.reply(this.config.messages.unknownFact
      .replace(/\{term\}/g, term));
  }
};

exports.FactBot = FactBot;
