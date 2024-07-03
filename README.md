# Browser Ball

This is the source code for Browser Ball, which I recently found on an old hard drive. I'm moving it here to keep it safe, unwind the code minification, add some comments, and, god help me, maybe make some improvements.

## Running the Code

The easiest way is to spin up a web server. If you have Python 3 installed, then from the repo root:

```sh
python3 -m http.server &> /dev/null &; open http://localhost:8000
```

## The Point of This

I thought I'd lost the source code for Browser Ball years ago, but recently found a minified version on an old external drive. I'm getting it checked into source control before I lose it again, and then I'd like to slowly unwind the minification and add some documenting comments. I'll try to tag any major progress along the way, so the original version is easy to get back to.

Once that's done, I'd like to fix a bunch of bugs and improve some aspects of the experiment that haven't aged well. For instance, I don't remember it feeling quite so terrible to throw the ball as it does now; I think my velocity sampling code has not aged well. And frankly, I do not remember how I implemented collision detection, only that it was completely made up based on almost no prior experience and done very quickly. It might be neat/terrifying to revisit that.

## History

Sometime around 2008 or 2009, while working at https://instrument.com, I was given the opportunity to contribute to a showcase for Google's brand new browser, Chrome. The showcase was called Chrome Experiments, a collection of Javascript toys that would highlight the performance of Google's V8 engine, which was shipping with the new browser. The project wound up recruiting a bunch of extremely talented JS and Flash developers, and also me. I was only able to contribute because our studio was building the showcase website itself and I was between projects at the time.

I had a really stupid idea that I couldn't seem to properly convey to anyone: what if you could form a continugous space using overlapping browser windows, and then, like... _do_ something with that? No one got it, but they let me work on my idea for a few weeks anyway. Once I had a functional proof of concept, it became a different story: people seemed weirdly mesmerized with that stupid little beach ball. Even in its completed state, while it's not much of a game, Browser Ball _is_ strangely satisfying to fool around with. Sometimes you get lucky and an idea actually pans out.

Browser Ball wound up having a couple of moments in the sun over the years.. I remember it being on the front page of Hacker News shortly after it launched, and re-emerging there again years later for seemingly no reason. I never put any stat tracking on the launch page and never listed any contact info anywhere, so who knows what its reach was. But I've run into a handful of people who have brought it up unbidden or known what it was if I mentioned it, so it must've had some traction.

I left Instrument a couple of years after Chrome Experiments launched, and some number of years after that they shut down the server hosting Browser Ball. I thought I'd forgotten to grab a copy of the source code, but it turns out I (kinda) didn't! And so, I guess: here we are.
