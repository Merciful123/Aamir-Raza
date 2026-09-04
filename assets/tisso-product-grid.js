document.addEventListener('DOMContentLoaded', () => {
  const section = document.querySelector('.tisso-product-grid');

  if (!section) return;

  const modal = section.querySelector('.tisso-product-modal');
  const modalImage = section.querySelector('.tisso-product-modal__image');
  const modalTitle = section.querySelector('.tisso-product-modal__title');
  const modalPrice = section.querySelector('.tisso-product-modal__price');
  const modalDescription = section.querySelector('.tisso-product-modal__description');
  const modalDetails = section.querySelector('.tisso-product-modal__details');

  const COMPANION_PRODUCT_HANDLE = 'soft-winter-jacket';

  let currentProduct = null;
  let selectedOptions = {};
  let currentVariant = null;
  let isAddingToCart = false;

  const productCache = new Map();

  /* Get the Shopify locale aware root URL */
  function getRootUrl() {
    return window.Shopify?.routes?.root || '/';
  }

  /* Normalize values received from Shopify product JSON */
  function normalizeValue(value) {
    if (value === null || value === undefined) return '';

    if (typeof value === 'object') {
      if (value.name !== undefined) return String(value.name);
      if (value.value !== undefined) return String(value.value);
      if (value.option !== undefined) return String(value.option);
    }

    return String(value);
  }

  /* Compare two option values without case sensitivity */
  function valuesMatch(first, second) {
    return normalizeValue(first).trim().toLowerCase() ===
      normalizeValue(second).trim().toLowerCase();
  }

  /* Get the option name from different Shopify JSON formats */
  function getOptionName(option) {
    if (typeof option === 'string') return option;

    if (option && typeof option === 'object') {
      return normalizeValue(option.name || option.title || option.option);
    }

    return '';
  }

  /* Get variant option values from Shopify product JSON */
  function getVariantOptions(variant) {
    if (!variant) return [];

    if (Array.isArray(variant.options)) {
      return variant.options.map(normalizeValue);
    }

    const values = [];

    for (let index = 1; index <= 3; index += 1) {
      const value = variant[`option${index}`];

      if (value !== undefined && value !== null) {
        values.push(normalizeValue(value));
      }
    }

    return values;
  }

  /* Build the product option list dynamically */
  function getProductOptions(product) {
    const options = Array.isArray(product?.options)
      ? product.options
      : [];

    const result = options
      .map((option, index) => ({
        name: getOptionName(option) || `Option ${index + 1}`,
        values: []
      }))
      .filter((option) => option.name);

    if (result.length > 0) {
      product.variants?.forEach((variant) => {
        const variantOptions = getVariantOptions(variant);

        result.forEach((option, index) => {
          const value = variantOptions[index];

          if (
            value &&
            !option.values.some(
              (existing) => valuesMatch(existing, value)
            )
          ) {
            option.values.push(value);
          }
        });
      });

      result.forEach((option, index) => {
        const sourceOption = options[index];

        if (
          sourceOption &&
          typeof sourceOption === 'object' &&
          Array.isArray(sourceOption.values)
        ) {
          sourceOption.values.forEach((value) => {
            const normalized = normalizeValue(value);

            if (
              normalized &&
              !option.values.some(
                (existing) => valuesMatch(existing, normalized)
              )
            ) {
              option.values.push(normalized);
            }
          });
        }
      });

      return result;
    }

    if (product?.variants?.length) {
      const firstVariant = product.variants[0];
      const variantOptions = getVariantOptions(firstVariant);

      return variantOptions.map((value, index) => {
        const values = [];

        product.variants.forEach((variant) => {
          const variantValue = getVariantOptions(variant)[index];

          if (
            variantValue &&
            !values.some(
              (existing) => valuesMatch(existing, variantValue)
            )
          ) {
            values.push(variantValue);
          }
        });

        return {
          name: `Option ${index + 1}`,
          values
        };
      });
    }

    return [];
  }

  /* Format Shopify price values for display */
  function formatPrice(price) {
    const numericPrice = Number(price || 0);

    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR'
    }).format(numericPrice / 100);
  }

  /* Get the most appropriate product image */
  function getImageUrl(product, variant = null) {
    if (variant?.featured_image?.src) {
      return variant.featured_image.src;
    }

    if (variant?.featured_image) {
      return normalizeValue(variant.featured_image);
    }

    if (product?.featured_image) {
      return normalizeValue(product.featured_image);
    }

    if (product?.images?.length) {
      return product.images[0];
    }

    return '';
  }

  /* Find the variant matching the selected options */
  function findSelectedVariant(product) {
    if (!product?.variants?.length) return null;

    const options = getProductOptions(product);

    return product.variants.find((variant) => {
      const variantOptions = getVariantOptions(variant);

      return options.every((option, index) => {
        const selectedValue = selectedOptions[option.name];

        if (!selectedValue) return true;

        return valuesMatch(
          selectedValue,
          variantOptions[index]
        );
      });
    }) || null;
  }

  /* Find the first available variant */
  function findFirstAvailableVariant(product) {
    return product?.variants?.find(
      (variant) => variant.available
    ) || product?.variants?.[0] || null;
  }

  /* Get the selected value for a product option */
  function getSelectedOptionValue(optionName) {
    const key = Object.keys(selectedOptions).find(
      (key) => valuesMatch(key, optionName)
    );

    return key ? selectedOptions[key] : '';
  }

  /* Create the variants container when it is not provided by Liquid */
  function ensureVariantsContainer() {
    let container = modalDetails.querySelector(
      '.tisso-product-modal__variants'
    );

    if (!container) {
      container = document.createElement('div');
      container.className = 'tisso-product-modal__variants';

      modalDetails.appendChild(container);
    }

    return container;
  }

  /* Create the Add to Cart button when it is not provided by Liquid */
  function ensureAddToCartButton() {
    let button = modalDetails.querySelector(
      '.tisso-product-modal__add-to-cart'
    );

    if (!button) {
      button = document.createElement('button');

      button.type = 'button';
      button.className = 'tisso-product-modal__add-to-cart';

      button.innerHTML = `
        <span class="tisso-product-modal__add-text">ADD TO CART</span>
        <span class="tisso-product-modal__arrow" aria-hidden="true">→</span>
      `;

      modalDetails.appendChild(button);
    }

    return button;
  }

  /* Convert common color names into CSS color values */
  function getColorValue(value) {
    const normalized = normalizeValue(value)
      .trim()
      .toLowerCase();

    const colors = {
      black: '#000000',
      white: '#ffffff',
      grey: '#8b8b8b',
      gray: '#8b8b8b',
      red: '#d71945',
      blue: '#4777a9',
      green: '#4d8b55',
      yellow: '#e0bd32',
      orange: '#df7831',
      pink: '#e27a9c',
      purple: '#8157a8',
      brown: '#805a3d',
      beige: '#d5c4a1',
      navy: '#172c4d'
    };

    return colors[normalized] || normalized || '#cccccc';
  }

  /* Render the color selector */
  function renderColorOption(container, option) {
    const wrapper = document.createElement('div');

    wrapper.className =
      'tisso-product-option tisso-product-color';

    const label = document.createElement('div');

    label.className =
      'tisso-product-option__label';

    label.textContent = option.name;

    const selector = document.createElement('div');

    selector.className =
      'tisso-product-color__selector';

    selector.style.setProperty(
      '--option-count',
      option.values.length
    );

    const indicator = document.createElement('span');

    indicator.className =
      'tisso-product-color__indicator';

    indicator.setAttribute(
      'aria-hidden',
      'true'
    );

    selector.appendChild(indicator);

    option.values.forEach((value, index) => {
      const button = document.createElement('button');

      button.type = 'button';
      button.className =
        'tisso-product-color__button';

      button.textContent = value;

      button.dataset.optionName = option.name;
      button.dataset.optionValue = value;

      button.style.setProperty(
        '--swatch-color',
        getColorValue(value)
      );

      button.addEventListener('click', () => {
        selectedOptions[option.name] = value;

        updateVariantControls();
        updateVariantInformation();
      });

      selector.appendChild(button);

      if (
        index === 0 &&
        !getSelectedOptionValue(option.name)
      ) {
        selectedOptions[option.name] = value;
      }
    });

    wrapper.appendChild(label);
    wrapper.appendChild(selector);

    container.appendChild(wrapper);
  }

  /* Render a standard product option such as Size */
  function renderSelectOption(container, option) {
    const wrapper = document.createElement('div');

    wrapper.className =
      'tisso-product-option tisso-product-select';

    const label = document.createElement('label');

    label.className =
      'tisso-product-option__label';

    label.textContent = option.name;

    const selectWrapper = document.createElement('div');

    selectWrapper.className =
      'tisso-product-select__wrapper';

    const select = document.createElement('select');

    select.className =
      'tisso-product-select__control';

    select.dataset.optionName = option.name;

    const placeholder = document.createElement('option');

    placeholder.value = '';

    placeholder.textContent =
      `Choose your ${option.name.toLowerCase()}`;

    select.appendChild(placeholder);

    option.values.forEach((value) => {
      const optionElement = document.createElement('option');

      optionElement.value = value;
      optionElement.textContent = value;

      select.appendChild(optionElement);
    });

    select.addEventListener('change', () => {
      selectedOptions[option.name] = select.value;

      updateVariantControls();
      updateVariantInformation();
    });

    selectWrapper.appendChild(select);

    wrapper.appendChild(label);
    wrapper.appendChild(selectWrapper);

    container.appendChild(wrapper);
  }

  /* Render all available product variants dynamically */
  function renderVariants(product) {
    const container = ensureVariantsContainer();

    container.innerHTML = '';

    selectedOptions = {};

    const options = getProductOptions(product);
    const firstVariant = findFirstAvailableVariant(product);
    const firstVariantOptions =
      getVariantOptions(firstVariant);

    options.forEach((option, index) => {
      const firstValue =
        firstVariantOptions[index] ||
        option.values[0] ||
        '';

      if (firstValue) {
        selectedOptions[option.name] = firstValue;
      }

      const optionName = option.name.toLowerCase();

      const isColor =
        optionName.includes('color') ||
        optionName.includes('colour');

      if (isColor) {
        renderColorOption(container, option);
      } else {
        renderSelectOption(container, option);
      }
    });

    updateVariantControls();
    updateVariantInformation();
  }

  /* Update the active state of all variant controls */
  function updateVariantControls() {
    const colorSelectors =
      modalDetails.querySelectorAll(
        '.tisso-product-color__selector'
      );

    colorSelectors.forEach((selector) => {
      const buttons = Array.from(
        selector.querySelectorAll(
          '.tisso-product-color__button'
        )
      );

      const optionName =
        buttons[0]?.dataset.optionName;

      if (!optionName) return;

      const selectedValue =
        getSelectedOptionValue(optionName);

      const selectedIndex =
        buttons.findIndex(
          (button) =>
            valuesMatch(
              button.dataset.optionValue,
              selectedValue
            )
        );

      buttons.forEach((button) => {
        const isSelected =
          valuesMatch(
            button.dataset.optionValue,
            selectedValue
          );

        button.classList.toggle(
          'is-active',
          isSelected
        );

        button.setAttribute(
          'aria-pressed',
          String(isSelected)
        );
      });

      selector.style.setProperty(
        '--active-index',
        Math.max(selectedIndex, 0)
      );
    });

    const selects =
      modalDetails.querySelectorAll(
        '.tisso-product-select__control'
      );

    selects.forEach((select) => {
      const optionName =
        select.dataset.optionName;

      const selectedValue =
        getSelectedOptionValue(optionName);

      if (select.value !== selectedValue) {
        select.value = selectedValue;
      }
    });
  }

  /* Update price, image and Add to Cart state */
  function updateVariantInformation() {
    currentVariant =
      findSelectedVariant(currentProduct);

    const addButton =
      ensureAddToCartButton();

    if (currentVariant) {
      modalPrice.textContent =
        formatPrice(currentVariant.price);

      const variantImage =
        getImageUrl(
          currentProduct,
          currentVariant
        );

      if (variantImage) {
        modalImage.src = variantImage;
      }

      addButton.disabled =
        !currentVariant.available;

      const addText =
        addButton.querySelector(
          '.tisso-product-modal__add-text'
        );

      if (addText) {
        addText.textContent =
          currentVariant.available
            ? 'ADD TO CART'
            : 'SOLD OUT';
      }
    } else {
      addButton.disabled = true;

      const addText =
        addButton.querySelector(
          '.tisso-product-modal__add-text'
        );

      if (addText) {
        addText.textContent =
          'SELECT OPTIONS';
      }
    }
  }

  /* Check whether the selected variant contains Black and Medium */
  function variantHasBlackAndMedium(
    variant,
    product
  ) {
    if (!variant || !product) return false;

    const options =
      getProductOptions(product);

    const values =
      getVariantOptions(variant);

    let hasBlack = false;
    let hasMedium = false;

    options.forEach((option, index) => {
      const optionName =
        option.name.toLowerCase();

      const optionValue =
        values[index];

      if (
        optionName.includes('color') ||
        optionName.includes('colour')
      ) {
        if (valuesMatch(optionValue, 'Black')) {
          hasBlack = true;
        }
      }

      if (optionName.includes('size')) {
        if (valuesMatch(optionValue, 'Medium')) {
          hasMedium = true;
        }
      }
    });

    return hasBlack && hasMedium;
  }

  /* Load product information from Shopify */
  async function loadProduct(handle) {
    if (!handle) return null;

    if (productCache.has(handle)) {
      return productCache.get(handle);
    }

    const response = await fetch(
      `${getRootUrl()}products/${encodeURIComponent(handle)}.js`
    );

    if (!response.ok) {
      throw new Error(
        `Unable to load product: ${handle}`
      );
    }

    const product = await response.json();

    productCache.set(handle, product);

    return product;
  }

  /* Find the companion Soft Winter Jacket product */
  async function loadCompanionProduct() {
    try {
      return await loadProduct(
        COMPANION_PRODUCT_HANDLE
      );
    } catch (error) {
      try {
        const response = await fetch(
          `${getRootUrl()}search/suggest.json?q=${encodeURIComponent(
            'Soft Winter Jacket'
          )}&resources[type]=product`
        );

        if (!response.ok) return null;

        const data = await response.json();

        const products =
          data?.resources?.results?.products || [];

        const product =
          products.find((item) =>
            normalizeValue(item.title)
              .toLowerCase()
              .includes('soft winter jacket')
          );

        if (!product?.handle) return null;

        return await loadProduct(
          product.handle
        );
      } catch (searchError) {
        console.error(
          'Unable to find companion product',
          searchError
        );

        return null;
      }
    }
  }

  /* Build the cart items for the selected product */
  async function buildCartItems() {
    if (!currentVariant?.id) {
      throw new Error(
        'Please select a valid product variant.'
      );
    }

    const items = [
      {
        id: currentVariant.id,
        quantity: 1
      }
    ];

    if (
      !variantHasBlackAndMedium(
        currentVariant,
        currentProduct
      )
    ) {
      return items;
    }

    const companionProduct =
      await loadCompanionProduct();

    if (
      !companionProduct?.variants?.length
    ) {
      return items;
    }

    const companionVariant =
      companionProduct.variants.find(
        (variant) => {
          const options =
            getProductOptions(
              companionProduct
            );

          const values =
            getVariantOptions(variant);

          let black = false;
          let medium = false;

          options.forEach(
            (option, index) => {
              const name =
                option.name.toLowerCase();

              const value =
                values[index];

              if (
                name.includes('color') ||
                name.includes('colour')
              ) {
                black =
                  valuesMatch(
                    value,
                    'Black'
                  );
              }

              if (name.includes('size')) {
                medium =
                  valuesMatch(
                    value,
                    'Medium'
                  );
              }
            }
          );

          return (
            black &&
            medium &&
            variant.available
          );
        }
      );

    if (!companionVariant) {
      return items;
    }

    const cartResponse =
      await fetch(
        `${getRootUrl()}cart.js`
      );

    if (cartResponse.ok) {
      const cart =
        await cartResponse.json();

      const alreadyInCart =
        cart.items?.some(
          (item) =>
            Number(item.variant_id) ===
            Number(companionVariant.id)
        );

      if (!alreadyInCart) {
        items.push({
          id: companionVariant.id,
          quantity: 1
        });
      }
    }

    return items;
  }

  /* Extract an element from rendered Shopify section HTML */
  function extractSectionElement(
    html,
    selector
  ) {
    if (!html) return null;

    const documentFragment =
      new DOMParser().parseFromString(
        html,
        'text/html'
      );

    return documentFragment.querySelector(
      selector
    );
  }

  /* Update the header cart icon using Shopify rendered HTML */
  function updateCartIconFromSection(html) {
    const currentCartIcon =
      document.querySelector(
        '#cart-icon-bubble'
      );

    if (!currentCartIcon || !html) return;

    const newCartIcon =
      extractSectionElement(
        html,
        '#cart-icon-bubble'
      );

    if (newCartIcon) {
      currentCartIcon.innerHTML =
        newCartIcon.innerHTML;

      if (
        newCartIcon.hasAttribute(
          'aria-label'
        )
      ) {
        currentCartIcon.setAttribute(
          'aria-label',
          newCartIcon.getAttribute(
            'aria-label'
          )
        );
      }

      return;
    }

    const sectionElement =
      extractSectionElement(
        html,
        '.shopify-section'
      );

    const newBubble =
      sectionElement?.querySelector(
        '#cart-icon-bubble'
      );

    if (newBubble) {
      currentCartIcon.innerHTML =
        newBubble.innerHTML;
    }
  }

  /* Update the cart count directly as a fallback */
  function updateCartCount(cart) {
    const cartIcon =
      document.querySelector(
        '#cart-icon-bubble'
      );

    if (!cartIcon || !cart) return;

    const count =
      Number(cart.item_count || 0);

    let bubble =
      cartIcon.querySelector(
        '.cart-count-bubble'
      );

    if (count > 0) {
      if (!bubble) {
        bubble =
          document.createElement('div');

        bubble.className =
          'cart-count-bubble';

        cartIcon.appendChild(bubble);
      }

      bubble.innerHTML = `
        <span aria-hidden="true">${count}</span>
        <span class="visually-hidden">${count} items</span>
      `;
    } else if (bubble) {
      bubble.remove();
    }
  }

  /* Update the existing Dawn cart drawer contents */
  function updateCartDrawer(
    sectionHtml,
    cart
  ) {
    const cartDrawer =
      document.querySelector(
        'cart-drawer'
      );

    if (!cartDrawer || !sectionHtml) {
      return;
    }

    const renderedCartDrawer =
      extractSectionElement(
        sectionHtml,
        '#CartDrawer'
      );

    if (!renderedCartDrawer) {
      console.warn(
        'Cart drawer section did not contain CartDrawer.'
      );

      return;
    }

    const currentDrawer =
      cartDrawer.querySelector(
        '#CartDrawer'
      );

    const currentInner =
      cartDrawer.querySelector(
        '#CartDrawer .drawer__inner'
      );

    const renderedInner =
      renderedCartDrawer.querySelector(
        '.drawer__inner'
      );

    if (
      !currentDrawer ||
      !currentInner ||
      !renderedInner
    ) {
      console.warn(
        'Required Dawn cart drawer elements were not found.'
      );

      return;
    }

    currentInner.innerHTML =
      renderedInner.innerHTML;

    const isEmpty =
      Number(cart?.item_count || 0) === 0;

    cartDrawer.classList.toggle(
      'is-empty',
      isEmpty
    );

    if (isEmpty) {
      currentInner.classList.add(
        'is-empty'
      );
    } else {
      currentInner.classList.remove(
        'is-empty'
      );
    }

    const existingItems =
      cartDrawer.querySelector(
        'cart-drawer-items'
      );

    if (
      existingItems &&
      typeof existingItems.dispatchViewEvent ===
        'function'
    ) {
      existingItems.dispatchViewEvent();
    }
  }

  /* Fetch fresh cart sections when necessary */
  async function fetchCartSections() {
    const url =
      new URL(window.location.href);

    url.search = '';

    url.searchParams.set(
      'sections',
      'cart-drawer,cart-icon-bubble'
    );

    const response =
      await fetch(
        url.toString(),
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        'Unable to refresh cart sections.'
      );
    }

    return response.json();
  }

  /* Refresh cart icon and drawer immediately after adding an item */
  async function refreshCartUI(
    addResponse
  ) {
    let cart = null;

    let sections =
      addResponse?.sections || null;

    try {
      const cartResponse =
        await fetch(
          `${getRootUrl()}cart.js`
        );

      if (cartResponse.ok) {
        cart =
          await cartResponse.json();
      }
    } catch (error) {
      console.warn(
        'Unable to fetch latest cart state.',
        error
      );
    }

    if (!sections) {
      try {
        sections =
          await fetchCartSections();
      } catch (error) {
        console.warn(
          'Unable to refresh cart sections.',
          error
        );
      }
    }

    if (
      sections?.['cart-icon-bubble']
    ) {
      updateCartIconFromSection(
        sections[
          'cart-icon-bubble'
        ]
      );
    }

    if (cart) {
      updateCartCount(cart);
    }

    const cartDrawer =
      document.querySelector(
        'cart-drawer'
      );

    if (
      cartDrawer &&
      sections?.['cart-drawer'] &&
      cart
    ) {
      updateCartDrawer(
        sections['cart-drawer'],
        cart
      );

      if (
        typeof cartDrawer.open ===
          'function' &&
        Number(cart.item_count || 0) > 0
      ) {
        requestAnimationFrame(() => {
          cartDrawer.open(
            document.querySelector(
              '#cart-icon-bubble'
            )
          );
        });
      }
    }
  }

  /* Add the selected product variant to the Shopify cart */
  async function addToCart() {
    if (isAddingToCart) return;

    if (!currentVariant?.id) {
      alert(
        'Please select a valid product variant.'
      );

      return;
    }

    if (!currentVariant.available) {
      alert(
        'This variant is currently unavailable.'
      );

      return;
    }

    const button =
      ensureAddToCartButton();

    const addText =
      button.querySelector(
        '.tisso-product-modal__add-text'
      );

    isAddingToCart = true;

    button.disabled = true;

    if (addText) {
      addText.textContent =
        'ADDING...';
    }

    try {
      const items =
        await buildCartItems();

      const response =
        await fetch(
          `${getRootUrl()}cart/add.js`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              Accept:
                'application/json'
            },
            body: JSON.stringify({
              items,
              sections:
                'cart-drawer,cart-icon-bubble',
              sections_url:
                window.location.pathname
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.description ||
          data?.message ||
          'Unable to add product to cart.'
        );
      }

      await refreshCartUI(data);

      closeModal();
    } catch (error) {
      console.error(
        'Add to cart error:',
        error
      );

      alert(
        error.message ||
        'Something went wrong while adding the product to your cart.'
      );
    } finally {
      isAddingToCart = false;

      button.disabled = false;

      if (addText) {
        addText.textContent =
          currentVariant?.available
            ? 'ADD TO CART'
            : 'SOLD OUT';
      }
    }
  }

  /* Open the product modal */
  async function openModal(
    handle,
    triggerButton
  ) {
    try {
      const product =
        await loadProduct(handle);

      if (!product) return;

      currentProduct = product;

      modalTitle.textContent =
        product.title || '';

      modalPrice.textContent =
        formatPrice(product.price);

      modalDescription.innerHTML =
        product.description || '';

      const imageUrl =
        getImageUrl(product);

      if (imageUrl) {
        modalImage.src = imageUrl;
        modalImage.alt =
          product.title || '';
      } else {
        modalImage.removeAttribute(
          'src'
        );

        modalImage.alt = '';
      }

      renderVariants(product);

      const addButton =
        ensureAddToCartButton();

      addButton.removeEventListener(
        'click',
        addToCart
      );

      addButton.addEventListener(
        'click',
        addToCart
      );

      modal.classList.add(
        'is-open'
      );

      modal.setAttribute(
        'aria-hidden',
        'false'
      );

      document.body.classList.add(
        'tisso-modal-open'
      );

      modal.querySelector(
        '.tisso-product-modal__close'
      )?.focus();

      if (triggerButton) {
        modal.dataset.triggerId =
          triggerButton.id || '';
      }
    } catch (error) {
      console.error(
        'Product modal error:',
        error
      );
    }
  }

  /* Close the product modal */
  function closeModal() {
    modal.classList.remove(
      'is-open'
    );

    modal.setAttribute(
      'aria-hidden',
      'true'
    );

    document.body.classList.remove(
      'tisso-modal-open'
    );

    currentProduct = null;
    currentVariant = null;
    selectedOptions = {};
  }

  /* Open the modal when a product plus button is clicked */
  section
    .querySelectorAll(
      '.tisso-product-card__add-button'
    )
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          openModal(
            button.dataset
              .productHandle,
            button
          );
        }
      );
    });

  /* Close the modal using the close button or overlay */
  section
    .querySelectorAll(
      '[data-modal-close]'
    )
    .forEach((element) => {
      element.addEventListener(
        'click',
        closeModal
      );
    });

  /* Close the modal when Escape is pressed */
  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key === 'Escape' &&
        modal.classList.contains(
          'is-open'
        )
      ) {
        closeModal();
      }
    }
  );
});