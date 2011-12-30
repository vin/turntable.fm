# A simple turntable.fm bot.

Yeah, it needs a name.

## Getting started

This bot runs on [node.js](http://nodejs.org/), atop Alain Gilbert's
[ttapi library](https://github.com/alaingilbert/Turntable-API).

So far it only works on a stable (v0.4) build of node.js.  If you want to get
it working on node.js's HEAD branch, send patches! =)

Once you've got the code checked out to run a bot for yourself, create a config
file in the `conf` directory.  Any config settings in your config file will override
the settings found in `common.js`.  So you can easily run multiple bots from a single
checkout; just make multiple config files and override what you want in each one.

The main things you'll need to override are `auth` and `userid`.  If you specify a
`roomid`, the bot will automatically join that room on startup.  If not, you can 
use `bot.ttapi.roomRegister` interactively on the REPL.

## REPL

One of my bot's distinguishing features is its interactive console, or REPL.  When
the bot is up and running, it will give you a prompt where you can inspect the bot's
running state and/or interact with it and even modify it on the fly.

## Credits

Thanks to Alain Gilbert for providing the ttapi library; I never would have gotten
off the ground without his work.

This bot is essentially a rewrite of [Isaiah Greene](http://twitter.com/isaiahgreene)'s
(aka thelonius) #sickness bot; he shared the code with me and we
collaborated on that a bit before I started writing this one from scratch.  We still plan
on working together on this, probably just once it reaches feature parity with #sickness.

## Contact

I'm [Vineet Kumar](https://plus.google.com/u/0/110814948174584766402/about)
 (aka vin on turntable.fm), [@vineet](http://twitter.com/vineet),
[vineet@doorstop.net](http://doorstop.net).

If you're deploying a bot based on this code and/or working on a derivative, I'd love
to hear about it!  I'm also very open to collaborators working to improve and add to
this code base also.  Give me a shout, either here on github,
[twitter](http://twitter.com/vineet), [email](mailto:vineet@doorstop.net), or
wherever.  I'm [all over the place](http://claimid.com/vineet).

Also, while I do want to help you understand and run my code, I can't be the
one to help you with basic questions about github, nodejs, or Linux in general.
There are plenty of great resources for all of these things on the web.
