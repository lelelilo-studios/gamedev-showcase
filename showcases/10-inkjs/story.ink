// THE NINTH-FLOOR NIGHT PORTER
// One night shift at the Halcyon Pier Hotel, from midnight to six.
// Written in ink (inkle's narrative language). The page compiles this file
// with inkjs 2.4.0 every time it opens, so what you edit here is what you read.
//
// Tags the page listens for (use them in your own rewrite):
//   # entry: 01:00 The Tern Suite   starts a new hour in the ledger
//   # bell: 905                     drops that room's flag on the bell board (909 is the ballroom)
//   # sfx: knock                    a sound: bell knock lift kettle parrot wire coins lamps gull door
//   # scene: corridor               the light outside: desk corridor ballroom pier dawn
//   # clock: 01:20                  sets the corridor clock (this story moves it with the clock variable)
//   # hand                          this line is the porter's own pencil note
//   # wire                          this line is pasted in as a telegram strip
//   [Choice text #notebook]         a choice that belongs to the pocket notebook, not the ledger
// Variables the page watches: clock (minutes after midnight), tips (shillings), pockets, clues.
// The page sets `seed` before the first line, so a seeded night reads the same twice.

EXTERNAL file_report(code, title)

CONST BALLROOM = 909

VAR seed = 1
VAR clock = 0
VAR tips = 0
VAR bells = 0
VAR weather = 1          // 1 clear, 2 fog, 3 wind: chosen by the seed
VAR trust_ida = 0
VAR trust_grey = 0
VAR trust_quill = 0
VAR rose_alert = 0       // how wary Mrs. Lark has become
VAR rose_knows = false   // whether she knows where the pearls are
VAR pearls_at = "drawer" // drawer, pocket, rose, grey, returned, recovered
VAR grey_plan = false
VAR opened_wire = false
VAR key_taken = false
VAR saw_theft = false
VAR accused_grey = false
VAR hugged = false
VAR on_pier = false
VAR rose_state = "free"  // free, caught, folded

LIST pockets = (pass_key), (pencil), torch, seeds, matches, telegram, the_pearls, card, feather
LIST clues = shawl, shoes, green_ring, early_boat, bolster, packed_case, lipstick, wire_text, name_ashdown, name_varga, name_grey

~ SEED_RANDOM(seed)
~ weather = RANDOM(1, 3)
-> coming_on


// ─── Helpers ────────────────────────────────────────────────

=== function tick(minutes)
~ clock = clock + minutes

=== function at(minutes)
// Time only moves forward: an hour can start late, never early.
{ clock < minutes:
    ~ clock = minutes
}

=== function evidence()
// What you've noticed about Mrs. Lark. The man's three names don't count against her.
~ return LIST_COUNT(clues) - LIST_COUNT(clues ^ (name_ashdown, name_varga, name_grey))

=== function grey_lc()
// What you call the man in 907 depends on whether he has told you who he is.
{ pockets ? card:
    ~ return "Mr. Grey"
}
~ return "the man in 907"

=== function grey_uc()
{ pockets ? card:
    ~ return "Mr. Grey"
}
~ return "The man in 907"

=== function o_clock()
~ temp h = clock / 60
~ temp m = clock mod 60
{
- m == 0 && h == 0:
    midnight
- m == 0:
    {num(h)} o'clock
- m == 15:
    a quarter past {num(h)}
- m == 30:
    half past {num(h)}
- m == 45:
    a quarter to {num(h + 1)}
- m < 30:
    {num(m)} past {num(h)}
- else:
    {num(60 - m)} to {num(h + 1)}
}

=== function num(n)
{ n:
- 0: twelve
- 1: one
- 2: two
- 3: three
- 4: four
- 5: five
- 6: six
- 7: seven
- 10: ten
- 20: twenty
- 25: twenty-five
- else: {n}
}

=== function file_report(code, title)
// Inky and other players use this; the page binds its own version to file the ending.
~ return


// ─── The bell board ─────────────────────────────────────────
// Every ring goes through this tunnel and comes back to where it was called.

=== bell(room)
~ bells++
{ room == BALLROOM:
    The flag has dropped in the ninth window, the painted-over one that hasn't moved in twenty years. It says BALLROOM. # bell: {room} # sfx: bell
- else:
    {~The bell for {room} goes, and its little flag drops in the board.|{room} rings. Its flag falls in the window like a dropped eyelid.|A ring from {room}. The whole board shivers on its screws.} # bell: {room} # sfx: bell
}
->->


// ─── The pocket notebook ────────────────────────────────────
// Threaded into every choice: you can read it from anywhere, and it brings you back.

=== notebook(-> back)
+ [Consult the pocket notebook #notebook]
    -> notes ->
    -> back

=== notes
Notes, night of the 29th.
{ LIST_COUNT(clues) == 0:
    Nothing yet but the date, and a drawing of a gull.
}
{ clues ? shawl:
    901 lost her key after dinner. Mrs. Lark helped her with her shawl.
}
{ clues ? name_ashdown:
    907 signed the register H. Ashdown. Hand like typing.
}
{ clues ? name_varga:
    His case says L. Varga. Different hand, older label.
}
{ clues ? shoes:
    Mr. Lark's shoes: never been walked in. Not one grain of sand.
}
{ clues ? green_ring:
    Her wedding ring leaves a green mark. Brass.
}
{ clues ? early_boat:
    The bird, in a girl's voice: "The early boat, Teddy."
}
{ clues ? name_grey:
    A wire for GREY, ninth floor. No Grey in the book.
}
{ clues ? wire_text:
    The wire: the Larks are the Brightsand pair. She works nights, he waits with a boat.
}
{ clues ? packed_case:
    905 packing at half past two. Honeymoon booked for a week.
}
{ clues ? bolster:
    Teddy is a bolster.
}
{ clues ? lipstick:
    Ballroom: a cigarette still burning, shell-pink lipstick. Violets. I was sent for.
}
{ evidence() >= 4:
    That's a list. Somebody ought to read it out to her.
}
->->


// ─── The doors ──────────────────────────────────────────────
// Each door remembers how many times you've knocked.

=== door_901
# sfx: knock
{
- door_901 == 1:
    You knock at 901, though the door is open and its guest is standing outside it, because a porter knocks the way other people cross themselves: not for the door's sake.
- else:
    You knock at 901 for the second time tonight. The first time it was a lost key. Your knuckles know before you do that this time it isn't.
}
->->

=== door_903
# sfx: knock
{
- door_903 == 1:
    You knock at 903. A voice inside says, "Coming, coming!" and then, a moment later, the same voice from the other side of the room says it again.
- else:
    You knock at 903 again. This time the voice that says "Coming!" is definitely the bird.
}
->->

=== door_905
# sfx: knock
{
- door_905 == 1:
    You knock twice at 905: the soft double knock the hotel taught you in your first season, which means I am here, but I am in no hurry.
- else:
    You knock at 905 a second time tonight. At one o'clock it was locked and there was a smile behind it. Now the door swings open under your knuckles.
}
->->

=== door_907
# sfx: knock
{
- door_907 == 1:
    You knock at 907. Nothing. Then, from very close on the other side, as if he had been standing there all along: "Yes?"
- else:
    Twice, softly, the porter's knock. You've knocked on this door once tonight already; this time it opens before your hand comes down.
}
->->


// ─── 00:00 ──────────────────────────────────────────────────

=== coming_on
# entry: 00:00 Coming on
# scene: desk
The lift brings you up at two minutes to midnight, the way it has every night since May: slowly, complaining at the sixth floor, sighing at the eighth, and stopping at the ninth with a shrug, as if it had expected better of you. # sfx: lift
Hollis is waiting at the porter's desk with his coat already on. Eleven seasons you have relieved him, and he has never once been late going home.
"Four on nine," he says, "and one to come off the last train. Name of Ashdown, booked by wire." He taps the board behind him. "Nine-oh-one is Mrs. Marchbank, same as every September since the Flood. Nine-oh-three is Mr. Quill, and whatever you hear through his door, it is not a bird, because the Halcyon does not allow birds. Nine-oh-five is the honeymoon."
"And the ballroom?"
"The ballroom is the ballroom." He hands you the pass key on its chain, still warm from his waistcoat. "Last night of the season. Dust sheets go on tomorrow. Try not to let the place fall into the sea before six."
The lift takes him down. The ninth floor settles round you: the long corridor with its carpet the colour of old port, the radiators hissing to themselves, and at the far end, through the tall window, the pier lamps walking out into the dark in pairs.
Behind the desk the bell board hangs on the wall like a brass hymn board: eight enamel windows for the eight rooms, and a ninth, painted over years ago, that says BALLROOM.
The desk drawer holds the usual. There's room in your jacket for one thing more.
- (ask)
<- notebook(-> ask)
* [Take the torch]
    ~ pockets += torch
    You take the torch. Its beam is the colour of weak tea, but it is honest.
* [Take Hollis's paper of sunflower seeds]
    ~ pockets += seeds
    You take the twist of sunflower seeds Hollis keeps for the gulls, and for no other reason he will admit to.
* [Take the matches]
    ~ pockets += matches
    You take the matches. A porter who can offer a light is a porter who hears things.
- The clock over the lift says midnight, and somewhere in the walls the old hotel ticks over with it.
Came on 23:58. Relieved Hollis. Four on nine, one expected. # hand
~ at(10)
-> bell(901) -> ida


// ─── 00:10 · 901 ────────────────────────────────────────────

=== ida
- (ask)
<- notebook(-> ask)
* [Go at once]
    You're at 901 before the little flag has finished trembling.
* [Finish your tea first]
    ~ tick(5)
    ~ trust_ida -= 1
    The tea is stewed and you finish it anyway; nobody ever came to harm for want of thirty seconds. By the time you reach 901 the thirty seconds have become five minutes, and it shows on the face that's waiting for you.
- -> door_901 ->
~ tick(5)
# scene: corridor
Mrs. Marchbank stands in the corridor in an evening dress the colour of a mussel shell, holding her bag open like a pelican's beak. At her throat three strands of pearls take the lamplight and keep it.
"I've lost my key," she says. "I had it at dinner. I'm certain I had it at dinner. That sweet Mrs. Lark helped me with my shawl, and I had it then, because I remember thinking how heavy it was for such a small thing."
{ trust_ida < 0:
    She looks at her watch, and then at you. "I have been standing here some time."
}
~ clues += shawl
You let her in with the pass key. The room smells of lavender water and the sea, and on the bedside table a man in a dinner jacket smiles out of a silver frame at something just behind you.
-> inside

= inside
- (ask_inside)
<- notebook(-> ask_inside)
* [Admire the pearls]
    ~ trust_ida += 1
    "Arthur gave me these," she says, touching them the way people touch an old scar. "In the ballroom, on this very floor. The band played 'Blue Room' and he fastened them on me in front of everybody, and I was so embarrassed I could have walked into the sea."
    She smiles at the man in the frame. "Thirty-one Septembers. You'd think the sea would be tired of me."
    -> ask_inside
* [Suggest the hotel safe for the night]
    { trust_ida > 0:
        -> offered
    }
    "The safe," she says, as if you'd suggested the sea. "Arthur never trusted a safe. He said a safe is a box that tells a thief where to look." She lays the pearls in the bedside drawer and pats the drawer shut. "There. Safe as houses."
    -> ask_inside
* [Wish her goodnight]
    -> goodnight

= offered
"The safe." She considers you over her spectacles. "Arthur never trusted a safe. He said a safe is a box that tells a thief where to look. He trusted porters." She unclasps the pearls and holds them out to you in a soft heap. "Would you? Only until breakfast. I'd sleep the better for it."
- (ask_offered)
<- notebook(-> ask_offered)
* [Take the pearls into your keeping]
    ~ pockets += the_pearls
    ~ pearls_at = "pocket"
    They're heavier than they look, and warm from her. You put them in the inside pocket of your jacket, the one over your heart, because it's the only one without a hole in it.
* [Tell her they're safest with her]
    "Nonsense," she says, but she is pleased. The pearls go into the bedside drawer, and the drawer is patted shut.
- -> goodnight

= goodnight
"I'll take my drops and sleep like the drowned," she says. "Lock me in, would you, dear? I'll ring when I want letting out."
~ tips += 2
She presses a florin into your palm. You lock 901 from the corridor and hear the bed creak once, and then nothing but the radiators. # sfx: coins
00:15. 901 locked out. Let in with pass key, locked from outside at her request. # hand
-> arrival


// ─── 00:40 · The last train ─────────────────────────────────

=== arrival
~ at(40)
# scene: desk
At twenty to one the lift comes up with the last train's only passenger. # sfx: lift
He is a long man in a short coat, wet across the shoulders, with the look of someone who reads timetables for a living. He signs the register standing up: H. Ashdown, in a hand so neat it might have been typed.
~ clues += name_ashdown
He has one suitcase, scuffed brown leather, and he holds it the way you would hold a dog that bites.
- (ask)
<- notebook(-> ask)
* [Offer to carry his case]
    "I can manage."
    "House rules, sir. The Halcyon doesn't let a gentleman carry his own case past the ninth step."
    He weighs this, and you, and hands it over. The luggage label on the handle says L. VARGA, in a different hand, faded by a different summer.
    ~ clues += name_varga
    ~ trust_grey += 1
    He watches you read it. He says nothing at all.
* [Let him carry it himself]
    He carries it himself, white at the knuckles. Whatever is in it, it isn't pyjamas.
* [Ask what brings him out of season]
    "The sea air," he says, which is what everybody says, and he says it the way people do when they've been told to.
- -> landing

= landing
At the door of 907 he stops. "Who else is on this floor?"
- (ask_landing)
<- notebook(-> ask_landing)
* [Tell him]
    ~ trust_grey -= 1
    You tell him: Mrs. Marchbank in 901, Mr. Quill in 903, the honeymooners in 905. He listens like a man learning a hymn by heart.
    "You shouldn't tell people that," he says. "Not a stranger off a train at one in the morning."
* [Say you couldn't possibly]
    ~ trust_grey += 1
    "I couldn't possibly say, sir."
    For the first time something in his face unbuttons. "Good," he says. "Keep saying that. To everybody."
* ["An old lady, a parrot and a honeymoon, sir."]
    He nearly laughs. "A parrot."
    "There's no parrot, sir. The Halcyon doesn't allow birds."
    "Of course it doesn't." He looks down the corridor at the doors one by one, the way a man reads a hand of cards.
- He doesn't tip. He goes into 907 and you hear the key turn, and then the chain, and then a chair being wedged under the handle.
00:40. H. Ashdown, 907, off the last train. No tip. Chair under the door. # hand
-> tern_suite


// ─── 01:00 · The Tern Suite ─────────────────────────────────

=== tern_suite
~ at(60)
# entry: 01:00 The Tern Suite
# scene: desk
{~The sea is making the noise it makes in September, like a large animal turning over in its sleep.|Below the pier the tide is going out, and taking its time about it.|The wind has found the loose pane at the end of the corridor and is practising on it.}
-> bell(905) ->
~ tick(5)
- (ask)
<- notebook(-> ask)
* [Go at once]
    You go at once. Honeymooners don't ring at one in the morning for nothing.
* [Straighten your tie first]
    ~ tick(5)
    You straighten your tie in the dark glass of the board. Honeymooners notice ties.
- -> door_905 ->
# scene: corridor
Two pairs of shoes stand outside 905 to be polished, as is the custom: hers, navy courts with the heels walked down; his, gentleman's brogues so new the price is practically still on them.
- (shoe_rack)
<- notebook(-> shoe_rack)
* [Pick up the shoes for polishing]
    ~ clues += shoes
    You pick them up. Hers are still warm. His have never been walked in: the soles are clean as a plate, not a grain of sand in the welts, and this is a seaside town, where sand gets into the hymn books.
* [Leave them till later]
    You leave them where they are. Shoes keep.
- The door opens on its chain, and then on a smile.
-> rose

= rose
Mrs. Lark is young, and pretty in the way that is mostly paying attention. She wears a dressing gown the colour of the inside of a shell, and a new wedding ring that she turns and turns with her thumb.
"I can't sleep," she says. "Isn't that silly? Teddy could sleep through the end of the world; he's dead to it." Behind her the room is dark. In the bed there's a long shape, and the shape doesn't move. "Could I have some cocoa? And would you think me awful if I asked for someone to talk to? Five minutes. Only five."
- (ask_rose)
<- notebook(-> ask_rose)
* [Bring cocoa, and stay five minutes]
    -> cocoa
* [Bring cocoa, and leave it at the door]
    ~ tick(10)
    ~ tips += 1
    You bring the cocoa from the still room and leave it on a tray at her door with a biscuit, because a biscuit is a kind of conversation.
    "You're a darling," she says through the gap, and the door closes, and something about the way she says it is a little colder than the cocoa.
    -> leave_rose

= cocoa
~ tick(15)
You make the cocoa in the still room, properly, bringing the milk up slow, and when you come back she's curled on the little sofa in the corridor alcove with her feet tucked under her, so as not to wake Teddy. # sfx: kettle
{ pockets ? matches:
    She takes out a cigarette and looks at you, and you strike a match for her. In the little flare you see her hand, and her ring, and the faint green shadow the ring has left on her finger, the way cheap brass does when it's warm.
    ~ clues += green_ring
}
"Tell me about the hotel," she says. "Tell me about everybody. I adore other people's lives."
-> talk

= talk
- (ask_talk)
<- notebook(-> ask_talk)
* [Tell her about Mrs. Marchbank]
    ~ tick(5)
    You tell her about Mrs. Marchbank, and the thirty-one Septembers, and the band that played 'Blue Room'. She listens with her chin on her hand.
    "And those pearls," she says. "Does she keep them in the hotel safe, do you think? I should be terrified."
    -> pearls_question
* [Tell her about the late arrival]
    ~ tick(5)
    You tell her the last train brought one passenger, and that he's on this floor, and that he didn't tip.
    "He looked at me in the hall," she says. "At dinner, too, through the glass. Who is he?"
    -> stranger_question
* [Ask what Mr. Lark does]
    ~ tick(5)
    "Teddy? Oh, boats." She laughs. "He's mad about boats. If I let him we'd have spent the honeymoon in one, going round and round the bay being sick."
    -> ask_talk
* { clues !? green_ring } [Look at her hands]
    ~ clues += green_ring
    You look at her hands, because they're doing the work her face won't. The ring. And under the ring, when she turns it, a faint green shadow on the skin, the way cheap brass leaves its mark when it's warm.
    -> ask_talk
* [Excuse yourself]
    "The board, madam. I mustn't leave it."
- "Five minutes," she says. "You're a darling." She gives you three shillings, which is a great deal too much for cocoa, and slips back into the dark room without turning on the light.
~ tips += 3
-> leave_rose

= pearls_question
- (ask_pearls_question)
<- notebook(-> ask_pearls_question)
* [Tell her the truth]
    ~ rose_knows = true
    { pearls_at == "pocket":
        "She gave them to me to mind, madam," you say, and touch your jacket without meaning to, and her eyes go to your hand and stay there a moment too long.
    - else:
        "In the bedside drawer, madam. She doesn't hold with safes."
    }
    "How brave of her," says Mrs. Lark.
* [Say you wouldn't know]
    "I couldn't say, madam."
    "Of course you couldn't." She smiles. It's a smile that has been told no before and has never once believed it.
* [Say a guest's things are no business of yours]
    "A guest's things are no business of mine, madam."
    "Everything is a porter's business," she says lightly. "That's what porters are for."
- -> talk.ask_talk

= stranger_question
- (ask_stranger_question)
<- notebook(-> ask_stranger_question)
* [Tell her his name]
    { clues ? name_varga:
        ~ rose_alert += 2
        "Ashdown in the register, madam. Though his case says Varga."
        Her cup stops halfway. Only for a moment; then it goes on to her mouth. "How funny," she says. "A man with two names. One's quite enough for most of us."
    - else:
        ~ rose_alert += 1
        "Mr. Ashdown, madam. Off the last train."
        "Ashdown," she says, as if tasting it. "I don't know any Ashdowns."
    }
* [Say he's a commercial gentleman]
    "Commercial gentleman, madam. Brushes, I should think. Or encyclopaedias."
    "Oh," she says, and the interest goes out of her face like a tide. "How dull."
* [Say you couldn't say]
    ~ rose_alert += 1
    "I couldn't say, madam."
    "You do keep saying that." She looks at you over her cup, a little longer than she needs to.
- -> talk.ask_talk

= leave_rose
01:20. 905, cocoa. Mrs. Lark can't sleep. Mr. Lark asleep. # hand
-> bosun


// ─── 01:35 · 903 ────────────────────────────────────────────

=== bosun
~ at(95)
# scene: desk
You've barely put the tray away when the board goes again.
-> bell(903) ->
It goes on ringing, as if somebody is leaning on it.
-> door_903 ->
# scene: corridor
Mr. Quill opens the door in a dressing gown with anchors on it. He is small and round and anxious, a retired purser who spent forty years apologising to first-class passengers and has never quite managed to stop.
Behind him, on top of the wardrobe, a cage under a green cloth is shouting.
"He's upset," says Mr. Quill. "Voices through the wall. He takes them in, you see; he takes everything in. I beg you, porter. The management —"
- (ask)
<- notebook(-> ask)
* [Promise to say nothing about the bird]
    ~ trust_quill += 1
    "What bird, sir?"
    Mr. Quill's whole face falls open with relief, like a book dropped on its spine. "God bless you," he says. "God bless you."
* [Remind him of the rules]
    ~ trust_quill -= 1
    "The Halcyon doesn't allow birds, sir. I shall have to mention it to Mr. Penhallow in the morning."
    "Of course," says Mr. Quill. "Of course." He looks suddenly very old. "Only he's all I have to talk to."
- -> cage

= cage
The cloth comes off. Bosun is an African grey the size of a loaf, with a tail like a struck match. He looks at you with one eye and then the other, as if checking a reference.
- (ask_cage)
<- notebook(-> ask_cage)
* { pockets ? seeds } [Offer Bosun a sunflower seed]
    -> seed_offer
* [Say goodnight to Bosun]
    "Bosun's a good boy," says Bosun, in Mr. Quill's voice exactly; and then, in a voice that isn't Mr. Quill's at all, a young voice, a woman's: "Not yet." # sfx: parrot
    Mr. Quill puts the cloth back. "He picks things up," he says miserably.
    -> leave

= seed_offer
You hold out a seed on your palm. Bosun takes it with great delicacy, the way a bishop takes a sherry, cracks it, and considers you.
Then he says, in a young woman's voice, low and quick and perfectly clear: "The early boat, Teddy. The early boat." # sfx: parrot
~ clues += early_boat
Mr. Quill goes pink to the ears. "That's not one of mine. I've never caught an early boat in my life. He gets it through the wall." He nods towards 905.
-> leave

= leave
{ trust_quill > 0:
    ~ tips += 1
    Mr. Quill presses a shilling on you, which is more than he can afford, and you take it, because refusing would cost him more. # sfx: coins
}
{ trust_quill > 0:
    01:40. 903 rang. No bird. # hand
- else:
    01:40. 903 rang. Bird in 903. Report to Mr. P. # hand
}
-> the_wire


// ─── 02:00 · A telegram for nobody ──────────────────────────

=== the_wire
~ at(120)
# entry: 02:00 A telegram for nobody
# scene: desk
At two the lift brings up Alfie from the front desk, fourteen years old and asleep on his feet, holding a telegram as though it might go off. # sfx: lift
"Came on the night wire," he says. "For the ninth floor. Mr. Penhallow says you'll know." # sfx: wire
The envelope says: GREY, HALCYON PIER HOTEL, NINTH FLOOR. URGENT.
There is no Grey on the ninth floor. There is no Grey in the hotel. You have the register open in front of you, and the register is never wrong, except when people lie to it.
~ clues += name_grey
- (ask)
<- notebook(-> ask)
* [Steam it open at the kettle]
    -> steam
* [Take it to 907, on a hunch]
    -> deliver
* [Pocket it until morning]
    -> pocket_it

= steam
~ tick(10)
~ opened_wire = true
The still-room kettle does it in a minute: the flap lifts like an eyelid, and you unfold the strip. # sfx: kettle
GREY STOP PAIR CALLING THEMSELVES LARK SAME AS BRIGHTSAND AND PORT OWEN STOP SHE WORKS THE NIGHTS HE WAITS WITH A BOAT STOP TAKE THEM WITH THE GOODS OR NOT AT ALL STOP KESTREL MUTUAL # wire
~ clues += wire_text
You read it twice. Then you fold it back along its folds and press the flap down with the warm back of a spoon, and it looks very nearly as if nobody has ever opened it.
- (ask_steam)
<- notebook(-> ask_steam)
* [Take it to 907]
    -> deliver
* [Pocket it until morning]
    -> pocket_it

= pocket_it
~ pockets += telegram
You put it in your inside pocket{ pockets ? the_pearls :, beside the pearls,} and it sits there for the rest of the night like a held breath.
02:00. Wire for GREY, no such guest. Kept for the morning. # hand
-> small_hours

= deliver
~ tick(5)
# scene: corridor
-> door_907 ->
The chair scrapes, the chain rattles, the key turns. The man who signed himself Ashdown is fully dressed at two in the morning, tie and all, as if sleep were a thing that happened to other people.
"Telegram, sir. For a Mr. Grey."
He looks at the envelope, and then at you, for a long moment. Then he takes it.
{ opened_wire:
    -> flap
}
-> reads

= flap
He turns it over and runs his thumb along the flap, and the thumb stops at the place where the spoon was.
- (ask_flap)
<- notebook(-> ask_flap)
* [Admit you opened it]
    ~ trust_grey += 2
    "I opened it, sir. There's no Grey in the register, and I wanted to know who I was carrying it for."
    He looks at you for a long time. "That's the first honest thing anyone has said to me since Brightsand," he says.
* [Say nothing]
    ~ trust_grey -= 1
    You say nothing. He says nothing back, which is somehow worse.
- -> reads

= reads
He reads it standing in the doorway.
{ trust_grey >= 1:
    -> confides
}
"Thank you, porter," he says, in the voice of a closing door; and the door closes, and the chain goes on, and the chair goes back under the handle.
02:10. Wire for GREY taken in by 907. Said thank you. # hand
-> small_hours

= confides
~ tick(10)
Then he opens the door a little wider.
"Grey," he says. "Elias Grey. Ashdown was my mother's name. Varga was my partner's, and that's his case, and he won't be needing it now." He gives you a card: KESTREL MUTUAL ASSURANCE, a London address, and a telephone number nobody will answer at this hour.
~ pockets += card
"Your honeymooners have done four hotels since Easter. Always the end of the season, always the best suite, always gone on the morning tide with somebody's grandmother round their neck. Nobody has ever seen the husband. I'm not sure there is one." He folds the telegram very small. "Tonight she'll go for the old lady's pearls. I need her with them in her hand, or she's only a pretty girl who couldn't sleep."
- (ask_confides)
<- notebook(-> ask_confides)
* [Promise to knock on 907 when 905's door opens]
    ~ grey_plan = true
    "When her door opens," you say, "I'll knock twice on yours. A porter's knock."
    "And don't go after her yourself," he says. "She isn't as soft as she looks. Nobody in this line of work is."
* [Say you'll do your job and nothing more]
    "I'm the porter, sir. I carry things."
    "Then carry that," he says, nodding at the card in your hand. "In case you change your mind."
- 02:20. Wire delivered. Mr. Grey is Mr. Ashdown is Mr. Varga. # hand
-> small_hours


// ─── 02:30 · The dead hour ──────────────────────────────────

=== small_hours
~ at(150)
# scene: desk
{ weather:
- 1: The sky has cleared. The moon is laying a road across the water straight to the end of the pier, as if inviting somebody to walk it.
- 2: Fog has come in off the sea. The pier lamps are being swallowed one pair at a time, until only the nearest four are left, and then three.
- 3: The wind has got up. The whole hotel creaks like a ship at anchor, and the flag on the roof cracks like a whip every half minute.
}
Half past two: the dead hour. The radiators have stopped hissing. Even the sea sounds tired.
- (ask)
<- notebook(-> ask)
* [Walk the corridor]
    -> walk
* [Write up the ledger]
    -> write_up
* [Put your feet up, just for a minute]
    -> doze

= walk
~ tick(10)
# scene: corridor
You walk the length of the corridor on the quiet side of the carpet, the way you were taught: past 901, where Mrs. Marchbank is snoring delicately, like a kettle thinking about it; past 903, where Bosun mutters under his cloth; past 905 —
You stop. Inside 905 a suitcase clasp snaps shut. Then another. At half past two in the morning, on the second night of a honeymoon booked for a week.
~ clues += packed_case
You walk on to 907. Under the door, a line of light. The man with three names isn't sleeping either.
-> three

= write_up
~ tick(10)
You write up the night so far in your best hand, the way Mr. Penhallow likes it: times, rooms, requests. Written down, it looks like nothing at all. A lost key. Cocoa. A bird that isn't a bird. A telegram for nobody.
You read it back, and it looks a little less like nothing.
{ evidence() >= 3:
    Somewhere in it there's a shape, the way there's a face somewhere in the wallpaper if you stare long enough.
- else:
    You can't see the shape of it yet. Perhaps there isn't one.
}
-> three

= doze
~ tick(20)
~ rose_alert -= 1
You put your feet on the bottom drawer and close your eyes, only to rest them, and the hotel rocks you like a boat.
When you open them it's {o_clock()}. The board is quiet and your neck aches, and someone has walked past the desk while you slept: there's a smell in the air, faint and expensive. Violets.
-> three

= three
-> overboard


// ─── 03:00 · Bosun goes over the side ───────────────────────

=== overboard
~ at(180)
# entry: 03:00 Bosun goes over the side
# scene: corridor
-> bell(903) ->
~ tick(5)
Before you're out of your chair the corridor fills with a noise like bagpipes being sat on, and something grey goes past the desk at head height, trailing a long red shriek. # sfx: parrot
Mr. Quill is in the doorway of 903 with an empty cage and a water jug. "I only opened it to fill his dish!"
Bosun lands on the brass rail over the door of 905, cocks his head, and says, in Mr. Penhallow's voice exactly: "We do not allow birds."
The door of 905 opens. Mrs. Lark looks out, dressed, you notice, not in the dressing gown but in a travelling suit buttoned to the throat, and Bosun drops off the rail and walks past her ankles into the dark room as if he had a reservation.
- (ask)
<- notebook(-> ask)
* { pockets ? seeds } [Kneel and hold out a sunflower seed]
    -> by_seed
* [Throw your jacket over him]
    -> by_jacket
* [Ask Mr. Quill to call him]
    -> by_quill

= by_seed
~ tick(5)
You kneel in the doorway of 905 with a seed on your palm, and Bosun comes out from under the bed like a gentleman leaving his club. On his way he passes the bed, and for the first time tonight you see the bed properly.
There's nobody in it. There's a bolster, with the sheet drawn up over it, and a pillow plumped for a head. Teddy, who could sleep through the end of the world.
~ clues += bolster
{ clues !? packed_case:
    By the door: two suitcases, strapped and labelled and ready to go.
    ~ clues += packed_case
}
Bosun steps onto your wrist and remarks, conversationally, "The early boat, Teddy."
{ clues ? early_boat:
    "Clever bird," says Mrs. Lark, and closes the door.
- else:
    Mrs. Lark goes very still. Then she laughs. "Clever bird. He must have heard us talking about our trip round the bay." The door closes.
    ~ rose_alert += 1
}
~ clues += early_boat
-> settled

= by_jacket
~ tick(15)
It takes three goes and a vase. Bosun goes under the bed, over the wardrobe and into the bathroom, swearing in the voices of four different sea captains, and in the end it's Mrs. Lark, laughing, who throws your jacket over him on the bath mat and gathers him up.
She hands him back to you in it like a parcel: a parcel that says, quite distinctly, "The early boat, Teddy."
Her smile doesn't move at all. "There," she says, smoothing your lapel. "No harm done."
{ clues !? early_boat:
    ~ rose_alert += 1
}
~ clues += early_boat
~ pockets -= pass_key
~ key_taken = true
-> settled

= by_quill
~ tick(10)
"Mr. Quill, sir. He'll come to you."
Mr. Quill shuffles down the corridor in his anchors and gives a low whistle, two notes, a sound off a ship's deck forty years ago. Out of the dark of 905 comes Bosun at a dignified walk, climbs Mr. Quill like a ladder, and settles on his shoulder.
"So sorry, madam," says Mr. Quill to the door. "So very sorry."
"Not at all," says Mrs. Lark, and the door closes.
~ trust_quill += 1
On the way back Bosun says, into Mr. Quill's ear, "The early boat, Teddy." Mr. Quill looks at you, and you look at Mr. Quill.
~ clues += early_boat
-> settled

= settled
~ at(205)
# scene: desk
By twenty-five past three the corridor is quiet again. Bosun is under his cloth. Mr. Quill's light goes out. 905 stays shut.
03:25. Bird in the corridor. Returned to 903.{ trust_quill > 0: There is no bird.} # hand
-> ninth_bell


// ─── 04:00 · The ninth bell ─────────────────────────────────

=== ninth_bell
~ at(240)
# entry: 04:00 The ninth bell
# scene: desk
Four o'clock, the hour when the night forgets what it was for.
{ pearls_at == "pocket":
    You touch your jacket, and the pearls are there, a small cool weight over your heart.
}
Then the board rings, and you look up.
-> bell(BALLROOM) ->
Nobody has danced up there since the ceiling came down in the great storm. There's nobody up there to ring.
- (ask)
<- notebook(-> ask)
* [Go and see who's ringing]
    -> ballroom
* { evidence() >= 3 || grey_plan } [Stay where you are, and watch 905]
    -> watch
* { grey_plan } [Knock twice on 907, now]
    -> signal

= ballroom
~ tick(5)
# scene: ballroom
The fire doors at the end of the corridor are meant to be locked. One of them stands ajar. # sfx: door
The ballroom is the size of a chapel and twice as cold. Dust sheets over the gilt chairs, like a congregation of ghosts come early for a wedding. The great chandelier hangs in a canvas bag like a cocoon.
{ weather:
- 1: Moonlight lies across the sprung floor in long pale bars.
- 2: The tall windows are white with fog, and the room has no edges.
- 3: The wind leans on the tall windows, and the whole room breathes in and out.
}
The bell-push is by the bandstand.
{
- pockets ? torch:
    -> by_torch
- pockets ? matches:
    -> by_match
- else:
    -> in_the_dark
}

= by_torch
Your torch finds it at once, and finds, on the bandstand step beside it, a saucer with a cigarette still burning in it. There's lipstick on the end, the colour of the inside of a shell. And the smell of violets.
~ clues += lipstick
You understand, all at once and cold, that you have been sent for.
You run. Porters do not run; it's the first thing they teach you. You run the length of the corridor on the loud side of the carpet, and you're in time to see the door of 901 closing softly from the outside, and Mrs. Lark, in her travelling suit and gloves, turning away from it. # scene: corridor
-> caught_in_the_act

= by_match
~ tick(10)
You strike a match. It shows you three feet of dark and your own hand, and then it burns your fingers. You strike another. By the fourth you've found the bell-push, and nothing beside it but dust, and a smell of violets that has no business being here.
-> back_late

= in_the_dark
~ tick(15)
You feel your way along the wall in the dark, past chairs that catch at your knees like dogs, and by the time you find the bell-push you've learnt nothing except where every chair in the ballroom is.
-> back_late

= back_late
# scene: corridor
When you get back, the corridor is exactly as you left it. 901 is shut. 905 is shut. The board is quiet.
Only, as you pass 901, there's that faint smell of violets again, as if someone had been standing there a minute ago, waiting for you to go.
{ pearls_at == "drawer":
    ~ pearls_at = "rose"
}
04:20. Ballroom bell. Nobody there. # hand
-> lamps_out

= caught_in_the_act
{ pearls_at == "drawer":
    ~ pearls_at = "rose"
    ~ saw_theft = true
    Something pale hangs from her gloved hand, like milk poured and stopped.
- else:
    Her gloved hands are empty. She has found an empty drawer, and she's still trying to understand it.
}
She sees you. For a moment neither of you moves.
- (ask_caught_in_the_act)
<- notebook(-> ask_caught_in_the_act)
* { grey_plan } [Call out for Mr. Grey]
    -> grey_comes
* [Stand in her way]
    -> face_her
* [Step aside]
    "Goodnight, porter," she says, and walks past you so close that her sleeve touches yours, and her door clicks shut behind her.
    04:15. Ballroom bell. Mrs. Lark in the corridor. # hand
    -> lamps_out

= watch
~ tick(5)
You stay in your chair with the desk lamp off. You've been a porter a long time, and you know what a bell is for: a bell is for making you go somewhere.
At six minutes past four the door of 905 opens. Mrs. Lark comes out in her travelling suit and gloves, shuts the door without a sound, and goes along the corridor, not towards the ballroom but to 901. She has a key. Of course she has; she's had it since dinner.
{ key_taken:
    You put your hand to your jacket, and the chain isn't there. It's your key she has.
}
She goes in. Twenty seconds. Thirty.
{ pearls_at == "drawer":
    ~ pearls_at = "rose"
    ~ saw_theft = true
}
- (ask_watch)
<- notebook(-> ask_watch)
* { grey_plan } [Knock twice on 907]
    -> signal
* { not grey_plan } [Hammer on 907]
    -> hammer
* [Meet her at the door of 901]
    -> face_her
* [Let her go]
    She comes out, and draws the door shut behind her, and goes back to 905 the way she came, quick and quiet, and doesn't once look towards the dark desk where you are sitting with your hands flat on the blotter.
    04:10. 905 into 901 and out again. Did nothing. # hand
    -> lamps_out

= signal
~ tick(5)
# scene: corridor
-> door_907 ->
He's been standing just behind it, dressed, all night. He doesn't say a word. He goes past you down the corridor, quick and quiet, the way a cat crosses a lawn, and he is standing in the doorway of 901 when Mrs. Lark comes out.
-> grey_comes

= grey_comes
{ pearls_at == "pocket":
    Her hands are empty. She has found an empty drawer, and all she has to show for her night is a brass key with a 901 fob, which belongs to someone else.
- else:
    ~ pearls_at = "grey"
    In her gloved hand are three strands of pearls, white as milk in the dark corridor.
}
~ rose_state = "caught"
"Good evening, Mrs. Lark," says Mr. Grey. "Or is it Mrs. Pellow tonight? Or Mrs. Atherton?"
She looks at him, and then past him at you, and for the first time all night her face isn't paying attention to anything. "You," she says to you. Not angrily. As if she'd been told the ending of a book.
04:10. Mrs. Lark detained at the door of 901 by Mr. Grey. # hand
-> lamps_out

= hammer
~ tick(5)
~ rose_alert += 2
# scene: corridor
You hammer on 907 with the side of your fist, the way nobody has ever knocked in the Halcyon. # sfx: knock
Behind you a door shuts, quick and soft. By the time the chair scrapes and the chain rattles and {grey_lc()} is in the corridor in his shirtsleeves, there's nobody to see but you.
"Where?" he says. You point. He looks at 905's closed door the way a man looks at a train he has just missed. "Not like that," he says quietly. "Never like that. Now she knows."
04:10. Knocked up 907. Too loud. # hand
-> lamps_out

= face_her
~ tick(5)
# scene: corridor
You are standing in front of her, between her and 905, before you've decided to.
"Oh!" A gloved hand at her heart. "You frightened me. Mrs. Marchbank rang through the wall for her drops, poor thing, and couldn't find them in the dark, and I hadn't the heart to fetch you away from your desk."
{ pearls_at == "rose":
    One gloved hand is in the pocket of her suit, and stays there.
}
- (ask_face_her)
<- notebook(-> ask_face_her)
* [Tell her what you've noticed]
    -> the_list
* [Ask her to turn out her pockets]
    "Your pocket, madam."
    "I beg your pardon?" She laughs, warm and amazed, a laugh for a whole dining room. "Porter, it's four in the morning. You're tired. We're all tired. Goodnight." And she walks round you as if you were a pillar, and her door clicks shut.
    04:15. Spoke to Mrs. Lark outside 901. She went to bed. # hand
    -> lamps_out
* [Apologise, and let her pass]
    "I beg your pardon, madam."
    "Not at all." She pats your arm as she passes. "You've had a long night."
    04:15. Spoke to Mrs. Lark outside 901. Apologised. # hand
    -> lamps_out

= the_list
You tell her. You hadn't known you were keeping a list, but you have been, all night.
{ clues ? shawl:
    "You helped Mrs. Marchbank with her shawl at dinner, and after that she had no key."
}
{ clues ? shoes:
    "Mr. Lark's shoes have never touched the ground in this town."
}
{ clues ? green_ring:
    "Your ring is brass, madam. It's left its mark."
}
{ clues ? early_boat:
    "Mr. Quill's bird would like to know if you'll be catching the early boat."
}
{ clues ? packed_case:
    "You were packing at half past two, on a honeymoon booked for a week."
}
{ clues ? bolster:
    "And your husband is a bolster."
}
{ clues ? wire_text:
    "And they know about Brightsand. And Port Owen."
}
{ clues ? lipstick:
    "And you left your cigarette burning in the ballroom."
}
{ evidence() >= 4 + rose_alert / 2:
    -> she_folds
}
She hears you out with her head on one side, the way Bosun listens. "What a lot of little things," she says, kindly. "Do you know what they add up to, porter? A tired man at four in the morning." And she walks round you, and her door clicks shut, and you are left holding your little things.
04:15. Spoke to Mrs. Lark outside 901. Not enough. # hand
-> lamps_out

= she_folds
~ rose_state = "folded"
For a long moment Mrs. Lark says nothing at all. Somewhere far below, the tide turns over under the pier.
{ pearls_at == "rose":
    Then she takes her hand out of her pocket and lays the pearls in your palm, still warm, the way you'd hand back a book you'd borrowed and not enjoyed.
    ~ pearls_at = "returned"
- else:
    Then she holds up the brass key with its 901 fob, and drops it into your top pocket, and pats it. "There was nothing in the drawer anyway," she says. "Somebody got there before me." She looks at your jacket, and almost smiles.
    { pearls_at == "drawer":
        ~ pearls_at = "returned"
    }
}
"You'd have made a good one," she says. "Our sort. You notice." And she goes back into 905 and shuts the door, quite gently, as if there were somebody asleep inside.
04:15. Spoke to Mrs. Lark outside 901. She gave something back. # hand
-> lamps_out


// ─── 05:00 · The lamps go out ───────────────────────────────

=== lamps_out
~ at(300)
# entry: 05:00 The lamps go out
# scene: pier
At five o'clock the pier lamps go out, all at once, the way they do every morning: a clunk somewhere in the town, and the long double line of lights is simply gone, and the sea is grey instead of black. # sfx: lamps
{
- rose_state != "free":
    -> quiet_hour
- pearls_at == "pocket":
    -> goodbye
- else:
    -> alarm
}

= quiet_hour
~ tick(20)
# scene: desk
{ rose_state == "caught":
    The last hour goes slowly. Mr. Grey sits on the alcove sofa with Mrs. Lark beside him, both of them very upright, like people waiting for a train. Nobody speaks. Once she asks you for a light{ pockets ? matches:, and you give her one| and you haven't got one}.
- else:
    The last hour goes slowly. At twenty to six, from the tall window at the end of the corridor, you watch two figures walk the length of the dark pier with two suitcases between them: a woman in a travelling suit, and a man, real after all, and smaller than you'd imagined. At the end of the pier they go down the iron steps, and a launch goes out across the grey water with its wake behind it like a long white thread.
}
05:40. All quiet on nine. # hand
-> morning

= goodbye
~ tick(15)
# scene: desk
At a quarter past five Mrs. Lark comes along the corridor in her travelling suit, gloves on, a little case in her hand.
"We're going out on the early boat," she says. "Teddy's gone down ahead with the luggage. Round the bay to see the sun come up. Isn't it romantic?"
{ rose_knows:
    -> embrace
}
She doesn't stop at the desk. She found an empty drawer at four o'clock and has had an hour to think about it, and she can't think of anyone who would hand a fortune to a porter.
"Goodbye, porter," she says from the lift. "Thank you for the cocoa." # sfx: lift
05:15. 905 checked out early. Early boat. # hand
-> morning

= embrace
She stops at your desk. "You've been so kind," she says, and comes round the end of it with her arms open, the way people do on railway platforms.
- (ask_embrace)
<- notebook(-> ask_embrace)
* [Let her embrace you]
    ~ hugged = true
    { evidence() >= 3:
        You let her. And because you've watched her all night you're ready for it when it comes: a small light touch at the inside of your jacket, like a moth landing. You put your hand over hers.
        "Not those, Mrs. Lark."
        She looks up at you, and for a moment she's somebody else entirely, somebody tired and clever and not very old. Then she laughs, and takes her hand back empty. "Worth a try," she says. "You'd be surprised how often it is."
        05:15. 905 checked out early. Nothing missing. # hand
        -> morning
    }
    She smells of violets. She holds you exactly as long as is polite and not a moment longer, and kisses the air beside your cheek, and goes.
    ~ pockets -= the_pearls
    ~ pearls_at = "rose"
    05:15. 905 checked out early. Early boat. # hand
    -> pocket_light
* [Offer your hand across the desk]
    You offer your hand across the desk instead. She looks at it, and at you, and laughs, and shakes it with a grip like a man's. "Spoilsport," she says, and goes down in the lift. # sfx: lift
    05:15. 905 checked out early. Shook hands. # hand
    -> morning
* [Keep the desk between you]
    "Safe journey, madam."
    "Oh, you are a stick," she says fondly, and goes.
    05:15. 905 checked out early. # hand
    -> morning

= pocket_light
~ tick(5)
You sit back down, and the desk chair takes your weight the way it has all night, and your jacket doesn't. It's lighter on the left side. Lighter over the heart.
- (ask_pocket_light)
<- notebook(-> ask_pocket_light)
* [Go after her]
    -> chase
* [Ring down for the constable, and wait]
    -> wait

= alarm
~ at(310)
At ten past five the board goes.
-> bell(901) ->
It rings, and rings, and doesn't stop.
-> door_901 ->
# scene: corridor
Mrs. Marchbank is sitting up in bed with the bedside drawer open and empty in her lap, and her face has gone the colour of the sheets.
"They're gone," she says. "Arthur's pearls."
{ key_taken:
    On the carpet just inside the door, where anyone would see it, lies your pass key on its chain.
}
- (ask_alarm)
<- notebook(-> ask_alarm)
* [Sit with her a moment]
    ~ tick(10)
    ~ trust_ida += 1
    You sit on the edge of the chair by the bed, which a porter must never do, and she takes your hand, which a guest must never do, and neither of you mentions it. "They were only pearls," she says, not believing it. "Arthur was the thing."
    -> ask_alarm
* { evidence() >= 2 || saw_theft } [It was Mrs. Lark. Go after her.]
    -> chase
* { clues ? name_ashdown } [It was the man in 907]
    -> accuse
* [Ring down for the constable, and wait]
    -> wait

= accuse
~ accused_grey = true
~ tick(10)
You ring down, and tell the night clerk to fetch the constable, and when he comes, out of breath, at a quarter to six, you tell him about the man in 907: a stranger off the last train who wanted to know who else was on the floor{ clues ? name_varga:, and whose case has somebody else's name on it}{ clues ? wire_text:, and who gets telegrams about thieves}.
{grey_uc()} opens his door to the constable's knock with his tie still knotted and his hands in plain sight. He looks at the constable, and then at you, and his face doesn't do anything at all. # sfx: knock
"Look out of the window, constable," he says. "Quickly, if you would."
Out on the grey water, far beyond the end of the pier, a launch is going away towards the headland with its wake behind it like a long white thread.
05:45. Fetched the constable to 907. # hand
-> morning

= wait
~ tick(30)
You ring down for the constable, and { hugged: sit at the desk while you wait, turning the pencil over and over|sit with Mrs. Marchbank while you wait}, because there's nothing else to do with your hands.
He comes at twenty to six, out of breath, with his helmet under his arm, and writes everything down very slowly in a notebook smaller than yours. By the time he looks up from it, the honeymoon suite is empty and the bolster is alone in the bed.
05:40. Constable called. Statement given. # hand
-> morning

= chase
~ tick(5)
# scene: corridor
-> door_905 ->
The room is empty. Teddy is a bolster with the sheet drawn up. The wardrobe stands open on its hangers like a mouth.
-> pier


// ─── The pier ───────────────────────────────────────────────

=== pier
# scene: pier
~ on_pier = true
~ temp boat_at = 340
{ rose_alert >= 2:
    ~ boat_at = 330
}
You go down the service stairs three at a time and out under the pier, where the tide is in and slapping at the iron legs, and up the steps onto the boards. The pier is half a mile long. It has never been longer.
{
- weather == 2 && pockets ? torch:
    ~ tick(15)
    The fog is thick as fleece. Your torch makes a small brown room in it, and you run inside the room, board by board, counting the dead lamps.
- weather == 2:
    ~ tick(25)
    The fog is thick as fleece. You run with one hand on the rail so as not to run off the edge of the world, and twice you stop because you think you hear an engine, and it's only your heart.
- weather == 3:
    ~ tick(20)
    The wind comes straight off the sea and leans on you all the way, and your eyes stream, and your cap goes over the rail and into the grey.
- else:
    ~ tick(15)
    The sky is going pale at the edges. You run down the long double row of dead lamps with your shadow running ahead of you.
}
{ clock <= boat_at:
    -> in_time
}
-> too_late

= in_time
At the very end of the pier, at the top of the iron steps, Mrs. Lark is handing her little case down to a man in a cap who is standing in a hired launch with the engine coughing. Teddy. Real after all, and smaller than you'd imagined.
She turns at the sound of your feet on the boards.
- (ask_in_time)
<- notebook(-> ask_in_time)
* [Grab for the little case]
    -> grab
* [Call her by her name]
    -> call_her
* [Let her go]
    You stop. You stand at the rail with your chest heaving and you let her go down the steps, because she's twenty and you're not, and because some part of you is tired of the whole business. She raises one gloved hand to you as the launch pulls away.
    05:35. Pier end. Let her go. # hand
    -> morning

= grab
You lunge for the case as it goes down, and get the handle, and for one long second you and Teddy hold it between you over six feet of cold green water.
Then Mrs. Lark says, "Oh, let him have it, Teddy," quite crossly, the way you'd speak to a dog, and Teddy lets go, and you sit down hard on the wet boards with the case in your lap.
~ pearls_at = "recovered"
By the time you've got the clasp open, the launch is fifty yards out. The pearls are in a sponge bag, coiled like a sleeping thing.
05:35. Pier end. Recovered one case. # hand
-> morning

= call_her
"Mrs. Lark!"
She stops on the third step down. "It isn't, you know," she says. "Lark. It never was."
{ evidence() >= 3 || saw_theft:
    Then she takes the pearls from her pocket and tosses them up to you, underarm, the way you'd throw a ball to a child. You catch them against your chest.
    "They never suited me," she says. "Pearls want an old neck." And she steps down into the launch, and Teddy opens the throttle, and they go.
    ~ pearls_at = "recovered"
    05:35. Pier end. She threw them back. # hand
- else:
    She looks at you with a kind of pity, and steps down into the launch, and Teddy opens the throttle, and they go.
    05:35. Pier end. Too slow. # hand
}
-> morning

= too_late
At the end of the pier the iron steps go down into empty water. Out on the grey, far off already, a launch is going away towards the headland with its wake behind it like a long white thread.
05:45. Pier end. Nobody there. # hand
-> morning


// ─── 06:00 · The day porter ─────────────────────────────────

=== morning
~ at(360)
# entry: 06:00 The day porter
# scene: dawn
{ on_pier:
    You walk back the length of the pier while the light comes up: a thin clean line along the bottom of the sky, the colour of the inside of a shell. By the time you reach the hotel steps it's six, and Hollis is coming along the promenade with his collar up. # sfx: gull
- else:
    At six the lift comes up with Hollis in it, and the light comes up with him: a thin clean line along the bottom of the sky, the colour of the inside of a shell. # sfx: gull
}
{
- accused_grey:
    -> wrong_man
- rose_state == "caught":
    -> caught
- pearls_at == "returned":
    -> word
- pearls_at == "recovered":
    -> boat
- pearls_at == "pocket":
    -> keep_or_return
- key_taken:
    -> porters_key
- else:
    -> tide
}

= keep_or_return
"Quiet night?" says Hollis.
Your jacket is heavy on the left side. Mrs. Marchbank will be down to breakfast at eight, and she will ask you, and she'll believe whatever you tell her. Everybody saw Mrs. Lark go out on the early boat.
- (ask_keep_or_return)
<- notebook(-> ask_keep_or_return)
* [Take the pearls up to 901]
    -> trust
* [Keep them]
    -> kept

= caught
~ tips += 10
Mr. Penhallow comes up at half past six in yesterday's collar, with a constable behind him, and they find Mr. Grey and Mrs. Lark exactly where you left them, side by side on the alcove sofa.
{ pearls_at == "grey":
    The pearls lie on the desk on a clean napkin, where everybody can see them.
- else:
    On the desk lies a brass key with a 901 fob, which is not much to hang a woman on. Then you take the pearls out of your jacket and lay them on a napkin beside it, and Mr. Grey looks at you, and laughs out loud for the first time since he came off the train.
}
Teddy turns out to be real. They find him at the bottom of the pier steps in a hired launch, with two suitcases and a thermos of tea, and he gives himself up with what the constable describes as a look of relief.
Mrs. Marchbank comes down to breakfast at eight in her mussel-coloured dress, with Arthur's pearls at her throat, and takes your hand in both of hers and says nothing at all, which is the most anyone has said to you in eleven seasons. Afterwards there's a ten-shilling note folded small in your palm. # sfx: coins
Mr. Grey leaves on the ten o'clock train under one name. At the lift he shakes your hand. "If you ever get tired of carrying things," he says, and doesn't finish, and doesn't need to.
-> quill_coda ->
06:00. Relieved by Hollis. One arrest on nine. Nothing missing. # hand
~ file_report("caught", "Caught on the Ninth Floor")
-> END

= word
~ tips += 5
{ grey_plan || pockets ? card:
    At breakfast Mr. Grey is furious, and then, over the second pot of tea, a little less furious.
    "You let her go."
    "I got the pearls back, sir. You said with the goods or not at all."
    He looks at you for a long time. Then he laughs, once, like a cough. "So I did," he says.
- else:
    Nobody asks you anything. That's the thing about a porter's night: if it goes well, it never happened.
}
You didn't ring down when the launch went out. You aren't sure, even now, that you were right not to.
Mrs. Marchbank comes down at eight wearing Arthur's pearls, and never knows they were out of the drawer, and tips you a florin for the trouble over her key. # sfx: coins
-> quill_coda ->
06:00. Relieved by Hollis. Nothing to report. # hand
~ file_report("word", "A Word at the Door")
-> END

= boat
~ tips += 5
You have the pearls in your fist, and the gulls start up all at once, as though somebody had wound them.
Mrs. Marchbank is waiting at the lift in her dressing gown. You put the pearls into her hands, still damp with sea air, and she holds them against her face for a moment, the way you'd hold a letter.
"Arthur always said," she says, and doesn't say what Arthur always said.
{ grey_plan || pockets ? card:
    Mr. Grey telephones the harbour master at Port Owen, who telephones the coastguard, who are very interested in a hired launch with a man in a cap and a woman in a travelling suit. "With the goods or not at all," says Mr. Grey. "Well. We have the goods."
}
The ten-shilling note she gives you at breakfast is folded so small it takes you a minute to understand it. # sfx: coins
-> quill_coda ->
06:00. Relieved by Hollis. Pearls returned to 901. Two guests left by sea. # hand
~ file_report("boat", "The Early Boat")
-> END

= trust
~ tips += 10
You carry them up at eight on a folded napkin on a silver tray, because some things deserve the tray.
Mrs. Marchbank takes them and puts them on, there in the corridor, and fastens the clasp without looking, the way she has a thousand times. "Arthur always said," she tells you, "trust the porter, never the safe. He'd have liked you."
{ key_taken:
    Then she hands you something else: your pass key, on its chain. "I found it on my carpet," she says. "You must have dropped it, dear, when you locked me in."
}
{ grey_plan || pockets ? card:
    Mr. Grey takes his breakfast at the window, watching the empty sea. "Nothing stolen," he says when you bring his tea. "Nothing to arrest her for. She's gone round the headland with a bolster's worth of luggage and nothing in it." He nearly smiles. "Not a bad night's work, porter."
- else:
    Of Mrs. Lark there is nothing left but a bolster in the honeymoon bed and whatever she left in your tin.
}
The ten-shilling note is folded small, and she presses it into your hand as if it were a secret. # sfx: coins
-> quill_coda ->
06:00. Relieved by Hollis. 901's pearls returned. Nothing to report. # hand
~ file_report("trust", "Trust the Porter")
-> END

= kept
At eight Mrs. Marchbank comes down to breakfast and asks you, very gently, for her pearls.
{ hugged:
    You tell her about Mrs. Lark at the desk at a quarter past five, and her arms round you like a railway platform, and how you never thought, never once, until the lift had gone.
- else:
    You tell her that you put them back in the drawer when you locked her in, that you're certain of it, and that Mrs. Lark had a key.
}
Everybody believes you. Why wouldn't they? A thief went out on the early boat, and a thief is a thief, and you are the porter, and have been for eleven seasons.
Mrs. Marchbank pats your hand. "It wasn't your fault, dear," she says. "They were only pearls. Arthur was the thing."
At eleven you hang up your jacket in the staff cloakroom for the winter. It hangs a little crooked, heavier on the left side, over the heart.
06:00. Relieved by Hollis. Nothing to report. # hand
~ file_report("kept", "Not What They Seem")
-> END

= tide
The constable comes and goes. Mr. Penhallow comes and goes. The bolster stays in the honeymoon bed until the chambermaid takes it away at ten, folded over her arm like a drowned man.
Mrs. Marchbank comes down to breakfast at eight in her mussel-coloured dress, with nothing at her throat. She eats a whole kipper. "They were only pearls," she tells you, and this time she almost believes it. "Arthur was the thing, and they can't take him. He's not in a drawer."
{ trust_quill > 0:
    At the next table Bosun, under his cloth, says in a young woman's voice, "The early boat, Teddy," and the constable, who is having his breakfast on the house, puts down his fork and takes out his notebook again.
}
-> quill_coda ->
06:00. Relieved by Hollis. 901 reports pearls missing. Two guests left without paying. # hand
~ file_report("tide", "Gone with the Tide")
-> END

= wrong_man
{ pockets ? card:
    The constable takes a long time over Mr. Grey's card.
- else:
    The man in 907 hands the constable a card. It has another name on it, Grey, and this one turns out to be true. The constable takes a long time over it.
} He telephones London from the front desk, in his slowest voice, and London tells him something that makes him take his helmet off.
By the time anyone looks for the honeymooners, the honeymoon suite is empty, and the launch is round the headland, and Arthur's pearls are with it.
Mr. Penhallow calls you into his office at seven. He is not unkind. He has a list in front of him, written very small. "An insurance man," he says. "On the last night of the season." He doesn't say anything about next season, and neither do you.
{grey_uc()} passes you at the lift with his one suitcase and his three names. "You meant well," he says. "That's the trouble with most people."
06:00. Relieved by Hollis. 907 questioned in error. 901 reports pearls missing. # hand
~ file_report("wrong", "The Wrong Man")
-> END

= porters_key
The constable picks your pass key up off the carpet of 901 with his handkerchief, as though it were hot. He holds it up to the window, and the chain turns slowly in the dawn.
"Yours?" he says.
You tell him about the parrot, and the jacket, and Mrs. Lark smoothing your lapel. He writes it all down very slowly. Written down, it sounds like a story somebody would tell.
By ten the honeymoon suite is stripped and the launch is long gone, and Mr. Penhallow has your ledger on his desk, open at three o'clock, and his reading glasses on.
"It's not that anyone thinks you did it," he says. "It's that you can't say you didn't."
06:00. Relieved by Hollis. Pass key found in 901. Ledger handed to Mr. Penhallow. # hand
~ file_report("key", "The Porter's Key")
-> END


// ─── Codas ──────────────────────────────────────────────────

=== quill_coda
{ trust_quill > 0:
    ~ pockets += feather
    On your way out, Mr. Quill stops you by the lift and puts something in your hand: one long red tail feather. "Bosun's compliments," he says. "He doesn't give them to everybody." # sfx: parrot
}
->->
