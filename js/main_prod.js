window.browserball = (function () {
  var q = false;
  var b = 1,
    a = 0.89,
    c = 0.97,
    s = 15;

  // The ball!
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
    inside: function (u, v) {
      return (
        this.offset.x >=
        Math.sqrt((this.x - u) * (this.x - u) + (this.y - v) * (this.y - v))
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
  // I'm unsure why this wasn't built into `windowListManager`. I should clean up all usages of `screenX`\`screenY`.
  var worldOrigin = {
    x0: Infinity,
    y0: Infinity,
    update: function () {
      var x,
        w,
        v = worldOrigin.x0,
        A = worldOrigin.y0,
        z;
      for (var y = 0, u = windowListManager.list.length; y < u; y++) {
        z = windowListManager.list[y].ref;
        x = x < z.screenX ? x : z.screenX;
        w = w < z.screenY ? w : z.screenY;
      }
      worldOrigin.x0 = x;
      worldOrigin.y0 = w;
      ball.x += v - x;
      ball.y += A - w;
    },
  };

  // This is the list of all open windows. We use this to calculate world bounds and if any points/lines intersect with the list.
  // I'll add more details as I untangle the various things this object does.
  var windowListManager = {
    list: [],
    corners: [],
    add: function (u) {
      u.quad_ref = windowListManager.list.length;
      this.list.push({
        ref: u,
        canvas: u.document.getElementById("stage"),
        context: u.document.getElementById("stage").getContext("2d"),
        x1: u.screenX - worldOrigin.x0,
        y1: u.screenY - worldOrigin.y0,
        x2: u.screenX + u.innerWidth - worldOrigin.x0,
        y2: u.screenY + u.innerHeight - worldOrigin.y0,
      });
      worldOrigin.update();
      windowListManager.update();
    },
    remove: function (v) {
      var x = windowListManager.list.splice(v, 1)[0];
      x.canvas = x.context = null;
      for (var w = 0, u = windowListManager.list.length; w < u; w++) {
        windowListManager.list[w].ref.quad_ref = w;
      }
      return x.ref;
    },
    update: function () {
      var x,
        w,
        u,
        y = windowListManager.list;
      windowListManager.corners = [];
      for (x = 0, u = y.length; x < u; x++) {
        y[x].x1 = y[x].ref.screenX - worldOrigin.x0;
        y[x].y1 = y[x].ref.screenY - worldOrigin.y0;
        y[x].x2 = y[x].ref.screenX + y[x].ref.innerWidth - worldOrigin.x0;
        y[x].y2 = y[x].ref.screenY + y[x].ref.innerHeight - worldOrigin.y0;
      }
      for (x = 0; x < u - 1; x++) {
        for (w = x + 1; w < u; w++) {
          windowListManager.findWorldCorners(y[x], y[w]);
        }
      }
    },
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
          if (A && !windowListManager.pInsideAny(A.x, A.y)) {
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
    pInside: function (u, w, v) {
      return !!(u >= v.x1 && u <= v.x2 && w >= v.y1 && w <= v.y2);
    },
    pInsideNotEdge: function (u, w, v) {
      return !!(u > v.x1 && u < v.x2 && w > v.y1 && w < v.y2);
    },
    pInsideAny: function (w, A) {
      var v = false;
      for (var z = 0, u = windowListManager.list.length; z < u && !v; z++) {
        v = windowListManager.pInsideNotEdge(w, A, windowListManager.list[z]);
      }
      return v;
    },
    sInside: function (v, B, u, A) {
      var C = false,
        p2 = false,
        z = windowListManager.list,
        w = 0;
      for (var x = 0, y = z.length; x < y && !w; x++) {
        C = windowListManager.pInside(v, B, z[x]);
        p2 = windowListManager.pInside(u, A, z[x]);
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

  var mouseHandlers = (function () {
    var v = null,
      u;
    return {
      down: function (event) {
        var A = event.target.ownerDocument.defaultView,
          w = A.screenX - worldOrigin.x0 + event.clientX,
          B = A.screenY - worldOrigin.y0 + event.clientY;
        if (ball.inside(w, B)) {
          ball.dragging = true;
          ball.rotation = 0;
          ball.drag_point.x = ball.x - w;
          ball.drag_point.y = ball.y - B;
          v = { x: 0, y: 0 };
          u = { x: w, y: B };
          A.addEventListener("mousemove", mouseHandlers.track, false);
        }
      },
      track: function (event) {
        var A = event.target.ownerDocument.defaultView,
          w = A.screenX - worldOrigin.x0 + event.clientX,
          B = A.screenY - worldOrigin.y0 + event.clientY;
        ball.x = w + ball.drag_point.x;
        ball.y = B + ball.drag_point.y;
        v.x = w - u.x;
        v.y = B - u.y;
        u.x = w;
        u.y = B;
      },
      up: function (event) {
        var x = event.target.ownerDocument.defaultView;
        if (ball.dragging && v) {
          x.removeEventListener("mousemove", mouseHandlers.track, false);
          ball.velocity.x = Math.abs(v.x) > 20 ? (v.x < 0 ? -1 : 1) * 20 : v.x;
          ball.velocity.y = Math.abs(v.y) > 20 ? (v.y < 0 ? -1 : 1) * 20 : v.y;
          v = u = null;
          ball.drag_point.x = ball.drag_point.y = 0;
          ball.dragging = false;
        }
      },
    };
  })();

  // When a window resizes, updates the window list manager.
  var windowResizeHandler = function (event) {
    var x = event.target.defaultView || event.target,
      u = windowListManager.list[x.quad_ref],
      v = u.canvas;
    v.width = x.innerWidth;
    v.height = x.innerHeight;
    if (q) {
      x.screenX = x.screenLeft;
      x.screenY = x.screenTop;
    }
    worldOrigin.update();
    windowListManager.update();
  };

  // Interval poller to watch for any window movement. If a window has moved, updates the window list manager.
  var windowPositionPoller = function () {
    var w = false,
      x;
    for (var v = 0, u = windowListManager.list.length; v < u; v++) {
      x = windowListManager.list[v].ref;
      if (q) {
        x.screenX = x.screenLeft;
        x.screenY = x.screenTop;
      }
      if (
        windowListManager.list[v].x1 != x.screenX - worldOrigin.x0 ||
        windowListManager.list[v].y1 != x.screenY - worldOrigin.y0
      ) {
        w = true;
      }
    }
    if (w) {
      worldOrigin.update();
      windowListManager.update();
    }
  };

  // Creates a new child window. We rely on a script tag inside the child window HTML to actually register the new
  // with window with the `windowListManager` via the `browserball` global in the parent window. This weird circular
  // process can probably be improved!
  var createChildWindow = function () {
    var x = "" + (window.screenY + 100),
      w = "" + (window.screenX - 200),
      u = "300",
      v = "300";
    window.open(
      "child.html",
      "w" + windowListManager.list.length,
      "location=no,status=no,menubar=no,toolbar=no,scrollbars=no,status=no,width=" +
        v +
        ",height=" +
        u +
        ",left=" +
        w +
        ",top=" +
        x
    );
  };

  // Collision handling code. It's going to take a bit to untangle this, I think.
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
  // I should split out the rendering code from the collision detection code.
  var updateWorld = function () {
    var z, w, y, x;
    if (!ball.dragging) {
      ball.velocity.y += b;
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
      z = windowListManager.list[v].ref;
      w = windowListManager.list[v].context;
      y = ball.x - (z.screenX - worldOrigin.x0);
      x = ball.y - (z.screenY - worldOrigin.y0);
      w.save();
      w.clearRect(0, 0, z.innerWidth, z.innerHeight);
      w.translate(y, x);
      ball.angle += ball.rotation;
      w.rotate(ball.angle);
      w.drawImage(ball.img, -ball.offset.x, -ball.offset.y, ball.w, ball.h);
      w.restore();
    }
  };

  // When we close the parent window, close all child windows and unload everything.
  var closeParentWindowHandler = function () {
    var v = windowListManager.list
      .map(function (w) {
        return w.ref;
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
      var u = document.getElementById ? document.getElementById("stage") : null;
      if (!u || !u.getContext) {
        return;
      }
      u.width = window.innerWidth;
      u.height = window.innerHeight;
      window.addEventListener("resize", windowResizeHandler, false);
      window.addEventListener("mousedown", mouseHandlers.down, false);
      window.addEventListener("mouseup", mouseHandlers.up, false);
      window.onunload = closeParentWindowHandler;
      var v = document.createElement("a");
      v.appendChild(document.createTextNode("Create Window"));
      v.className = "child";
      document.body.appendChild(v);
      v.addEventListener("click", createChildWindow, false);
      v = document.createElement("a");
      v.appendChild(document.createTextNode("Reset Ball"));
      v.className = "reset";
      document.body.appendChild(v);
      v.addEventListener("click", resetBall, false);
      v = null;
      if (window.screenX === undefined) {
        window.screenX = window.screenLeft;
        window.screenY = window.screenTop;
        q = true;
      }
      windowListManager.add(self);
      ball.w *= ball.scale;
      ball.h *= ball.scale;
      ball.offset.x = ball.radius = ball.w / 2;
      ball.offset.y = ball.h / 2;
      ball.x = window.innerWidth / 2;
      ball.y = window.innerHeight / 2;
      ball.img.onload = function () {
        setInterval(updateWorld, s);
      };
      ball.img.src = "img/logo.png";
      setInterval(windowPositionPoller, 250);
      v = null;
    },

    addChild: function (v) {
      var u = v.document.getElementById("stage");
      u.width = v.innerWidth;
      u.height = v.innerHeight;
      v.addEventListener("resize", windowResizeHandler, false);
      v.addEventListener("mousedown", mouseHandlers.down, false);
      v.addEventListener("mouseup", mouseHandlers.up, false);
      v.onunload = this.removeChild;
      if (q) {
        v.screenX = v.screenLeft;
        v.screenY = v.screenTop;
      }
      windowListManager.add(v);
      v = null;
    },

    removeChild: function () {
      var u = this.quad_ref,
        v = windowListManager.remove(u);
      v.removeEventListener("resize", windowResizeHandler, false);
      v.removeEventListener("mousedown", mouseHandlers.down, false);
      v.removeEventListener("mouseup", mouseHandlers.up, false);
      u = v = null;
    },
  };
})();
