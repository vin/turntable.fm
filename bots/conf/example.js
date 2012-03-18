exports.conf = {
	"auth": "fill this in your turntableUserAuth cookie",
	"userid": "fill this in from your turntableUserId cookie",
	"roomid": "fill this in from TURNTABLE_ROOMID in view-source:turntable.fm/$ROOM",
        "name": "fill in your bot's name",
	"messages": {
		"help": "put a custom help message here" // you can override other messages as well, just add them here.
	},
	"owners": {
		"4dee6cd24fe7d05893018656": true, // vin
		"your-user-id": true
	},
	"friends": {
		"4dee6cd24fe7d05893018656": true, // vin
		"other-user-id": true, // owners automatically have 'friends' powers; no need to duplicate them here.
		"another-user-id": true
	},
};
