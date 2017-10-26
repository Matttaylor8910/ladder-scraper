const http = require('http');
const _ = require('lodash');
const htmlparser = require('htmlparser2');
var fs = require('fs');

function getData(url, isJson) {
  return new Promise(function (resolve, reject) {
    http.get(url, (resp) => {
      let data = '';

      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        resolve(isJson ? JSON.parse(data) : data);
      });

    }).on("error", (err) => {
      reject({error: err.message});
    });
  });
}

function doStuffDoubles() {
  fetchWarcraftGamesDoubles([]);

  function fetchWarcraftGamesDoubles(allGames) {
    getData('http://ladder.war2.ru/2s/games.php?offset=' + allGames.length).then(function (html) {
      var games = getGamesFromHtmlDoubles(html, allGames.length);
      if (games.length) {
        console.log('loaded games ' + allGames.length + ' - ' + (allGames.length + games.length));
        allGames = allGames.concat(games);
        fs.writeFile('doubles.json', JSON.stringify(allGames), 'utf8');
        fetchWarcraftGamesDoubles(allGames);
      } else {
        console.log('all done');
      }
    }, function (error) {
      // ignore errors ¯\_(ツ)_/¯
    });
  }
}

function doStuff() {
  fetchWarcraftGames([]);

  function fetchWarcraftGames(allGames) {
    getData('http://ladder.war2.ru/games.php?offset=' + allGames.length).then(function (html) {
      var games = getGamesFromHtml(html, allGames.length);
      if (games.length) {
        console.log('loaded games ' + allGames.length + ' - ' + (allGames.length + games.length));
        allGames = allGames.concat(games);
        fs.writeFile('myjsonfile.json', JSON.stringify(allGames), 'utf8');
        fetchWarcraftGames(allGames);
      } else {
        console.log('all done');
      }
    }, function (error) {
      // ignore errors ¯\_(ツ)_/¯
    });
  }
}

function getGamesFromHtmlDoubles(html, offset) {
  // the games that will be returned
  var games = [];

  // variables for determining if we're parsing a game
  var readingGames = false;
  var parsingGame = false;

  // properties for this game
  var thisGame = {};
  var gameCount = offset;
  var seenDefeated = false;

  // the actual parser
  var parser = new htmlparser.Parser({
    onopentag: function (name) {
      // only look at the first <ul> which is the list of games
      if (name === 'ul') {
        readingGames = true;
      }

      // if this is a list item and we're reading games, the next things coming through are properties for the game
      else if (name === 'li' && readingGames) {
        parsingGame = true;
      }
    },
    ontext: function (text) {
      // if we're parsing, do shit with it
      if (parsingGame) {

        // do nothing for defeated and blank, but switch teams
        if (text === 'defeated' || text === ' ') {
          seenDefeated = true;
        }

        // set up team1
        else if (!seenDefeated) {
          // get the first team's names
          if (!thisGame.team1) thisGame.team1 = {name: text, players: _.filter(text.split(' and '), 'length'), winner: true};
          // get the first team's rank, need to filter out some characters
          else if (!thisGame.team1.rank) thisGame.team1.rank = parseInt(strip(text));
          // set team1 as moving
          else if (text === '→') thisGame.team1.moving = true;
          // if the team is moving we need to assign their new rank
          else if (thisGame.team1.moving && !thisGame.team1.newRank) thisGame.team1.newRank = parseInt(strip(text));
        }

        // set up team2
        else {
          // get the second team's names
          if (!thisGame.team2) thisGame.team2 = {name: text, players: _.filter(text.split(' and '), 'length'), winner: false};
          // check for map case
          else if (text.includes('on') && text.includes('#')) {
            var split = text.split(' on ');
            // either assign rank or new rank, depending on where we're at
            if (!thisGame.team2.rank) thisGame.team2.rank = parseInt(strip(split[0]));
            else thisGame.team2.newRank = parseInt(strip(split[0]));
            // assign map
            thisGame.map = split[1].replace(/"/g, '');
          }
          // check date case
          else if (text.includes('on') && !text.includes('#')) {
            thisGame.date = text.replace(' on', '');
          }
          // get the second team's rank, need to filter out some characters
          else if (!thisGame.team2.rank) thisGame.team2.rank = parseInt(strip(text));
          // set team2 as moving
          else if (text === '→') thisGame.team2.moving = true;
        }

        // this is the end
        if (text === '.') {
          // push the game
          thisGame.number = gameCount++;
          games.push(thisGame);
          // then reset
          thisGame = {};
          seenDefeated = false;
        }
      }
    },
    onclosetag: function (name) {
      // stop reading the list
      if (name === 'ul') {
        readingGames = false;
      }

      // stop adding this game
      else if (name === 'li' && readingGames) {
        parsingGame = false;
      }
    }
  }, {decodeEntities: true});

  // do shit and return
  parser.write(html);
  parser.end();
  return games;
}

function getGamesFromHtml(html, offset) {
  // the games that will be returned
  var games = [];

  // variables for determining if we're parsing a game
  var readingGames = false;
  var parsingGame = false;

  // properties for this game
  var thisGame = {};
  var gameCount = offset;
  var seenDefeated = false;

  // the actual parser
  var parser = new htmlparser.Parser({
    onopentag: function (name) {
      // only look at the first <ul> which is the list of games
      if (name === 'ul') {
        readingGames = true;
      }

      // if this is a list item and we're reading games, the next things coming through are properties for the game
      else if (name === 'li' && readingGames) {
        parsingGame = true;
      }
    },
    ontext: function (text) {
      // if we're parsing, do shit with it
      if (parsingGame) {

        // do nothing for defeated and blank, but switch players
        if (text === 'defeated' || text === ' ') {
          seenDefeated = true;
        }

        // set up player1
        else if (!seenDefeated) {
          // get the first player's name
          if (!thisGame.player1) thisGame.player1 = {name: text, winner: true};
          // get the first player's rank, need to filter out some characters
          else if (!thisGame.player1.rank) thisGame.player1.rank = parseInt(strip(text));
          // set player1 as moving
          else if (text === '→') thisGame.player1.moving = true;
          // if the player is moving we need to assign their new rank
          else if (thisGame.player1.moving && !thisGame.player1.newRank) thisGame.player1.newRank = parseInt(strip(text));
        }

        // set up player2
        else {
          // get the second player's name
          if (!thisGame.player2) thisGame.player2 = {name: text, winner: false};
          // check for map case
          else if (text.includes('on') && text.includes('#')) {
            var split = text.split(' on ');
            // either assign rank or new rank, depending on where we're at
            if (!thisGame.player2.rank) thisGame.player2.rank = parseInt(strip(split[0]));
            else thisGame.player2.newRank = parseInt(strip(split[0]));
            // assign map
            thisGame.map = split[1].replace(/"/g, '');
          }
          // check date case
          else if (text.includes('on') && !text.includes('#')) {
            thisGame.date = text.replace(' on', '');
          }
          // get the second player's rank, need to filter out some characters
          else if (!thisGame.player2.rank) thisGame.player2.rank = parseInt(strip(text));
          // set player2 as moving
          else if (text === '→') thisGame.player2.moving = true;
        }

        // this is the end
        if (text === '.') {
          // push the game
          thisGame.number = gameCount++;
          games.push(thisGame);
          // then reset
          thisGame = {};
          seenDefeated = false;
        }
      }
    },
    onclosetag: function (name) {
      // stop reading the list
      if (name === 'ul') {
        readingGames = false;
      }

      // stop adding this game
      else if (name === 'li' && readingGames) {
        parsingGame = false;
      }
    }
  }, {decodeEntities: true});

  // do shit and return
  parser.write(html);
  parser.end();
  return games;
}

function strip(string) {
  return string.replace(/\(|\)| |#|"/g, '');
}

// actually do some shit for singles
// doStuff();

// actually do some shit for doubles
doStuffDoubles();