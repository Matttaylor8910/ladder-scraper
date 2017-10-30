const fs = require('fs');
const _ = require('lodash');

function doIt() {
  fs.readFile('singles.json', 'utf8', function (err, data) {

    // load in the games
    if (err) throw err;
    var games = JSON.parse(data);

    var players = new Set();
    // iterate through the games adding any new players to the list
    _.each(games, function (game) {
      if (!game.player1.name.includes(' (#') && !game.player2.name.includes(' (#')) {
        players.add(game.player1.name);
        players.add(game.player2.name);
      }
    });

    // parse players and output
    var array = Array.from(players);
    fs.writeFile('players.json', JSON.stringify(array), 'utf8');
  })
}

doIt();