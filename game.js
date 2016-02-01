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
            { r: 1.5, c: 0.5, type: "blob", color: "black" }
        ],
        edge: [
            { r: 0, c: 0.5, type: "blocked" },
        ],
        corner: [
            { r: 0, c: 1, type: "exit" },
            { r: 2, c: 0, type: "entrance" }
        ],
    }
};

function Game() {
    var game = this;
    var line = {
        segments: [],
        next: null,
    }

    game.init = function(puzzle, callback) {
        game.puzzle = puzzle;
        game.nextDirection = null;

        line.segments.push([0, 2]);
        setInterval(callback, 1000/30.0);
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
    
    game.update = function() {
        if (line.next) {
            if (!line.next.maxProgress ||
                line.next.sign < 0 ||
                line.next.progress < line.next.maxProgress) {
                line.next.progress += 0.02 * line.next.sign;
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

        if (next[1] < 0 || next[1] >= game.puzzle.rows ||
            next[0] < 0 || next[0] >= game.puzzle.cols) {
            return;
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

        var maxProgress = null;

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
            sign: 1
        };
    };

    game.draw = function (canvas, ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        WithContext(ctx, game.drawParams(0, 0),
                    function () {
                        ctx.strokeStyle = ctx.fillStyle = '#eee';
                        var last = null;

                        ctx.beginPath();
                        ctx.lineWidth = 1;
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
                            ctx.arc(headx, heady, 0.5, 2*Math.PI, 0);
                            ctx.fill();
                        }

                        _(line.segments).each(function (seg) {
                            var x = seg[0] * 10; 
                            var y = seg[1] * 10;
                            ctx.beginPath();
                            ctx.arc(x, y, 0.5, 2*Math.PI, 0);
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

        _(game.puzzle.area).each(function (area) {
            WithContext(ctx, game.drawParams(area.c, area.r),
                        function () {
                            ctx.fillStyle = area.color;
                            if (area.type == "blob") {
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
                                ctx.beginPath();
                                ctx.moveTo(0, 0);
                                ctx.lineTo(5, 0);
                                ctx.stroke();

                                ctx.beginPath();
                                ctx.arc(5, 0, 1, 2*Math.PI, 0);
                                ctx.fill();
                            }
                        });
        });

        ctx.restore();
    }
}

function UserInterface() {
    var ui = this;
    ui.game = null;

    ui.init = function(game) {
        ui.game = game;

        var map_canvas = document.getElementById("canvas-map");
            
        ui.redraw = function() {
            var objects_canvas = document.getElementById("canvas-objects");
            var ctx = objects_canvas.getContext("2d");
            WithContext(ctx, {},
                        function () {
                            game.draw(objects_canvas, ctx);
                            // game.draw(map_canvas,
                            //           map_canvas.getContext("2d"));
                        });
        };
        function updateAndDraw() {
            // Run physics N times
            for (var i = 0; i < 1; ++i) {
                game.update();
            }
            // Then draw the last state
            ui.redraw();
        };
        game.init(puzzles.tutorial1, updateAndDraw);
        game.drawBase(map_canvas,
                      map_canvas.getContext("2d"));
        ui.redraw();
    }

    ui.keyup = function(event) {
        ui.checkKeyUp(event, null, 87, 83, 65, 68);
        ui.checkKeyUp(event, null, 38, 40, 37, 39);
    };

    ui.checkKeyUp = function(event, launcher, up, down, left, right) {
        if (event.keyCode == up) {
        } else if (event.keyCode == right) {
        } else if (event.keyCode == left) {
        }
    };

    ui.keydown = function(event) {
        ui.checkKeyDown(event, null, 87, 83, 65, 68);
        ui.checkKeyDown(event, null, 38, 40, 37, 39);
    };
    
    ui.checkKeyDown = function(event, launcher, up, down, left, right) {
        if (event.keyCode == up) {
            ui.game.setDirection('up');
        } else if (event.keyCode == down) {
            ui.game.setDirection('down');
        } else if (event.keyCode == right) {
            ui.game.setDirection('right');
        } else if (event.keyCode == left) {
            ui.game.setDirection('left');
        }
    };
}

function init() {
    game = new Game();
    
    if (!ui) {
        ui = new UserInterface(game);
    }
    ui.init(game);
    return game;
}
