var game;
var ui;

function WithContext(ctx, params, fun) {
    ctx.save();
    try {
        if (params.scale != null) {
            ctx.scale(params.scale, params.scale);
        }
        if (params.translateX != null) {
            ctx.translate(params.translateX, params.translateY);
        }
        if (params.rotate != null) {
            ctx.rotate(params.rotate);
        }
        fun.call();
    } finally {
        ctx.restore();
    }
}

var puzzles = {
    tutorial1: {
        rows: 3,
        cols: 2,
        area: [
            { r: 0.5, c: 0.5, type: "blob", color: "white" },
            { r: 1.5, c: 0.5, type: "blob", color: "black" },
        ],
        edge: [
            { r: 0, c: 0.5, type: "blocked" },
            { r: 2, c: 0.5, type: "blocked" },
        ],
        corner: [
            { r: 0, c: 1, type: "exit", direction: 'up' },
            { r: 2, c: 0, type: "entrance" },
        ],
        unlock: "tutorial2",
        active: true,
    },
    tutorial2: {
        rows: 3,
        cols: 4,
        area: [
            { r: 0.5, c: 0.5, type: "blob", color: "white" },
            { r: 1.5, c: 0.5, type: "blob", color: "white" },
            { r: 1.5, c: 2.5, type: "blob", color: "black" },
        ],
        edge: [
        ],
        corner: [
            { r: 0, c: 1, type: "exit", direction: 'up' },
            { r: 2, c: 1, type: "entrance" },
        ],
        unlock: "tutorial3",
        active: false,
    },
    tutorial3: {
        rows: 3,
        cols: 3,
        area: [
            { r: 0.5, c: 0.5, type: "blob", color: "white" },
            // { r: 0.5, c: 1.5, type: "inherit", id: "tutorial2" },
            { r: 0.5, c: 1.5, type: "blob", id: "black" },
            { r: 1.5, c: 0.5, type: "blob", color: "white" },
            { r: 1.5, c: 1.5, type: "blob", color: "black" },
        ],
        edge: [
        ],
        corner: [
            { r: 0, c: 1, type: "exit", direction: 'up' },
            { r: 2, c: 1, type: "entrance" },
        ],
        unlock: "tutorial4",
        active: false,
    }
};

function directionToDelta(direction) {
    var xd = 0, yd = 0;
    if (direction == 'up') {
        yd = -1;
    } else if (direction == 'down') {
        yd = 1;
    } else if (direction == 'right') {
        xd = 1;
    } else if (direction == 'left') {
        xd = -1;
    }

    return [xd, yd];
}

function Game() {
    var game = this;
    var line;
    var updateAndDraw;
    var gameOverCallback;
    var timer;
    
    game.init = function(puzzle, update_cb, game_over_cb) {
        game.puzzle = puzzle;
        updateAndDraw = update_cb;
        gameOverCallback = game_over_cb;

        game.reset();
    };

    game.reset = function() {
        game.speed = 1;
        game.nextDirection = null;
        game.failedSymbols = [];
        game.animateState = 0;
        game.over = false;
        line = {
            segments: [],
            next: null,
        }

        _(game.puzzle.corner).each(function (corner) {
            if (corner.type == 'entrance') {
                line.segments.push([corner.c, corner.r]);
            }
        });
    }

    game.pause = function() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    };
    game.start = function() {
        if (!timer) {
            timer = setInterval(updateAndDraw, 1000/30.0);
        }
    };

    game.setDirection = function(direction) {
        var next = line.next;
        if (next) {
            if (direction == next.reverseDirection) {
                next.sign = -1;
                game.nextDirection = null;
            } else if (direction == next.direction) {
                next.sign = 1;
                game.nextDirection = direction;
            } else {
                game.nextDirection = direction;
            }
        } else {
            game.nextDirection = direction;
        }
    }

    game.finishLevel = function() {
        game.failedSymbols = game.findFailedSymbols();
        game.over = true;
        game.animateState = 0;

        if (gameOverCallback) {
            gameOverCallback();
        }
    }

    game.won = function() {
        return game.over && game.failedSymbols.length == 0;
    };

    game.findFailedSymbols = function() {
        var areas = game.findSymbolsByArea();
        var errors = [];
        _(areas).each(function(area) {
            _(area).each(function(symbol) {
                if (!game.validateSymbol(symbol, area)) {
                    errors.push(symbol);
                }
            });
        });

        return errors;
    }

    game.validateSymbol = function(symbol, area) {
        if (symbol.type == 'blob') {
            return !area.find(function (other) {
                return other.type == 'blob' && other.color != symbol.color;
            });
        }

        return false;
    };

    game.findSymbolsByArea = function() {
        var edges = {};
        var prev = null;
        _(line.segments).each(function(seg) {
            if (prev != null) {
                var c = (seg[0] + prev[0]) / 2;
                var r = (seg[1] + prev[1]) / 2;
                edges[[c, r]] = true;
            }
            prev = seg;
        });

        var areas = [];
        var id = 0;
        for (var c = 0; c < game.puzzle.cols - 1; ++c) {
            var col = [];
            areas[c] = col;
            for (var r = 0; r < game.puzzle.rows - 1; ++r) {
                col.push(++id);
            }
        }

        function merge(x, y) {
            for (var r = 0; r < game.puzzle.rows - 1; ++r) {
                for (var c = 0; c < game.puzzle.cols - 1; ++c) {
                    if (areas[c][r] == y) {
                        areas[c][r] = x;
                    }
                }
            }
        }

        function tryMerge(loc1, loc2) {
            if (loc2[0] >= game.puzzle.cols - 1||
                loc2[1] >= game.puzzle.rows - 1) {
                return;
            }
            var edge = [ (loc1[0] + loc2[0]) / 2 + 0.5,
                         (loc1[1] + loc2[1]) / 2 + 0.5 ];
            if (edges[edge]) {
                return;
            }
            merge(areas[loc1[0]][loc1[1]],
                  areas[loc2[0]][loc2[1]])
        }

        for (var r = 0; r < game.puzzle.rows - 1; ++r) {
            for (var c = 0; c < game.puzzle.cols - 1; ++c) {
                tryMerge([c, r], [c, r + 1]);
                tryMerge([c, r], [c + 1, r]);
            }
        }

        var symbols = {};

        _(game.puzzle.area).each(function (area) {
            var id = areas[area.c - 0.5][area.r - 0.5];
            if (!symbols[id]) {
                symbols[id] = []
            }
            symbols[id].push(area);
        });

        return _(symbols).values();
    };
    
    game.update = function() {
        game.animateState++;

        if (game.over) {
            return;
        }
        var scale = Math.sqrt(Math.max(game.puzzle.cols, game.puzzle.rows));

        if (line.next) {
            if (!line.next.maxProgress ||
                line.next.sign < 0 ||
                line.next.progress < line.next.maxProgress) {
                line.next.progress += scale * 0.02 * line.next.sign;
            } else if (line.next.exit) {
                game.finishLevel();
            }

            if (line.next.progress <= 0) {
                if (!game.nextDirection) {
                    game.nextDirection = line.next.reverseDirection;
                }
                line.next = null;
            } else if (line.next.progress >= 1) {
                line.segments.push(line.next.loc);
                line.next = null;
            }
        }
        if (!line.next) {
            game.selectTarget();
        }
    };

    game.selectTarget = function () {
        var last = line.segments[line.segments.length - 1]
        var last2nd = null;
        var next;
        var direction = game.nextDirection;
        var reverseDirection;
        var maxProgress = null;

        if (direction == 'up') {
            next = [last[0], last[1] - 1]
            reverseDirection = 'down';
        } else if (direction == 'down') {
            next = [last[0], last[1] + 1]
            reverseDirection = 'up';
        } else if (direction == 'left') {
            next = [last[0] - 1 , last[1]]
            reverseDirection = 'right';
        } else if (direction == 'right') {
            next = [last[0] + 1, last[1]]
            reverseDirection = 'left';
        } else {
            return;
        }

        var exit = game.findExit(last, direction);

        if (exit) {
            next = exit;
            maxProgress = 0.2;
        } else {
            if (next[1] < 0 || next[1] >= game.puzzle.rows ||
                next[0] < 0 || next[0] >= game.puzzle.cols) {
                return;
            }
        }

        if (line.segments.length > 1) {
            last2nd = line.segments[line.segments.length - 2];
            if (last2nd[0] == next[0] &&
                last2nd[1] == next[1]) {
                line.next = {
                    loc: last,
                    progress: 1.0,
                    maxProgress: null,
                    direction: reverseDirection,
                    reverseDirection: direction,
                    sign: -1
                }
                line.segments.pop();
                return;
            }
        }

        _(line.segments).each(function(seg) {
            if (seg[0] == next[0] && seg[1] == next[1]) {
                maxProgress = 0.8;
            }
        });

        _(game.puzzle.edge).each(function(edge) {
            if (edge.type != 'blocked') {
                return;
            }
            if (edge.c != (next[0] + last[0]) / 2) {
                return;
            }
            if (edge.r != (next[1] + last[1]) / 2) {
                return;
            }
            maxProgress = 0.3;
        });

        line.next = {
            loc: next,
            progress: 0.0,
            maxProgress: maxProgress,
            direction: direction,
            reverseDirection: reverseDirection,
            exit: (exit != null),
            sign: 1
        };
    };

    game.findExit = function (loc, direction) {
        var exit = null;
        _(game.puzzle.corner).each(function(corner) {
            if (corner.type == 'exit' &&
                corner.direction == direction &&
                corner.r == loc[1] &&
                corner.c == loc[0]) {
                exit = corner;
            }
        });

        if (exit) {
            var d = directionToDelta(direction);
            return [ exit.c + d[0], exit.r + d[1] ]
        }
    }

    game.draw = function (canvas, ctx, overlay) {
        if (!overlay) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        game.drawSymbols(canvas, ctx, game.failedSymbols,
                         function (symbol, ctx) {
                             if ((game.animateState & 31) < 16) {
                                 ctx.fillStyle = '#d44';
                             } else {
                                 ctx.fillStyle = symbol.color;
                             }
                             return true;
                         });
        
        WithContext(ctx, game.drawParams(0, 0),
                    function () {
                        ctx.lineWidth = 1;

                        var color;
                        if (!game.over) {
                            color = '#eee';
                        } else if (game.failedSymbols.length == 0) {
                            color = '#fff';
                            ctx.lineWidth = 2;
                        } else {
                            color = '#d44';
                            ctx.lineWidth = 2;
                        }
                        
                        ctx.strokeStyle = ctx.fillStyle = color;
                        var last = null;

                        ctx.beginPath();
                        _(line.segments).each(function (seg) {
                            var x = seg[0] * 10; 
                            var y = seg[1] * 10;
                            if (last == null) {
                                ctx.moveTo(x, y);
                            } else {
                                ctx.lineTo(x, y);
                            }
                            last = [x, y];
                        });
                        if (line.next) {
                            var xd = ((line.next.loc[0] * 10)- last[0]) * line.next.progress;
                            var yd = ((line.next.loc[1] * 10) - last[1]) * line.next.progress;
                            var headx = last[0] + xd;
                            var heady = last[1] + yd;
                            ctx.lineTo(headx, heady);

                        }
                        ctx.stroke();

                        if (line.next) {
                            ctx.beginPath();
                            ctx.arc(headx, heady, ctx.lineWidth / 2,
                                    2*Math.PI, 0);
                            ctx.fill();
                        }

                        _(line.segments).each(function (seg) {
                            var x = seg[0] * 10; 
                            var y = seg[1] * 10;
                            ctx.beginPath();
                            ctx.arc(x, y, ctx.lineWidth / 2, 2*Math.PI, 0);
                            ctx.fill();
                        });
                    });
    };

    game.drawParams = function (c, r) {
        return { scale: game.cellSize / 10,
                 translateX: (5 + 10 * c),
                 translateY: (5 + 10 * r) }
    }

    game.drawBase = function (canvas, ctx) {
        ctx.save();
        ctx.fillStyle = '#9080c0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        game.cellSize = (canvas.width) / (0.2 + Math.max(game.puzzle.rows, game.puzzle.cols));

        ctx.fillStyle = ctx.strokeStyle = '#c0b0e0';
        ctx.lineWidth = 2;

        for (var r = 0; r < game.puzzle.rows; ++r) {
            for (var c = 0; c < game.puzzle.cols; ++c) {
                WithContext(ctx, game.drawParams(c, r),
                            function () {
                                if (c != 0) {
                                    ctx.beginPath();
                                    ctx.moveTo(0, 0);
                                    ctx.lineTo(-10, 0);
                                    ctx.stroke();
                                }
                                if (r != 0) {
                                    ctx.beginPath();
                                    ctx.moveTo(0, 0);
                                    ctx.lineTo(0, -10);
                                    ctx.stroke();
                                }
                                ctx.beginPath();
                                ctx.arc(0, 0, 1, 2*Math.PI, 0);
                                ctx.fill();
                            });
            }
        }

        game.drawSymbols(canvas, ctx, game.puzzle.area, function (symbol, ctx) {
            ctx.fillStyle = symbol.color;
            return true;
        });

        _(game.puzzle.edge).each(function (edge) {
            WithContext(ctx, game.drawParams(edge.c, edge.r),
                        function () {
                            ctx.fillStyle = '#9080c0';
                            ctx.fillRect(-1, -1, 2, 2);
                        })
        });
                       
        _(game.puzzle.corner).each(function (corner) {
            WithContext(ctx, game.drawParams(corner.c, corner.r),
                        function () {
                            if (corner.type == "entrance") {
                                ctx.beginPath();
                                ctx.arc(0, 0, 3, 2*Math.PI, 0);
                                ctx.fill();
                            }
                            if (corner.type == "exit") {
                                var d = directionToDelta(corner.direction);
                                var x = 2 * d[0];
                                var y = 2 * d[1];
                                ctx.beginPath();
                                ctx.moveTo(0, 0);
                                ctx.lineTo(x, y);
                                ctx.stroke();

                                ctx.beginPath();
                                ctx.arc(x, y, 1, 2*Math.PI, 0);
                                ctx.fill();
                            }
                        });
        });

        ctx.restore();
    }

    game.drawSymbols = function (canvas, ctx, symbols, thunk) {
        _(symbols).each(function (symbol) {
            WithContext(ctx, game.drawParams(symbol.c, symbol.r),
                        function () {
                            if (!thunk(symbol, ctx)) {
                                return;
                            }
                            if (symbol.type == "blob") {
                                ctx.beginPath();
                                ctx.arc(-1, -1, 1, 2*Math.PI, 0);
                                ctx.fill();

                                ctx.beginPath();
                                ctx.arc(-1, 1, 1, 2*Math.PI, 0);
                                ctx.fill();

                                ctx.beginPath();
                                ctx.arc(1, 1, 1, 2*Math.PI, 0);
                                ctx.fill();

                                ctx.beginPath();
                                ctx.arc(1, -1, 1, 2*Math.PI, 0);
                                ctx.fill();

                                ctx.fillRect(-2, -1, 4, 2);
                                ctx.fillRect(-1, -2, 2, 4);
                            }
                        })
        });
    };
}

function UserInterface() {
    var ui = this;
    var games = {};
    var screenshots = {};
    var game;

    ui.init = function(puzzleName) {            
        ui.redraw = function() {
            var objects_canvas = document.getElementById("canvas-objects");
            var ctx = objects_canvas.getContext("2d");
            WithContext(ctx, {},
                        function () {
                            game.draw(objects_canvas, ctx);
                        });
        };
        ui.updateAndDraw = function() {
            // Run physics N times
            for (var i = 0; i < game.speed; ++i) {
                game.update();
            }
            // Then draw the last state
            ui.redraw();
        };
        _(puzzles).each(function(elem, key) {
            ui.initScreenshot(key);
        });
        ui.switchToPuzzle(puzzleName);
    };

    ui.ensureGame = function(puzzleName) {
        var game = games[puzzleName];
        if (!game) {
            game = games[puzzleName] = new Game();
            puzzles[puzzleName].name = puzzleName;
            game.init(puzzles[puzzleName],
                      ui.updateAndDraw,
                      function () {
                          ui.updateScreenshot(game);
                          if (game.won() && game.puzzle.unlock) {
                              var unlocked = puzzles[game.puzzle.unlock];
                              unlocked.active = true;
                              ui.updateScreenshot(ui.ensureGame(game.puzzle.unlock));
                          }
                      });
        }
        return game;
    };
    
    ui.switchToPuzzle = function(puzzleName) {
        var map_canvas = document.getElementById("canvas-map");

        if (game) {
            game.pause();
            ui.updateScreenshot(game);
        }
        game = ui.ensureGame(puzzleName);
        game.start();
        
        game.drawBase(map_canvas,
                      map_canvas.getContext("2d"));
        // ui.redraw();
        ui.updateScreenshot(game);
        $('div.puzzle-selector img').removeClass('selected');
        $('#screenshot-' + puzzleName).addClass('selected');
    };

    ui.updateScreenshot = function(game) {
        var img = document.getElementById("screenshot-" + game.puzzle.name);
        if (!img) {
            img = ui.initScreenshot(game.puzzle.name);
        }

        var canvas_ss = document.getElementById("canvas-screenshot");
        var ctx = canvas_ss.getContext("2d");
        ctx.clearRect(0, 0, canvas_ss.width, canvas_ss.height);

        game.drawBase(canvas_ss, ctx);
        game.draw(canvas_ss, ctx, true);
        img.src = canvas_ss.toDataURL();

        img.onclick = function() {
            ui.switchToPuzzle(game.puzzle.name);
        };
        console.log(game.puzzle.name);
    };

    ui.initScreenshot = function(name) {
        var img = new Image();
        img.id = 'screenshot-' + name;
        $('.puzzle-selector').append(img);
        var canvas_ss = document.getElementById("canvas-screenshot");
        var ctx = canvas_ss.getContext("2d");
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas_ss.width, canvas_ss.height);
        img.src = canvas_ss.toDataURL();
        return img;
    }

    ui.keyup = function(event) {
        ui.checkKeyUp(event, null, 87, 83, 65, 68, 16);
        ui.checkKeyUp(event, null, 38, 40, 37, 39, 16);
    };

    ui.checkKeyUp = function(event, launcher, up, down, left, right, speed) {
        if (event.keyCode == up) {
        } else if (event.keyCode == right) {
        } else if (event.keyCode == left) {
        } else if (event.keyCode == speed) {
            game.speed = 1;
        } else if (event.keyCode == 32) {
            game.reset();
        }
    };

    ui.keydown = function(event) {
        ui.checkKeyDown(event, null, 87, 83, 65, 68, 16);
        ui.checkKeyDown(event, null, 38, 40, 37, 39, 16);
    };
    
    ui.checkKeyDown = function(event, launcher, up, down, left, right, speed) {
        if (event.keyCode == up) {
            game.setDirection('up');
        } else if (event.keyCode == down) {
            game.setDirection('down');
        } else if (event.keyCode == right) {
            game.setDirection('right');
        } else if (event.keyCode == left) {
            game.setDirection('left');
        } else if (event.keyCode == speed) {
            game.speed = 3;
        }
    };
}

function init() {
    if (!ui) {
        ui = new UserInterface();
    }
    ui.init('tutorial1');
}
