// The year was 2009, and I was reading a lot of Douglas Crockford:
window.browserball = (function () {
  // Notes: some kind of polyfill I was using when a browser supported window.screenLeft but not window.screenX (IE?). This can
  // be removed eventually; the entire world has standardized on one aliasing the other.
  var manuallySetWindowScreenX = false;

  // Notes: probably some kind of collision dampening constants?
  var a = 0.89;
  var c = 0.97;

  // Notes: I guess gravity is just a constant we add to velocity on each update interval! Either this felt better than
  // doing real gravity math or I've forgotten something I used to know about time and derivatives that makes this "just work".
  var gravity = 1;

  // Simulation update interval in milliseconds.
  // Notes: we should probably rewrite timing to use requestAnimationFrame now.
  var updateIntervalMs = 15;

  // The ball! Its position is always translated to world coordinates (the offset from `worldOrigin`) before being stored here.
  // In this way the ball's position is independent from the position of any particular window in the window manager list.
  var ball = {
    dragging: true,
    img: new Image(),
    angle: 0,
    rotation: 0,
    scale: 1,
    w: 90,
    h: 90,
    radius: 0,
    x: 0,
    y: 0,
    offset: { x: 0, y: 0 },
    drag_point: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },

    // Determines if a point is inside the ball. Supplied point should already be translated to world coordinates.
    isPointInside: function (x, y) {
      return (
        this.offset.x >=
        Math.sqrt((this.x - x) * (this.x - x) + (this.y - y) * (this.y - y))
      );
    },
  };

  // Centers the ball in the parent window and renders it inert when the reset button is pressed.
  var resetBall = function () {
    ball.dragging = true;
    ball.rotation = 0;
    ball.x = window.screenX - worldOrigin.x0 + window.innerWidth / 2;
    ball.y = window.screenY - worldOrigin.y0 + window.innerHeight / 2;
  };

  // Tracks the uppermost and leftmost coordinates of all windows to form the origin (0, 0) of world-translated coordinates.
  // I'm unsure why this wasn't built into `windowListManager`. I should clean up all usages of `screenX`\`screenY` eventually.
  var worldOrigin = {
    x0: Infinity,
    y0: Infinity,

    update: function () {
      var x,
        y,
        previousX0 = worldOrigin.x0,
        previousY0 = worldOrigin.y0,
        window;

      for (var i = 0, len = windowListManager.list.length; i < len; i++) {
        window = windowListManager.list[i].ref;
        x = x < window.screenX ? x : window.screenX;
        y = y < window.screenY ? y : window.screenY;
      }

      worldOrigin.x0 = x;
      worldOrigin.y0 = y;
      ball.x += previousX0 - x;
      ball.y += previousY0 - y;
    },
  };

  // This is the list of all open windows. We use this to calculate world bounds and if any points/lines intersect with the list.
  // Also has a bunch of utility functions for calculating things like if a point is inside a quad.
  // Notes: this should be decomposed a bit; move the geometry calculations somewhere else. Hanging the index of each child window
  // off its own global namespace isn't great and could be made better.
  var windowListManager = {
    /**
     * The list of all managed browserball windows. Each entry has the following shape:
     *   ref: the global window object for this window
     *   canvas: the canvas element we draw to
     *   context: cached 2D canvas context
     *   x1, y1: the top left corner coordinates (relative to the world origin, not the screen!)
     *   x2, y2: the bottom right corner coordinates relative to the world origin, not the screen!)
     */
    list: [],

    // Notes: really need to figure out what this list does.
    corners: [],

    // Add a window to the list of managed child windows. See `list` above for the shape of each entry.
    // Notes: Typescript, someday?
    add: function (window) {
      window.childWindowIndex = windowListManager.list.length;

      this.list.push({
        ref: window,
        canvas: window.document.getElementById("stage"),
        context: window.document.getElementById("stage").getContext("2d"),
        x1: window.screenX - worldOrigin.x0,
        y1: window.screenY - worldOrigin.y0,
        x2: window.screenX + window.innerWidth - worldOrigin.x0,
        y2: window.screenY + window.innerHeight - worldOrigin.y0,
      });

      // We might have changed the world origin by removing this window, so we'd better update everything.
      worldOrigin.update();
      windowListManager.update();
    },

    // Remove the child window at the supplied index from the list, and update the stored indices of all remaining children.
    // Notes: this doesn't recalculate the world origin or child window coordinates relative to that, but I'm almost certain
    // it should. Apparently I didn't test window removal very heavily.
    remove: function (childWindowIndex) {
      var removedChild = windowListManager.list.splice(childWindowIndex, 1)[0];

      removedChild.canvas = removedChild.context = null;
      for (var i = 0, len = windowListManager.list.length; i < len; i++) {
        windowListManager.list[i].ref.childWindowIndex = i;
      }

      return removedChild.ref;
    },

    // Update all child window quads in the event the world origin changed.
    update: function () {
      var i,
        j,
        len,
        list = windowListManager.list;

      windowListManager.corners = [];

      // Reset the coordinates for each child quad relative to a potentially updated world origin
      for (i = 0, len = list.length; i < len; i++) {
        list[i].x1 = list[i].ref.screenX - worldOrigin.x0;
        list[i].y1 = list[i].ref.screenY - worldOrigin.y0;
        list[i].x2 =
          list[i].ref.screenX + list[i].ref.innerWidth - worldOrigin.x0;
        list[i].y2 =
          list[i].ref.screenY + list[i].ref.innerHeight - worldOrigin.y0;
      }

      // Notes: I haven't figured out what finding these pairs of "world corners" is doing. I know it's used in
      // collision detection somehow.
      for (i = 0; i < len - 1; i++) {
        for (j = i + 1; j < len; j++) {
          windowListManager.findWorldCorners(list[i], list[j]);
        }
      }
    },

    // Notes: I need to figure out what this is doing.
    findWorldCorners: function (z, y) {
      var E = [
          { x1: z.x1, y1: z.y1, x2: z.x2, y2: z.y1 },
          { x1: z.x2, y1: z.y1, x2: z.x2, y2: z.y2 },
          { x1: z.x2, y1: z.y2, x2: z.x1, y2: z.y2 },
          { x1: z.x1, y1: z.y2, x2: z.x1, y2: z.y1 },
        ],
        C = [
          { x1: y.x1, y1: y.y1, x2: y.x2, y2: y.y1 },
          { x1: y.x2, y1: y.y1, x2: y.x2, y2: y.y2 },
          { x1: y.x2, y1: y.y2, x2: y.x1, y2: y.y2 },
          { x1: y.x1, y1: y.y2, x2: y.x1, y2: y.y1 },
        ],
        A = null;
      var v, u, x, D, B;
      for (v = 0; v < 4; v++) {
        for (u = (v + 1) % 4, x = 0; x < 2; u = (u + 2) % 4, x++) {
          A = windowListManager.sIntersection(E[v], C[u]);
          if (A && !windowListManager.isPointInsideAnyWindow(A.x, A.y)) {
            D = 0;
            B = 0;
            if (E[v].x1 == E[v].x2) {
              (D = E[v].y1 < E[v].y2 ? 1 : -1),
                (B = C[u].x1 < C[u].x2 ? -1 : 1);
            } else {
              (D = C[u].y1 < C[u].y2 ? 1 : -1),
                (B = E[v].x1 < E[v].x2 ? -1 : 1);
            }
            windowListManager.corners.push({ x: A.x, y: A.y, dx: D, dy: B });
          }
        }
      }
    },

    // Notes: I need to figure out what this is doing. What the hell did these s prefixes mean???
    sIntersection: function (w, v) {
      var z = { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 },
        y = { x1: v.x1, y1: v.y1, x2: v.x2, y2: v.y2 },
        u = null,
        x;
      if (z.x1 > z.x2) {
        x = z.x1;
        z.x1 = z.x2;
        z.x2 = x;
      }
      if (z.y1 > z.y2) {
        x = z.y1;
        z.y1 = z.y2;
        z.y2 = x;
      }
      if (y.x1 > y.x2) {
        x = y.x1;
        y.x1 = y.x2;
        y.x2 = x;
      }
      if (y.y1 > y.y2) {
        x = y.y1;
        y.y1 = y.y2;
        y.y2 = x;
      }
      if (z.x1 == z.x2) {
        if (z.x1 >= y.x1 && z.x1 <= y.x2 && y.y1 >= z.y1 && y.y2 <= z.y2) {
          u = { x: z.x1, y: y.y1 };
        }
      } else {
        if (y.x1 >= z.x1 && y.x1 <= z.x2 && z.y1 >= y.y1 && z.y2 <= y.y2) {
          u = { x: y.x1, y: z.y1 };
        }
      }
      return u;
    },

    // Determines if a point is inside or on the boundary of a quad
    isPointInsideOrOnEdgeOfQuad: function (x, y, quad) {
      return !!(x >= quad.x1 && x <= quad.x2 && y >= quad.y1 && y <= quad.y2);
    },

    // Determines if a point is fully inside a quad
    isPointInsideQuad: function (x, y, quad) {
      return !!(x > quad.x1 && x < quad.x2 && y > quad.y1 && y < quad.y2);
    },

    // Determines if a point is inside any child window quad in the window list
    isPointInsideAnyWindow: function (x, y) {
      var found = false;

      for (
        var i = 0, len = windowListManager.list.length;
        i < len && !found;
        i++
      ) {
        found = windowListManager.isPointInsideQuad(
          x,
          y,
          windowListManager.list[i]
        );
      }

      return found;
    },

    // Notes: I need to figure out what this is doing. What the hell did these s prefixes mean???
    sInside: function (v, B, u, A) {
      var C = false,
        p2 = false,
        z = windowListManager.list,
        w = 0;
      for (var x = 0, y = z.length; x < y && !w; x++) {
        C = windowListManager.isPointInsideOrOnEdgeOfQuad(v, B, z[x]);
        p2 = windowListManager.isPointInsideOrOnEdgeOfQuad(u, A, z[x]);
        if (C && p2) {
          return v == u ? A - B : u - v;
        } else {
          if (C && !p2) {
            if (v == u) {
              return (
                z[x].y2 -
                B +
                1 +
                windowListManager.sInside(v, z[x].y2 + 1, u, A)
              );
            } else {
              return (
                z[x].x2 -
                v +
                1 +
                windowListManager.sInside(z[x].x2 + 1, B, u, A)
              );
            }
          } else {
            if (!C && p2) {
              if (v == u) {
                return (
                  A -
                  z[x].y1 +
                  1 +
                  windowListManager.sInside(v, B, u, z[x].y1 - 1)
                );
              } else {
                return (
                  u -
                  z[x].x1 +
                  1 +
                  windowListManager.sInside(v, B, z[x].x1 - 1, A)
                );
              }
            } else {
            }
          }
        }
      }
      return 0;
    },
  };

  // Handlers for mouse interactions with the ball.
  var mouseHandlers = (function () {
    var delta = null,
      lastPosition;

    return {
      down: function (event) {
        // I believe the clientX\Y coordinates are always relative to the first child window created, so we
        // translate to offsets from the world origin, since that's how we store the ball's position.
        var parentWindow = event.target.ownerDocument.defaultView,
          worldX = parentWindow.screenX - worldOrigin.x0 + event.clientX,
          worldY = parentWindow.screenY - worldOrigin.y0 + event.clientY;

        if (ball.isPointInside(worldX, worldY)) {
          ball.dragging = true;
          ball.rotation = 0;
          ball.drag_point.x = ball.x - worldX;
          ball.drag_point.y = ball.y - worldY;

          delta = { x: 0, y: 0 };
          lastPosition = { x: worldX, y: worldY };

          parentWindow.addEventListener(
            "mousemove",
            mouseHandlers.track,
            false
          );
        }
      },

      track: function (event) {
        var parentWindow = event.target.ownerDocument.defaultView,
          worldX = parentWindow.screenX - worldOrigin.x0 + event.clientX,
          worldY = parentWindow.screenY - worldOrigin.y0 + event.clientY;

        ball.x = worldX + ball.drag_point.x;
        ball.y = worldY + ball.drag_point.y;

        delta.x = worldX - lastPosition.x;
        delta.y = worldY - lastPosition.y;
        lastPosition.x = worldX;
        lastPosition.y = worldY;
      },

      up: function (event) {
        var parentWindow = event.target.ownerDocument.defaultView;

        if (ball.dragging && delta) {
          parentWindow.removeEventListener(
            "mousemove",
            mouseHandlers.track,
            false
          );

          // Notes: this ball velocity calc is bad, and I feel bad. It needs to be better sampled or less constrained.
          ball.velocity.x =
            Math.abs(delta.x) > 20 ? (delta.x < 0 ? -1 : 1) * 20 : delta.x;
          ball.velocity.y =
            Math.abs(delta.y) > 20 ? (delta.y < 0 ? -1 : 1) * 20 : delta.y;

          delta = lastPosition = null;
          ball.drag_point.x = ball.drag_point.y = 0;
          ball.dragging = false;
        }
      },
    };
  })();

  // When a window resizes, update the entire window list.
  var windowResizeHandler = function (event) {
    var window = event.target.defaultView || event.target,
      child = windowListManager.list[window.childWindowIndex],
      canvas = child.canvas;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (manuallySetWindowScreenX) {
      window.screenX = window.screenLeft;
      window.screenY = window.screenTop;
    }

    worldOrigin.update();
    windowListManager.update();
  };

  // Interval-based poller to watch for any window movement. If a window has moved, update the entire window list.
  var windowPositionPoller = function () {
    var hasMoved = false,
      window;

    for (var v = 0, u = windowListManager.list.length; v < u; v++) {
      window = windowListManager.list[v].ref;

      if (manuallySetWindowScreenX) {
        window.screenX = window.screenLeft;
        window.screenY = window.screenTop;
      }

      if (
        windowListManager.list[v].x1 != window.screenX - worldOrigin.x0 ||
        windowListManager.list[v].y1 != window.screenY - worldOrigin.y0
      ) {
        hasMoved = true;
      }
    }

    if (hasMoved) {
      worldOrigin.update();
      windowListManager.update();
    }
  };

  // Creates a new child window.
  // Notes: We rely on a script tag inside the child window HTML to register the new window via `browserball.addChild`
  // in the parent window. This weird circular process can probably be improved!
  // Setting the window name to wN where N is the length of the list means we'll start refocusing existing windows
  // instead of creating new ones if we close child windows out of order then create new ones. Can this just be a
  // UUID/timestamp?
  var createChildWindow = function () {
    var x = "" + (window.screenX - 200),
      y = "" + (window.screenY + 100),
      height = "300",
      width = "300";

    window.open(
      "child.html",
      "w" + windowListManager.list.length,
      "location=no,status=no,menubar=no,toolbar=no,scrollbars=no,status=no,width=" +
        width +
        ",height=" +
        height +
        ",left=" +
        x +
        ",top=" +
        y
    );
  };

  // Collision handling code?
  // Notes: It's going to take a while to untangle this, I think.
  var handleCollisions = function () {
    var O = [],
      C = 1,
      A = 0;
    O.push(
      ball.w -
        windowListManager.sInside(
          ball.x - ball.offset.x,
          ball.y - ball.offset.y,
          ball.x + ball.offset.x,
          ball.y - ball.offset.y,
          windowListManager.list.slice(0)
        )
    );
    O.push(
      ball.h -
        windowListManager.sInside(
          ball.x + ball.offset.x,
          ball.y - ball.offset.y,
          ball.x + ball.offset.x,
          ball.y + ball.offset.y,
          windowListManager.list.slice(0)
        )
    );
    O.push(
      ball.w -
        windowListManager.sInside(
          ball.x - ball.offset.x,
          ball.y + ball.offset.y,
          ball.x + ball.offset.x,
          ball.y + ball.offset.y,
          windowListManager.list.slice(0)
        )
    );
    O.push(
      ball.h -
        windowListManager.sInside(
          ball.x - ball.offset.x,
          ball.y - ball.offset.y,
          ball.x - ball.offset.x,
          ball.y + ball.offset.y,
          windowListManager.list.slice(0)
        )
    );
    if (!!O[0] || !!O[1] || !!O[2] || !!O[3]) {
      var J = 0,
        Q,
        M,
        v,
        N,
        I = 0;
      for (var K = 0; K < 4; K++) {
        if (O[K] == ball.w) {
          v = O[(K + 3) % 4];
          v = v == ball.w ? 0 : v;
          N = O[(K + 1) % 4];
          N = N == ball.w ? 0 : N;
          M = v > N ? v : N;
          if (M > J) {
            J = M;
            Q = K % 2;
          }
        } else {
          I++;
        }
      }
      if (J && Q == C) {
        ball.x -= J * (ball.velocity.x < 0 ? -1 : 1);
        ball.y -=
          Math.round((J * ball.velocity.y) / ball.velocity.x) *
          (ball.velocity.y < 0 ? -1 : 1);
        ball.velocity.x = -ball.velocity.x * a;
        ball.velocity.y = ball.velocity.y * c;
        ball.rotation = ball.velocity.y * 0.015;
      } else {
        if (J && Q == A) {
          if (ball.velocity.y > 1) {
            ball.x -=
              Math.round((J * ball.velocity.x) / ball.velocity.y) *
              (ball.velocity.x < 0 ? -1 : 1);
          }
          ball.y -= J * (ball.velocity.y < 0 ? -1 : 1);
          ball.velocity.x = ball.velocity.x * c;
          ball.velocity.y = -ball.velocity.y * a;
          ball.rotation = ball.velocity.x * 0.015;
        } else {
          var u,
            D = Number.POSITIVE_INFINITY,
            S,
            P = -1,
            G = windowListManager.corners;
          for (var K = 0, L = G.length; K < L; K++) {
            S = { x: ball.x - G[K].x, y: ball.y - G[K].y };
            u = Math.sqrt(S.x * S.x + S.y * S.y);
            if (u < D) {
              P = K;
              D = u;
            }
          }
          if (P >= 0 && I != 3) {
            var R = G[P].dx > 0 ? ball.x > G[P].x : ball.x < G[P].x,
              H = G[P].dy > 0 ? ball.y > G[P].y : ball.y < G[P].y,
              w;
            if ((R && !H) || (H && !R)) {
              if (R) {
                w = ball.radius - Math.abs(ball.y - G[P].y);
                if (ball.velocity.y > 1) {
                  ball.x -=
                    Math.round((w * ball.velocity.x) / ball.velocity.y) *
                    (ball.velocity.x < 0 ? -1 : 1);
                }
                ball.y -= w * (ball.velocity.y < 0 ? -1 : 1);
                ball.velocity.x = ball.velocity.x * c;
                ball.velocity.y = -ball.velocity.y * a;
                ball.rotation = ball.velocity.x * 0.015;
              } else {
                w = ball.radius - Math.abs(ball.x - G[P].x);
                ball.x -= w * (ball.velocity.x < 0 ? -1 : 1);
                ball.y -=
                  Math.round((w * ball.velocity.y) / ball.velocity.x) *
                  (ball.velocity.y < 0 ? -1 : 1);
                ball.velocity.x = -ball.velocity.x * a;
                ball.velocity.y = ball.velocity.y * c;
                ball.rotation = ball.velocity.y * 0.015;
              }
            } else {
              if (D < ball.radius) {
                var F = ball.velocity.x,
                  E = ball.velocity.y,
                  B,
                  z;
                w = (ball.radius - D) / Math.sqrt(F * F + E * E);
                ball.x -= Math.round(F * w);
                ball.y -= Math.round(E * w * (E < 0 ? -1 : 1));
                B = (G[P].dx < 0 && F > 0) || (G[P].dx > 0 && F < 0) ? 1 : -1;
                z = (G[P].dy < 0 && E > 0) || (G[P].dy > 0 && E < 0) ? 1 : -1;
                ball.velocity.x = B == -1 && z == -1 ? E * a * -G[P].dx : F * B;
                ball.velocity.y =
                  B == -1 && z == -1 ? F * a * -G[P].dy : E * a * z;
                ball.rotation =
                  ball.velocity.x * 0.015 + ball.velocity.y * 0.015;
              }
            }
          }
        }
      }
    }
  };

  // Update the world by updating the ball position, checking for collisions (which may update the ball position
  // again), and then re-render each window's canvas.
  // Notes: I should split out the rendering code from the collision detection code.
  var updateSimulation = function () {
    var window, canvasContext, x, y;

    if (!ball.dragging) {
      ball.velocity.y += gravity;

      if (Math.abs(ball.velocity.x) < 1) {
        ball.velocity.x = 0;
      }
      if (Math.abs(ball.velocity.y) < 1) {
        ball.velocity.y = 0;
      }

      ball.x = ball.x + Math.round(ball.velocity.x);
      ball.y = ball.y + Math.round(ball.velocity.y);

      handleCollisions();
    }
    for (var v = 0, u = windowListManager.list.length; v < u; v++) {
      window = windowListManager.list[v].ref;
      canvasContext = windowListManager.list[v].context;

      x = ball.x - (window.screenX - worldOrigin.x0);
      y = ball.y - (window.screenY - worldOrigin.y0);

      // Draw the ball for this window
      canvasContext.save();
      canvasContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
      canvasContext.translate(x, y);
      ball.angle += ball.rotation;
      canvasContext.rotate(ball.angle);
      canvasContext.drawImage(
        ball.img,
        -ball.offset.x,
        -ball.offset.y,
        ball.w,
        ball.h
      );
      canvasContext.restore();
    }
  };

  // When we close the parent window, close all child windows and unload everything.
  var closeParentWindowHandler = function () {
    var v = windowListManager.list
      .map(function (child) {
        return child.ref;
      })
      .splice(1);

    for (var i = 0, len = v.length; i < len; i++) {
      v[i].close();
    }

    self.removeEventListener("resize", windowResizeHandler, false);
    self.removeEventListener("mousedown", mouseHandlers.down, false);
    self.removeEventListener("mouseup", mouseHandlers.up, false);

    ball.img = null;
  };

  // The API, which will be exported to the parent (initial) window's global namespace under `browserball`.
  return {
    init: function () {
      var stage = document.getElementById
        ? document.getElementById("stage")
        : null;

      if (!stage || !stage.getContext) {
        return;
      }

      stage.width = window.innerWidth;
      stage.height = window.innerHeight;

      window.addEventListener("resize", windowResizeHandler, false);
      window.addEventListener("mousedown", mouseHandlers.down, false);
      window.addEventListener("mouseup", mouseHandlers.up, false);
      window.onunload = closeParentWindowHandler;

      // Create window button
      var el = document.createElement("a");
      el.appendChild(document.createTextNode("Create Window"));
      el.className = "child";
      document.body.appendChild(el);
      el.addEventListener("click", createChildWindow, false);

      // Reset ball button
      el = document.createElement("a");
      el.appendChild(document.createTextNode("Reset Ball"));
      el.className = "reset";
      document.body.appendChild(el);
      el.addEventListener("click", resetBall, false);

      // Notes: why bother?
      el = null;

      if (window.screenX === undefined) {
        window.screenX = window.screenLeft;
        window.screenY = window.screenTop;
        manuallySetWindowScreenX = true;
      }

      // Add the initial parent window to the child window manager list
      windowListManager.add(self);

      ball.w *= ball.scale;
      ball.h *= ball.scale;
      ball.offset.x = ball.radius = ball.w / 2;
      ball.offset.y = ball.h / 2;
      ball.x = window.innerWidth / 2;
      ball.y = window.innerHeight / 2;

      // Once the image for the ball is loaded, the party begins
      ball.img.onload = function () {
        setInterval(updateSimulation, updateIntervalMs);
      };
      ball.img.src = "img/logo.png";

      // Notes: why isn't this up with the other handler setup code? Does it have to be down here?
      setInterval(windowPositionPoller, 250);

      // Notes: why bother again?
      el = null;
    },

    addChild: function (window) {
      var stage = window.document.getElementById("stage");

      stage.width = window.innerWidth;
      stage.height = window.innerHeight;

      window.addEventListener("resize", windowResizeHandler, false);
      window.addEventListener("mousedown", mouseHandlers.down, false);
      window.addEventListener("mouseup", mouseHandlers.up, false);
      window.onunload = this.removeChild;

      if (manuallySetWindowScreenX) {
        window.screenX = window.screenLeft;
        window.screenY = window.screenTop;
      }
      windowListManager.add(window);

      // Notes: why bother? Was I worked about leaking memory?
      window = null;
    },

    removeChild: function () {
      var index = this.childWindowIndex,
        removedWindow = windowListManager.remove(index);

      removedWindow.removeEventListener("resize", windowResizeHandler, false);
      removedWindow.removeEventListener("mousedown", mouseHandlers.down, false);
      removedWindow.removeEventListener("mouseup", mouseHandlers.up, false);

      // Notes: why bother? Was I worked about leaking memory?
      index = removedWindow = null;
    },
  };
})();
