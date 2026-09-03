(function () {
  'use strict';

  function initTissoProductGrid(section) {
    if (!section) {
      return;
    }

    if (section.dataset.tissoInitialized === 'true') {
      return;
    }

    section.dataset.tissoInitialized = 'true';

    const modal = section.querySelector(
      '.tisso-product-modal'
    );

    if (!modal) {
      return;
    }

    const modalImage = modal.querySelector(
      '.tisso-product-modal__image'
    );

    const modalTitle = modal.querySelector(
      '.tisso-product-modal__title'
    );

    const modalPrice = modal.querySelector(
      '.tisso-product-modal__price'
    );

    const modalDescription = modal.querySelector(
      '.tisso-product-modal__description'
    );

    const closeElements = modal.querySelectorAll(
      '[data-modal-close]'
    );

    let currentProduct = null;


    /*
      OPEN MODAL 
     */

    function openModal() {
      modal.classList.add('is-open');

      modal.setAttribute(
        'aria-hidden',
        'false'
      );

      document.body.classList.add(
        'tisso-modal-open'
      );
    }


    /*
    
      CLOSE MODAL
     
     */

    function closeModal() {
      modal.classList.remove('is-open');

      modal.setAttribute(
        'aria-hidden',
        'true'
      );

      document.body.classList.remove(
        'tisso-modal-open'
      );

      currentProduct = null;
    }


    /*
    
      LOAD PRODUCT
     
     */

    async function loadProduct(productHandle) {

      try {

        const response = await fetch(
          `/products/${productHandle}.js`
        );

        if (!response.ok) {
          throw new Error(
            'Unable to load product.'
          );
        }

        const product =
          await response.json();

        return product;

      } catch (error) {

        console.error(
          'Product loading failed:',
          error
        );

        return null;
      }
    }


    /*
     
      FORMAT PRODUCT PRICE
    
     */

    function formatPrice(priceInCents) {

      const currency =
        window.Shopify?.currency?.active ||
        'USD';

      return new Intl.NumberFormat(
        document.documentElement.lang || 'en',
        {
          style: 'currency',
          currency: currency
        }
      ).format(priceInCents / 100);
    }


    /*
    
      RENDER PRODUCT
     
     */

    function renderProduct(product) {

      currentProduct = product;

      /*
        Product image
       */

      modalImage.src =
        product.featured_image || '';

      modalImage.alt =
        product.title || '';


      /*
        Product title
       */

      modalTitle.textContent =
        product.title || '';


      /*
        Product price
       */

      modalPrice.textContent =
        formatPrice(product.price);


      /*
        Product description
       */

      modalDescription.innerHTML =
        product.description || '';


      /*
        Open popup
       */

      openModal();
    }


    /*
     
     PRODUCT BUTTON CLICK
     
    */

    async function handleProductButtonClick(
      button
    ) {

      const productHandle =
        button.dataset.productHandle;

      if (!productHandle) {

        console.error(
          'Product handle is missing.'
        );

        return;
      }


      /*
       * Prevent multiple clicks while loading
       */

      if (
        button.dataset.loading === 'true'
      ) {
        return;
      }

      button.dataset.loading = 'true';


      try {

        const product =
          await loadProduct(productHandle);

        if (!product) {
          return;
        }

        renderProduct(product);

      } finally {

        button.dataset.loading = 'false';
      }
    }


    /*
    
     EVENT DELEGATION
     
    */

    section.addEventListener(
      'click',
      function (event) {

        const productButton =
          event.target.closest(
            '.tisso-product-card__add-button'
          );

        if (!productButton) {
          return;
        }

        handleProductButtonClick(
          productButton
        );
      }
    );


    /*
    
      CLOSE BUTTON / OVERLAY
     
     */

    closeElements.forEach(
      function (element) {

        element.addEventListener(
          'click',
          closeModal
        );

      }
    );

    /*
 * Close when clicking outside the dialog.
*/
    modal.addEventListener('click', function (event) {
    if (event.target === modal) {
        closeModal();
    }
    });


    /*
      
      ESCAPE KEY
     
     */

    document.addEventListener(
      'keydown',
      function (event) {

        if (
          event.key === 'Escape' &&
          modal.classList.contains('is-open')
        ) {
          closeModal();
        }

      }
    );

  }


  /*
   
    INITIAL PAGE LOAD
   
   */

  function initializeAllSections() {

    document
      .querySelectorAll(
        '.tisso-product-grid'
      )
      .forEach(
        initTissoProductGrid
      );
  }


  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      initializeAllSections
    );

  } else {

    initializeAllSections();

  }


  /* 
    SHOPIFY THEME EDITOR
   */

  document.addEventListener(
    'shopify:section:load',
    function (event) {

      const section =
        event.target.querySelector(
          '.tisso-product-grid'
        );

      if (section) {
        initTissoProductGrid(section);
      }

    }
  );

})();