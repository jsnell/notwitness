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

    game.init = function(puzzle) {
        game.puzzle = puzzle;
    };
    
    game.update = function() {
    };

    game.draw = function (canvas, ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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
                            ui.game.draw(objects_canvas, ctx);
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
        ui.checkKeyUp(event, ui.left, 87, 83, 65, 68);
        ui.checkKeyUp(event, ui.right, 38, 40, 37, 39);
    };

    ui.checkKeyUp = function(event, launcher, up, down, left, right) {
        if (event.keyCode == up) {
        } else if (event.keyCode == right) {
        } else if (event.keyCode == left) {
        }
    };

    ui.keydown = function(event) {
        ui.checkKeyDown(event, ui.left, 87, 83, 65, 68);
        ui.checkKeyDown(event, ui.right, 38, 40, 37, 39);
    };
    
    ui.checkKeyDown = function(event, launcher, up, down, left, right) {
        if (event.keyCode == up) {
        } else if (event.keyCode == down) {
        } else if (event.keyCode == right) {
        } else if (event.keyCode == left) {
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
