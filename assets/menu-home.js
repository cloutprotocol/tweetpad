/* tweetpad: the way home is the Menu (index.html, the Wii-style channels). Links marked data-menu-home go there, and
   window.tweetpadMenu.go() takes you there from a button:
   - as a page: /
   - in X's card or the app's pop-out: /?embed, the Menu alone filling the frame
   - playing in the Menu's own channel screen: / in the whole page (target _top), so the Menu doesn't open inside itself */
(() => {
  const framed = window.self !== window.top;
  const inMenu = framed && (() => { try { return window.top.location.origin === location.origin; } catch { return false; } })();
  const popup = /[?&](popup\b|mode=popup)/.test(location.search);
  const href = inMenu ? '/' : framed || popup ? '/?embed' : '/';
  const target = inMenu ? '_top' : '';
  const link = (a) => { a.href = href; if (target) a.target = target; else a.removeAttribute('target'); };
  for (const a of document.querySelectorAll('a[data-menu-home]')) link(a);
  window.tweetpadMenu = { href, link, go: () => { (inMenu ? window.top : window).location.href = href; } };
})();
