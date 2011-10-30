exports.conf = {
	"auth": "fill this in your turntableUserAuth cookie",
	"userid": "fill this in from your turntableUserId cookie",
	"roomid": "fill this in from TURNTABLE_ROOMID in view-source:turntable.fm/$ROOM",
	"greetings_filename": "greetings.json",
	"activity_filename": "activity.json",
	"usernames_filename": "usernames.json",
	"banList": [],
	"messages": {
		"help": "Welcome to {room.name}! I am a bot who understands commands and gives stats.  To view a list of commands, type *commands.",
		"defaultGreetings": [
			"Hi {user.name}!",
			"Hello {user.name}",
			"Hey there {user.name}"
		],
		"newUserGreetings": [
			"Welcome to turntable {user.name}!",
			"Hi {user.name}, welcome to turntable!"
		],
		"djAnnouncements": [
			"{user.name} just started DJing with {user.points} points and {user.fans} fans.",
		],
		"newDjAnnouncements": [
			"Now the real fun begins, {user.name}!",
			"Show some love for {user.name}'s first time on the decks!"
		],
		"djSummaries": [
			"{user.name} played {plays} songs, gaining {gain} points (and got lamed {lames} times).",
			"Thanks for the tunes {user.name}.  You played {plays} songs and got {gain} points and {lames} lames."
		],
		"newModerator": "{user.name} is now a moderator in {room.name}.  With great power comes great responsibility.",
		"songSummary": "{song} by {artist}",
		"album": "{song} is on {album}",
		"bonus": "{dj.name} just got a bonus from {user.name}",
		"bonusAlreadyUsed": "Sorry, bonus already used by {user.name}.  My head is already boppin!",
		"lastActivity": "It's been {age} since I saw {user.name}",
		"lastActivityUnknown": "Hmm, I haven't seen {user.name}",
		"listInactive": "There is no list.  Fastest-fingers.",
		"listEmpty": "Nobody's on the list.  Type *addme to add yourself.",
		"listAdded": "{user.name}, you're now #{position} on the list.",
		"list": "The current dj list is: {list}",
		"listAlreadyOn": "{user.name} is already #{position} on the list.",
	}
};
