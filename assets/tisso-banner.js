// Responsive navbar js code

(function () {
  function initTissoBanner(container) {
    const banner = container || document;

    const toggle = banner.querySelector(
      '.tisso-banner__mobile-menu-toggle'
    );

    const header = banner.querySelector(
      '.tisso-banner__header'
    );

    const mobileMenu = banner.querySelector(
      '.tisso-banner__mobile-menu'
    );

    if (!toggle || !header || !mobileMenu) {
      return;
    }

    // Prevent duplicate event listeners
    if (toggle.dataset.tissoInitialized === 'true') {
      return;
    }

    toggle.dataset.tissoInitialized = 'true';

    toggle.addEventListener('click', function () {

      const isOpen = header.classList.toggle('menu-open');

      mobileMenu.classList.toggle(
        'menu-open',
        isOpen
      );

      toggle.setAttribute(
        'aria-expanded',
        String(isOpen)
      );

      toggle.setAttribute(
        'aria-label',
        isOpen ? 'Close menu' : 'Open menu'
      );
    });
  }


  // Normal page load

  document.addEventListener(
    'DOMContentLoaded',
    function () {
      document
        .querySelectorAll('.tisso-banner')
        .forEach(initTissoBanner);
    }
  );


  // Shopify Theme Editor

  document.addEventListener(
    'shopify:section:load',
    function (event) {

      const section = event.target;

      const banner = section.querySelector(
        '.tisso-banner'
      );

      if (banner) {
        initTissoBanner(banner);
      }
    }
  );

})();