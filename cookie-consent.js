/**
 * Lifecycle Studio — Cookie Consent Banner
 * -----------------------------------------
 * Drop-in, self-contained: injects its own HTML + CSS, needs no other files.
 *
 * WHAT TO DO BEFORE GOING LIVE:
 * 1. GA4 ID is set below (G-KPBTN58LHQ) — Lifecycle Studio's real Measurement ID.
 * 2. Add this one line to the <head> of every page (or your shared layout/partial):
 *      <script src="/cookie-consent.js" defer></script>
 * 3. That's it — GA4 will NOT load until the visitor clicks "Accept".
 *    If they click "Decline", no analytics cookies are set at all.
 * 4. To let people change their mind later (e.g. a "Cookie settings" link in
 *    your footer or privacy notice), add:
 *      <a href="#" onclick="window.openCookieSettings();return false;">Cookie settings</a>
 */

(function () {
  "use strict";

  // ---- CONFIG ----
  var GA4_MEASUREMENT_ID = "G-KPBTN58LHQ"; // Lifecycle Studio GA4
  var CONSENT_KEY = "lc_cookie_consent";   // localStorage key: "granted" | "denied"
  var PRIVACY_URL = "/privacy";

  // ---- GA4 LOADER (only ever called after explicit consent) ----
  function loadGA4() {
    if (window.__ga4Loaded || GA4_MEASUREMENT_ID.indexOf("XXXX") !== -1) return;
    window.__ga4Loaded = true;

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_MEASUREMENT_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA4_MEASUREMENT_ID, { anonymize_ip: true });
  }

  function removeGAContent() {
    // If someone previously consented and later declines, strip stored GA cookies
    // (best-effort — GA sets its own cookies once loaded, so this mainly matters
    // if you add a "withdraw consent" flow after the fact).
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (name.indexOf("_ga") === 0) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
    });
  }

  // ---- STYLES ----
  var style = document.createElement("style");
  style.textContent = `
    #lc-cookie-banner{
      position:fixed;left:0;right:0;bottom:0;z-index:9999;
      background:#14181F;color:#F3F2EE;
      padding:22px 28px;
      display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;
      font-family:'Inter',system-ui,sans-serif;
      box-shadow:0 -8px 30px rgba(0,0,0,.18);
      animation:lc-slide-up .35s ease;
    }
    @keyframes lc-slide-up{from{transform:translateY(100%);}to{transform:translateY(0);}}
    #lc-cookie-banner p{margin:0;font-size:13.5px;line-height:1.6;color:#D9D7D1;max-width:560px;}
    #lc-cookie-banner a{color:#fff;text-decoration:underline;}
    #lc-cookie-banner .lc-actions{display:flex;gap:10px;flex-shrink:0;}
    #lc-cookie-banner button{
      font-family:'Inter',system-ui,sans-serif;font-weight:500;font-size:13.5px;
      padding:11px 20px;border:1px solid transparent;cursor:pointer;white-space:nowrap;
    }
    #lc-cookie-banner .lc-accept{background:#1F4B43;color:#fff;}
    #lc-cookie-banner .lc-accept:hover{background:#26594F;}
    #lc-cookie-banner .lc-decline{background:transparent;color:#D9D7D1;border-color:#454C58;}
    #lc-cookie-banner .lc-decline:hover{border-color:#8A8F99;color:#fff;}
    #lc-cookie-modal-overlay{
      position:fixed;inset:0;background:rgba(20,24,31,.55);z-index:10000;
      display:none;align-items:center;justify-content:center;padding:20px;
    }
    #lc-cookie-modal-overlay.active{display:flex;}
    #lc-cookie-modal{
      background:#fff;max-width:420px;width:100%;padding:36px 32px;
      font-family:'Inter',system-ui,sans-serif;
    }
    #lc-cookie-modal h3{font-family:'Fraunces',serif;font-size:20px;font-weight:500;margin:0 0 12px;color:#14181F;}
    #lc-cookie-modal p{font-size:13.5px;color:#565D6B;line-height:1.6;margin:0 0 20px;}
    #lc-cookie-modal .lc-row{display:flex;gap:10px;}
    #lc-cookie-modal button{flex:1;padding:12px 0;font-family:'Inter',system-ui,sans-serif;font-weight:500;font-size:13.5px;border:1px solid #DCD9D0;cursor:pointer;background:#fff;}
    #lc-cookie-modal .lc-accept{background:#1F4B43;color:#fff;border-color:#1F4B43;}
    @media (max-width:640px){
      #lc-cookie-banner{flex-direction:column;align-items:stretch;text-align:left;}
      #lc-cookie-banner .lc-actions{width:100%;}
      #lc-cookie-banner button{flex:1;}
    }
  `;
  document.head.appendChild(style);

  // ---- BANNER MARKUP ----
  function buildBanner() {
    var el = document.createElement("div");
    el.id = "lc-cookie-banner";
    el.innerHTML =
      '<p>We use Google Analytics to understand how visitors use this site. ' +
      'These cookies aren\'t essential, and we only set them with your permission. ' +
      'See our <a href="' + PRIVACY_URL + '">privacy notice</a> for details.</p>' +
      '<div class="lc-actions">' +
      '<button class="lc-decline" id="lc-decline-btn">Decline</button>' +
      '<button class="lc-accept" id="lc-accept-btn">Accept</button>' +
      "</div>";
    return el;
  }

  function buildModal() {
    var overlay = document.createElement("div");
    overlay.id = "lc-cookie-modal-overlay";
    overlay.innerHTML =
      '<div id="lc-cookie-modal">' +
      "<h3>Cookie settings</h3>" +
      "<p>We use Google Analytics to understand how visitors use this site. " +
      "You can accept or decline these cookies at any time — declining won't affect anything else about the site.</p>" +
      '<div class="lc-row">' +
      '<button id="lc-modal-decline">Decline</button>' +
      '<button class="lc-accept" id="lc-modal-accept">Accept</button>' +
      "</div></div>";
    return overlay;
  }

  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
    if (value === "granted") loadGA4();
    else removeGAContent();
  }

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  // ---- INIT ----
  document.addEventListener("DOMContentLoaded", function () {
    var existing = getConsent();

    var modalOverlay = buildModal();
    document.body.appendChild(modalOverlay);
    document.getElementById("lc-modal-accept").addEventListener("click", function () {
      setConsent("granted");
      modalOverlay.classList.remove("active");
    });
    document.getElementById("lc-modal-decline").addEventListener("click", function () {
      setConsent("denied");
      modalOverlay.classList.remove("active");
    });
    modalOverlay.addEventListener("click", function (e) {
      if (e.target === modalOverlay) modalOverlay.classList.remove("active");
    });

    window.openCookieSettings = function () {
      modalOverlay.classList.add("active");
    };

    if (existing === "granted") {
      loadGA4();
      return;
    }
    if (existing === "denied") {
      return; // respected — no banner, no GA4
    }

    // No decision yet — show the banner
    var banner = buildBanner();
    document.body.appendChild(banner);
    document.getElementById("lc-accept-btn").addEventListener("click", function () {
      setConsent("granted");
      banner.remove();
    });
    document.getElementById("lc-decline-btn").addEventListener("click", function () {
      setConsent("denied");
      banner.remove();
    });
  });
})();
