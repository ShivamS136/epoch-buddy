/* Draws flowing, hand-drawn-style callout arrows from each external `.anno` label
   to a precise point on a screenshot. Targets are fractions (fx, fy) of the target
   card's `.shot img` box, so they stay accurate regardless of the screenshot's
   natural size. `hydrate.js` sets window.ANNOTATIONS from the slide config:

     { id, fx, fy, card, teal, style, bend }
       card  : index of the screenshot card to point at (default 0)
       style : "curve" (default, solid) | "dashed"
       bend  : signed curvature (default 0.3); flip the sign to arc the other way

   The path is a smooth cubic bézier with both control points pushed to the same
   side, tapering toward the tip — a graceful bow/hook rather than a jittery wave.
   Waits for the load event + document.fonts.ready so anchors land precisely, then
   sets data-anno-done="1" for the renderer to poll before capturing. */
(function () {
  function buildPath(ax, ay, tx, ty, bend) {
    var dx = tx - ax,
      dy = ty - ay,
      len = Math.hypot(dx, dy) || 1;
    // stop short of the target so the arrowhead tip lands exactly on the point
    var ex = tx - (dx / len) * 9,
      ey = ty - (dy / len) * 9;
    var px = -dy / len,
      py = dx / len; // perpendicular unit vector
    var b = (bend == null ? 0.3 : bend) * len;
    // control points same side; first bulges more, second eases toward the tip
    var c1x = ax + dx * 0.25 + px * b,
      c1y = ay + dy * 0.25 + py * b;
    var c2x = ax + dx * 0.7 + px * b * 0.55,
      c2y = ay + dy * 0.7 + py * b * 0.55;
    return "M " + ax + " " + ay + " C " + c1x + " " + c1y + " " + c2x + " " + c2y + " " + ex + " " + ey;
  }

  function draw() {
    var stage = document.querySelector(".stage");
    var svg = document.querySelector("svg.arrows");
    var imgs = document.querySelectorAll(".shot img");
    var anns = window.ANNOTATIONS || [];
    if (stage && svg && imgs.length) {
      var sb = stage.getBoundingClientRect();
      var NS = "http://www.w3.org/2000/svg";

      anns.forEach(function (a) {
        var el = document.getElementById(a.id);
        var img = imgs[a.card || 0] || imgs[0];
        if (!el || !img) return;
        var ib = img.getBoundingClientRect();
        var lb = el.getBoundingClientRect();
        var tx = ib.left - sb.left + a.fx * ib.width;
        var ty = ib.top - sb.top + a.fy * ib.height;
        var L = lb.left - sb.left,
          R = lb.right - sb.left,
          T = lb.top - sb.top,
          B = lb.bottom - sb.top;
        var cx = (L + R) / 2,
          cy = (T + B) / 2;
        var ddx = tx - cx,
          ddy = ty - cy;
        var ax, ay;
        // anchor on the label edge facing the target
        if (Math.abs(ddx) * lb.height > Math.abs(ddy) * lb.width) {
          ax = ddx > 0 ? R + 6 : L - 6;
          ay = cy;
        } else {
          ay = ddy > 0 ? B + 6 : T - 6;
          ax = cx;
        }

        // `onDark` arrows use a vivid stroke + arrowhead that reads over dark screenshots
        var tone = a.onDark ? "bright" : a.teal ? "teal" : "";
        var marker = a.onDark ? "ah-bright" : a.teal ? "ah-teal" : "ah";
        var cls = "aline" + (tone ? " " + tone : "") + (a.style === "dashed" ? " dashed" : "");
        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", buildPath(ax, ay, tx, ty, a.bend));
        path.setAttribute("class", cls);
        path.setAttribute("marker-end", "url(#" + marker + ")");
        svg.appendChild(path);
      });
    }
    document.documentElement.setAttribute("data-anno-done", "1");
  }

  function start() {
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(draw);
  }

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
