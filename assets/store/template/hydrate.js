/* Hydrates base.html from window.SLIDE (injected by scripts/gen-store-images.mjs).
   Builds the slide DOM with createElement/textContent — the exceptions are the
   headline and the icon/decor SVG markup, assigned via innerHTML. All of these are
   author-controlled config / fixed preset data in a build-time tool (never user
   input, never shipped in an extension bundle), so they are outside build.mjs's
   pack-time innerHTML scan. Runs before annotate.js so window.ANNOTATIONS is ready.

   The background (gradient, blobs, bottom waves) is static in base.html and identical
   on every slide; only the accent decor below is varied per slide via SLIDE.decor. */
(function () {
  var s = window.SLIDE;
  if (!s) return;
  var ICONS = window.ICONS || {};

  function setText(sel, val) {
    var el = document.querySelector(sel);
    if (el && val != null) el.textContent = val;
  }

  var stage = document.querySelector('.stage');
  if (stage) {
    stage.style.width = s.width + 'px';
    stage.style.height = s.height + 'px';
  }

  setText('.kicker-text', s.kicker);

  var headline = document.querySelector('.headline');
  if (headline && s.headline != null) headline.innerHTML = s.headline; // trusted author markup

  // green callout badge (optional)
  var badge = document.querySelector('.badge');
  if (badge && s.badge) {
    setText('.badge-text', s.badge);
    badge.classList.add('on');
  }

  // rich bullets: colored icon chip + bold title + description (or simple text)
  var list = document.querySelector('.blist');
  if (list && Array.isArray(s.bullets)) {
    s.bullets.forEach(function (b) {
      var li = document.createElement('li');
      var bi = document.createElement('span');
      bi.className = 'bi' + (b.color ? ' ' + b.color : '');
      bi.innerHTML = '<svg viewBox="0 0 24 24">' + (ICONS[b.icon] || '') + '</svg>'; // trusted icon table
      li.appendChild(bi);
      if (b.title) {
        var bt = document.createElement('span');
        bt.className = 'bt';
        var ttl = document.createElement('span');
        ttl.className = 'bttl';
        ttl.textContent = b.title;
        bt.appendChild(ttl);
        if (b.desc) {
          var dsc = document.createElement('span');
          dsc.className = 'bdsc';
          dsc.textContent = b.desc;
          bt.appendChild(dsc);
        }
        li.appendChild(bt);
      } else {
        li.classList.add('simple');
        li.appendChild(document.createTextNode(b.text));
      }
      list.appendChild(li);
    });
  }

  // screenshot card(s) — rendered back-to-front in array order
  var devicesWrap = document.querySelector('.devices');
  if (devicesWrap && Array.isArray(s.devices)) {
    s.devices.forEach(function (d) {
      var dev = document.createElement('div');
      dev.className = 'device' + (d.dark ? ' dark' : '');
      if (d.left != null) dev.style.left = d.left + 'px';
      if (d.top != null) dev.style.top = d.top + 'px';
      if (d.width != null) dev.style.width = d.width + 'px';
      if (d.rotate) dev.style.transform = 'rotate(' + d.rotate + 'deg)';
      var glow = document.createElement('div');
      glow.className = 'glow';
      var card = document.createElement('div');
      card.className = 'card';
      var shot = document.createElement('div');
      shot.className = 'shot';
      var img = document.createElement('img');
      if (d.screenshotUrl) img.src = d.screenshotUrl;
      img.alt = d.alt || '';
      shot.appendChild(img);
      card.appendChild(shot);
      dev.appendChild(glow);
      dev.appendChild(card);
      devicesWrap.appendChild(dev);
    });
  }

  // accent decor — preset chosen per slide so positions differ image to image
  var SPARK =
    'M12 0C12.7 6.6 17.4 11.3 24 12C17.4 12.7 12.7 17.4 12 24C11.3 17.4 6.6 12.7 0 12C6.6 11.3 11.3 6.6 12 0Z';
  function decorHTML(it) {
    if (it.t === 'spark')
      return (
        '<svg class="spark" style="' +
        it.css +
        '" width="' +
        it.size +
        '" height="' +
        it.size +
        '" viewBox="0 0 24 24"><path d="' +
        SPARK +
        '" fill="' +
        it.color +
        '"/></svg>'
      );
    if (it.t === 'dots') return '<div class="dots" style="' + it.css + ';color:' + it.color + '"></div>';
    if (it.t === 'ring')
      return (
        '<div class="ring" style="' +
        it.css +
        ';border-width:' +
        (it.bw || 2) +
        'px;border-color:' +
        it.color +
        ';opacity:' +
        (it.op || 0.18) +
        '"></div>'
      );
    if (it.t === 'squig') {
      var g = it.flip ? ' transform="scale(-1,1) translate(-232,0)"' : '';
      return (
        '<svg class="squig" style="' +
        it.css +
        '" width="232" height="92" viewBox="0 0 232 92"><g' +
        g +
        '>' +
        '<path d="M8 64C40 10 80 10 106 46C130 78 170 82 210 38" fill="none" stroke="' +
        it.color +
        '" stroke-width="2.6" stroke-dasharray="7 8" stroke-linecap="round"/>' +
        '<path d="M210 38l-13 1m13-1l-2 12" fill="none" stroke="' +
        it.color +
        '" stroke-width="2.6" stroke-linecap="round"/></g></svg>'
      );
    }
    return '';
  }
  var DECOR = [
    [
      { t: 'dots', css: 'top:-12px;right:-10px;width:158px;height:132px', color: '#6366f1' },
      { t: 'spark', css: 'top:62px;right:152px', size: 34, color: '#22d3ee' },
      { t: 'spark', css: 'top:150px;right:58px', size: 20, color: '#a78bfa' },
      { t: 'ring', css: 'top:-34px;right:232px;width:92px;height:92px', color: '#818cf8', bw: 2, op: 0.16 },
      { t: 'squig', css: 'bottom:64px;left:486px', color: '#818cf8' },
      { t: 'dots', css: 'bottom:-18px;left:-14px;width:150px;height:122px', color: '#14b8a6' },
    ],
    [
      { t: 'spark', css: 'top:96px;right:60px', size: 30, color: '#a78bfa' },
      { t: 'spark', css: 'top:188px;right:150px', size: 18, color: '#22d3ee' },
      { t: 'dots', css: 'top:-10px;right:96px;width:140px;height:118px', color: '#14b8a6' },
      { t: 'ring', css: 'bottom:96px;left:506px;width:54px;height:54px', color: '#2dd4bf', bw: 2, op: 0.24 },
      { t: 'squig', css: 'top:54px;left:512px', color: '#a78bfa', flip: true },
      { t: 'dots', css: 'bottom:-16px;right:-12px;width:150px;height:120px', color: '#6366f1' },
    ],
    [
      { t: 'spark', css: 'top:58px;right:96px', size: 36, color: '#22d3ee' },
      { t: 'spark', css: 'bottom:150px;left:500px', size: 22, color: '#5eead4' },
      { t: 'ring', css: 'top:108px;right:222px;width:42px;height:42px', color: '#818cf8', bw: 2, op: 0.22 },
      { t: 'dots', css: 'bottom:-16px;left:-12px;width:156px;height:126px', color: '#6366f1' },
      { t: 'squig', css: 'bottom:70px;left:498px', color: '#2dd4bf' },
      { t: 'dots', css: 'top:-12px;right:-12px;width:130px;height:110px', color: '#a78bfa' },
    ],
    [
      { t: 'spark', css: 'top:120px;right:54px', size: 32, color: '#5eead4' },
      { t: 'spark', css: 'top:64px;right:188px', size: 18, color: '#818cf8' },
      { t: 'dots', css: 'top:-10px;right:-12px;width:150px;height:122px', color: '#14b8a6' },
      { t: 'ring', css: 'bottom:120px;left:512px;width:60px;height:60px', color: '#818cf8', bw: 2, op: 0.18 },
      { t: 'squig', css: 'bottom:58px;left:484px', color: '#6366f1', flip: true },
      { t: 'dots', css: 'bottom:-18px;left:-10px;width:140px;height:118px', color: '#a78bfa' },
    ],
    [
      { t: 'spark', css: 'top:70px;right:120px', size: 34, color: '#a78bfa' },
      { t: 'spark', css: 'bottom:160px;left:506px', size: 20, color: '#22d3ee' },
      { t: 'spark', css: 'top:176px;right:48px', size: 16, color: '#5eead4' },
      { t: 'ring', css: 'top:-30px;right:150px;width:86px;height:86px', color: '#2dd4bf', bw: 2, op: 0.16 },
      { t: 'squig', css: 'bottom:72px;left:492px', color: '#818cf8' },
      { t: 'dots', css: 'bottom:-16px;right:-12px;width:150px;height:120px', color: '#6366f1' },
    ],
  ];
  var decorEl = document.querySelector('.decor');
  if (decorEl) {
    var preset = DECOR[(s.decor != null ? s.decor : 0) % DECOR.length] || [];
    decorEl.innerHTML = preset.map(decorHTML).join(''); // trusted preset data
  }

  // footer (array -> dot-separated segments; string -> as-is)
  var foot = document.querySelector('.foot');
  if (foot) {
    var segs = Array.isArray(s.footer) ? s.footer : s.footer ? [s.footer] : [];
    segs.forEach(function (seg, i) {
      if (i > 0) {
        var sep = document.createElement('span');
        sep.className = 'd';
        foot.appendChild(sep);
      }
      foot.appendChild(document.createTextNode(seg));
    });
  }

  // annotation labels (+ window.ANNOTATIONS for annotate.js to draw arrows)
  var wrap = document.querySelector('.screen-wrap');
  var anns = [];
  if (wrap && Array.isArray(s.annotations)) {
    s.annotations.forEach(function (a, i) {
      var id = 'a' + (i + 1);
      var el = document.createElement('div');
      el.className = 'anno' + (a.teal ? ' teal' : '') + (a.hand ? ' hand' : '') + (a.onDark ? ' bright' : '');
      el.id = id;
      el.textContent = a.text;
      if (a.at) {
        if (a.at.left != null) el.style.left = a.at.left + 'px';
        if (a.at.top != null) el.style.top = a.at.top + 'px';
      }
      wrap.appendChild(el);
      anns.push({
        id: id,
        fx: a.fx,
        fy: a.fy,
        card: a.card || 0,
        teal: !!a.teal,
        onDark: !!a.onDark,
        style: a.style,
        bend: a.bend,
      });
    });
  }
  window.ANNOTATIONS = anns;
})();
