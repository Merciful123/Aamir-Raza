document.addEventListener('DOMContentLoaded', () => {
  const section =
    document.querySelector('.tisso-product-grid');

  if (!section) return;

  const modal =
    section.querySelector('.tisso-product-modal');

  const modalImage =
    section.querySelector(
      '.tisso-product-modal__image'
    );

  const modalTitle =
    section.querySelector(
      '.tisso-product-modal__title'
    );

  const modalPrice =
    section.querySelector(
      '.tisso-product-modal__price'
    );

  const modalDescription =
    section.querySelector(
      '.tisso-product-modal__description'
    );

  const modalDetails =
    section.querySelector(
      '.tisso-product-modal__details'
    );

  if (
    !modal ||
    !modalImage ||
    !modalTitle ||
    !modalPrice ||
    !modalDescription ||
    !modalDetails
  ) {
    console.error(
      'Tisso Product Grid: Required modal elements were not found.'
    );

    return;
  }

  /*
   CONFIGURATION
   */

  const COMPANION_PRODUCT_HANDLE =
    'soft-winter-jacket';

  const COMPANION_PRODUCT_TITLE =
    'Soft Winter Jacket';

  /*
   STATE
  */

  let currentProduct = null;

  let currentVariant = null;

  let selectedOptions = {};

  let isAddingToCart = false;

  const productCache = new Map();

  /*
    GENERAL HELPERS
  */

  function getRootUrl() {
    return (
      window.Shopify?.routes?.root ||
      '/'
    );
  }

  function normalizeValue(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return '';
    }

    if (
      typeof value === 'object'
    ) {
      if (
        value.name !== undefined
      ) {
        return String(value.name);
      }

      if (
        value.value !== undefined
      ) {
        return String(value.value);
      }

      if (
        value.option !== undefined
      ) {
        return String(value.option);
      }
    }

    return String(value);
  }

  function valuesMatch(
    first,
    second
  ) {
    return (
      normalizeValue(first)
        .trim()
        .toLowerCase() ===
      normalizeValue(second)
        .trim()
        .toLowerCase()
    );
  }

  /*
   * Treat Shopify's M and Medium
   * as the same size.
   *
   * This is the important fix.
   */
  function isMediumValue(value) {
    const normalized =
      normalizeValue(value)
        .trim()
        .toLowerCase();

    return (
      normalized === 'm' ||
      normalized === 'medium'
    );
  }

  function getOptionName(option) {
    if (
      typeof option === 'string'
    ) {
      return option;
    }

    if (
      option &&
      typeof option === 'object'
    ) {
      return normalizeValue(
        option.name ||
        option.title ||
        option.option
      );
    }

    return '';
  }

  /*
   VARIANT HELPERS
  */

  function getVariantOptions(
    variant
  ) {
    if (!variant) {
      return [];
    }

    if (
      Array.isArray(
        variant.options
      )
    ) {
      return variant.options.map(
        normalizeValue
      );
    }

    const values = [];

    for (
      let index = 1;
      index <= 3;
      index += 1
    ) {
      const value =
        variant[
          `option${index}`
        ];

      if (
        value !== undefined &&
        value !== null
      ) {
        values.push(
          normalizeValue(value)
        );
      }
    }

    return values;
  }

  /*
   * Build product options while
   * preserving Shopify's original
   * variant option index.
   *
   * Example:
   *
   * Shopify:
   * option1 = Size
   * option2 = Color
   *
   * UI:
   * Color
   * Size
   *
   * variantIndex remains:
   * Size  -> 0
   * Color -> 1
   */
  function getProductOptions(
    product
  ) {
    if (!product) {
      return [];
    }

    const sourceOptions =
      Array.isArray(product.options)
        ? product.options
        : [];

    const result =
      sourceOptions
        .map(
          (
            option,
            index
          ) => ({
            name:
              getOptionName(
                option
              ) ||
              `Option ${
                index + 1
              }`,

            values: [],

            variantIndex:
              index
          })
        )
        .filter(
          (option) =>
            option.name
        );

    if (
      result.length > 0
    ) {
      /*
       * Collect values from all variants.
       */
      product.variants?.forEach(
        (variant) => {
          const variantValues =
            getVariantOptions(
              variant
            );

          result.forEach(
            (option) => {
              const value =
                variantValues[
                  option.variantIndex
                ];

              if (
                value &&
                !option.values.some(
                  (existing) =>
                    valuesMatch(
                      existing,
                      value
                    )
                )
              ) {
                option.values.push(
                  value
                );
              }
            }
          );
        }
      );

      /*
       * Also use values declared
       * directly in product.options.
       */
      result.forEach(
        (option) => {
          const sourceOption =
            sourceOptions[
              option.variantIndex
            ];

          if (
            sourceOption &&
            typeof sourceOption ===
              'object' &&
            Array.isArray(
              sourceOption.values
            )
          ) {
            sourceOption.values.forEach(
              (value) => {
                const normalized =
                  normalizeValue(
                    value
                  );

                if (
                  normalized &&
                  !option.values.some(
                    (existing) =>
                      valuesMatch(
                        existing,
                        normalized
                      )
                  )
                ) {
                  option.values.push(
                    normalized
                  );
                }
              }
            );
          }
        }
      );

      /*
       * Display Color before Size.
       *
       * Do NOT change variantIndex.
       */
      result.sort(
        (first, second) => {
          const firstName =
            first.name
              .toLowerCase();

          const secondName =
            second.name
              .toLowerCase();

          const firstIsColor =
            firstName.includes(
              'color'
            ) ||
            firstName.includes(
              'colour'
            );

          const secondIsColor =
            secondName.includes(
              'color'
            ) ||
            secondName.includes(
              'colour'
            );

          if (
            firstIsColor &&
            !secondIsColor
          ) {
            return -1;
          }

          if (
            !firstIsColor &&
            secondIsColor
          ) {
            return 1;
          }

          return (
            first.variantIndex -
            second.variantIndex
          );
        }
      );

      return result;
    }

    /*
     * Fallback when product.options
     * is unavailable.
     */
    if (
      product.variants?.length
    ) {
      const firstVariant =
        product.variants[0];

      const firstVariantValues =
        getVariantOptions(
          firstVariant
        );

      return firstVariantValues.map(
        (
          value,
          index
        ) => {
          const values = [];

          product.variants.forEach(
            (variant) => {
              const variantValue =
                getVariantOptions(
                  variant
                )[index];

              if (
                variantValue &&
                !values.some(
                  (existing) =>
                    valuesMatch(
                      existing,
                      variantValue
                    )
                )
              ) {
                values.push(
                  variantValue
                );
              }
            }
          );

          return {
            name:
              `Option ${
                index + 1
              }`,

            values,

            variantIndex:
              index
          };
        }
      );
    }

    return [];
  }

  /*
    FIND SELECTED VARIANT
   */

  function findSelectedVariant(
    product
  ) {
    if (
      !product?.variants?.length
    ) {
      return null;
    }

    const options =
      getProductOptions(
        product
      );

    const matchedVariant =
      product.variants.find(
        (variant) => {
          const variantValues =
            getVariantOptions(
              variant
            );

          return options.every(
            (option) => {
              const selectedValue =
                selectedOptions[
                  option.name
                ];

              if (!selectedValue) {
                return true;
              }

              return valuesMatch(
                selectedValue,
                variantValues[
                  option.variantIndex
                ]
              );
            }
          );
        }
      );

    return (
      matchedVariant ||
      null
    );
  }

  function findFirstAvailableVariant(
    product
  ) {
    if (
      !product?.variants?.length
    ) {
      return null;
    }

    return (
      product.variants.find(
        (variant) =>
          variant.available
      ) ||
      product.variants[0]
    );
  }

  function getSelectedOptionValue(
    optionName
  ) {
    const key =
      Object.keys(
        selectedOptions
      ).find(
        (existingKey) =>
          valuesMatch(
            existingKey,
            optionName
          )
      );

    return key
      ? selectedOptions[key]
      : '';
  }

  /*
   DISPLAY HELPERS
 */

  function formatPrice(
    price
  ) {
    const numericPrice =
      Number(
        price || 0
      );

    return new Intl.NumberFormat(
      undefined,
      {
        style: 'currency',
        currency: 'EUR'
      }
    ).format(
      numericPrice / 100
    );
  }

  function getImageUrl(
    product,
    variant = null
  ) {
    if (
      variant?.featured_image?.src
    ) {
      return (
        variant.featured_image.src
      );
    }

    if (
      variant?.featured_image
    ) {
      return normalizeValue(
        variant.featured_image
      );
    }

    if (
      product?.featured_image
    ) {
      return normalizeValue(
        product.featured_image
      );
    }

    if (
      product?.images?.length
    ) {
      return product.images[0];
    }

    return '';
  }

  /*
   MODAL HELPERS 
   */

  function ensureVariantsContainer() {
    let container =
      modalDetails.querySelector(
        '.tisso-product-modal__variants'
      );

    if (!container) {
      container =
        document.createElement(
          'div'
        );

      container.className =
        'tisso-product-modal__variants';

      modalDetails.appendChild(
        container
      );
    }

    return container;
  }

  function ensureAddToCartButton() {
    let button =
      modalDetails.querySelector(
        '.tisso-product-modal__add-to-cart'
      );

    if (!button) {
      button =
        document.createElement(
          'button'
        );

      button.type =
        'button';

      button.className =
        'tisso-product-modal__add-to-cart';

      button.innerHTML = `
        <span class="tisso-product-modal__add-text">
          ADD TO CART
        </span>

        <span
          class="tisso-product-modal__arrow"
          aria-hidden="true"
        >
          →
        </span>
      `;

      modalDetails.appendChild(
        button
      );
    }

    return button;
  }

  /*
    COLOR
   */

  function getColorValue(
    value
  ) {
    const normalized =
      normalizeValue(value)
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

    return (
      colors[normalized] ||
      normalized ||
      '#cccccc'
    );
  }

  /*
    RENDER COLOR
  */

  function renderColorOption(
    container,
    option
  ) {
    const wrapper =
      document.createElement(
        'div'
      );

    wrapper.className =
      'tisso-product-option tisso-product-color';

    const label =
      document.createElement(
        'div'
      );

    label.className =
      'tisso-product-option__label';

    label.textContent =
      option.name;

    const selector =
      document.createElement(
        'div'
      );

    selector.className =
      'tisso-product-color__selector';

    selector.style.setProperty(
      '--option-count',
      option.values.length
    );

    const indicator =
      document.createElement(
        'span'
      );

    indicator.className =
      'tisso-product-color__indicator';

    indicator.setAttribute(
      'aria-hidden',
      'true'
    );

    selector.appendChild(
      indicator
    );

    option.values.forEach(
      (
        value,
        index
      ) => {
        const button =
          document.createElement(
            'button'
          );

        button.type =
          'button';

        button.className =
          'tisso-product-color__button';

        button.textContent =
          value;

        button.dataset.optionName =
          option.name;

        button.dataset.optionValue =
          value;

        button.style.setProperty(
          '--swatch-color',
          getColorValue(
            value
          )
        );

        button.addEventListener(
          'click',
          () => {
            selectedOptions[
              option.name
            ] = value;

            console.log(
              'Color selected:',
              option.name,
              value
            );

            updateVariantControls();

            updateVariantInformation();
          }
        );

        selector.appendChild(
          button
        );

        if (
          index === 0 &&
          !getSelectedOptionValue(
            option.name
          )
        ) {
          selectedOptions[
            option.name
          ] = value;
        }
      }
    );

    wrapper.appendChild(
      label
    );

    wrapper.appendChild(
      selector
    );

    container.appendChild(
      wrapper
    );
  }

  /*
   RENDER SELECT
   */

  function renderSelectOption(
    container,
    option
  ) {
    const wrapper =
      document.createElement(
        'div'
      );

    wrapper.className =
      'tisso-product-option tisso-product-select';

    const label =
      document.createElement(
        'label'
      );

    label.className =
      'tisso-product-option__label';

    label.textContent =
      option.name;

    const selectWrapper =
      document.createElement(
        'div'
      );

    selectWrapper.className =
      'tisso-product-select__wrapper';

    const select =
      document.createElement(
        'select'
      );

    select.className =
      'tisso-product-select__control';

    select.dataset.optionName =
      option.name;

    const placeholder =
      document.createElement(
        'option'
      );

    placeholder.value =
      '';

    placeholder.textContent =
      `Choose your ${option.name.toLowerCase()}`;

    select.appendChild(
      placeholder
    );

    option.values.forEach(
      (value) => {
        const optionElement =
          document.createElement(
            'option'
          );

        optionElement.value =
          value;

        optionElement.textContent =
          value;

        select.appendChild(
          optionElement
        );
      }
    );

    select.addEventListener(
      'change',
      () => {
        selectedOptions[
          option.name
        ] = select.value;

        console.log(
          'Option selected:',
          option.name,
          select.value
        );

        updateVariantControls();

        updateVariantInformation();
      }
    );

    selectWrapper.appendChild(
      select
    );

    wrapper.appendChild(
      label
    );

    wrapper.appendChild(
      selectWrapper
    );

    container.appendChild(
      wrapper
    );
  }

  /*
  RENDER VARIANTS
  */

  function renderVariants(
    product
  ) {
    const container =
      ensureVariantsContainer();

    container.innerHTML =
      '';

    selectedOptions =
      {};

    const options =
      getProductOptions(
        product
      );

    const firstVariant =
      findFirstAvailableVariant(
        product
      );

    const firstVariantValues =
      getVariantOptions(
        firstVariant
      );

    console.log(
      'Product options:',
      options
    );

    console.log(
      'First variant:',
      firstVariant
    );

    options.forEach(
      (option) => {
        /*
         * IMPORTANT:
         *
         * Use variantIndex instead
         * of the displayed UI index.
         */
        const firstValue =
          firstVariantValues[
            option.variantIndex
          ] ||
          option.values[0] ||
          '';

        if (firstValue) {
          selectedOptions[
            option.name
          ] = firstValue;
        }

        const optionName =
          option.name.toLowerCase();

        const isColor =
          optionName.includes(
            'color'
          ) ||
          optionName.includes(
            'colour'
          );

        if (isColor) {
          renderColorOption(
            container,
            option
          );
        } else {
          renderSelectOption(
            container,
            option
          );
        }
      }
    );

    updateVariantControls();

    updateVariantInformation();
  }

  /*
   UPDATE CONTROLS
   */

  function updateVariantControls() {
    const colorSelectors =
      modalDetails.querySelectorAll(
        '.tisso-product-color__selector'
      );

    colorSelectors.forEach(
      (selector) => {
        const buttons =
          Array.from(
            selector.querySelectorAll(
              '.tisso-product-color__button'
            )
          );

        const optionName =
          buttons[0]
            ?.dataset
            .optionName;

        if (!optionName) {
          return;
        }

        const selectedValue =
          getSelectedOptionValue(
            optionName
          );

        const selectedIndex =
          buttons.findIndex(
            (button) =>
              valuesMatch(
                button.dataset
                  .optionValue,
                selectedValue
              )
          );

        buttons.forEach(
          (button) => {
            const isSelected =
              valuesMatch(
                button.dataset
                  .optionValue,
                selectedValue
              );

            button.classList.toggle(
              'is-active',
              isSelected
            );

            button.setAttribute(
              'aria-pressed',
              String(
                isSelected
              )
            );
          }
        );

        selector.style.setProperty(
          '--active-index',
          Math.max(
            selectedIndex,
            0
          )
        );
      }
    );

    const selects =
      modalDetails.querySelectorAll(
        '.tisso-product-select__control'
      );

    selects.forEach(
      (select) => {
        const optionName =
          select.dataset
            .optionName;

        const selectedValue =
          getSelectedOptionValue(
            optionName
          );

        if (
          select.value !==
          selectedValue
        ) {
          select.value =
            selectedValue;
        }
      }
    );
  }

  /* 
  UPDATE VARIANT INFORMATION
   */

  function updateVariantInformation() {
    currentVariant =
      findSelectedVariant(
        currentProduct
      );

    console.log(
      'Current selected options:',
      selectedOptions
    );

    console.log(
      'Current matched variant:',
      currentVariant
    );

    const addButton =
      ensureAddToCartButton();

    if (currentVariant) {
      modalPrice.textContent =
        formatPrice(
          currentVariant.price
        );

      const variantImage =
        getImageUrl(
          currentProduct,
          currentVariant
        );

      if (variantImage) {
        modalImage.src =
          variantImage;
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
      addButton.disabled =
        true;

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

  /*  
   BLACK + MEDIUM DETECTION
 */

  function variantHasBlackAndMedium(
    variant,
    product
  ) {
    if (
      !variant ||
      !product
    ) {
      return false;
    }

    const options =
      getProductOptions(
        product
      );

    const values =
      getVariantOptions(
        variant
      );

    let hasBlack =
      false;

    let hasMedium =
      false;

    options.forEach(
      (option) => {
        const optionName =
          option.name.toLowerCase();

        /*
         * IMPORTANT:
         *
         * Use the original Shopify
         * variant index.
         */
        const optionValue =
          values[
            option.variantIndex
          ];

        console.log(
          'Checking option:',
          option.name,
          optionValue
        );

        /*
         * COLOR
         */
        if (
          optionName.includes(
            'color'
          ) ||
          optionName.includes(
            'colour'
          )
        ) {
          if (
            valuesMatch(
              optionValue,
              'Black'
            )
          ) {
            hasBlack =
              true;
          }
        }

        /*
         * SIZE
         *
         * Shopify in your store is
         * returning "M", not "Medium".
         *
         * Therefore both are accepted.
         */
        if (
          optionName.includes(
            'size'
          )
        ) {
          if (
            isMediumValue(
              optionValue
            )
          ) {
            hasMedium =
              true;
          }
        }
      }
    );

    console.log(
      'Black detected:',
      hasBlack
    );

    console.log(
      'Medium detected:',
      hasMedium
    );

    return (
      hasBlack &&
      hasMedium
    );
  }

  /*
   LOAD PRODUCT
   */

  async function loadProduct(
    handle
  ) {
    if (!handle) {
      return null;
    }

    if (
      productCache.has(
        handle
      )
    ) {
      return productCache.get(
        handle
      );
    }

    const url =
      `${getRootUrl()}products/${encodeURIComponent(
        handle
      )}.js`;

    console.log(
      'Loading product:',
      url
    );

    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Unable to load product: ${handle}`
      );
    }

    const product =
      await response.json();

    productCache.set(
      handle,
      product
    );

    return product;
  }

  /*
  
   FIND SOFT WINTER JACKET

   */

  async function loadCompanionProduct() {
    /*
     * Attempt 1:
     * Expected handle.
     */
    try {
      const product =
        await loadProduct(
          COMPANION_PRODUCT_HANDLE
        );

      if (
        product?.variants?.length
      ) {
        console.log(
          'Soft Winter Jacket found by handle:',
          product
        );

        return product;
      }
    } catch (error) {
      console.warn(
        'Soft Winter Jacket handle lookup failed:',
        error
      );
    }

    /*
     * Attempt 2:
     * Predictive search.
     */
    try {
      const searchUrl =
        `${getRootUrl()}search/suggest.json?q=${encodeURIComponent(
          COMPANION_PRODUCT_TITLE
        )}&resources[type]=product&resources[limit]=10`;

      console.log(
        'Searching for companion:',
        searchUrl
      );

      const response =
        await fetch(
          searchUrl
        );

      if (response.ok) {
        const data =
          await response.json();

        const products =
          data?.resources?.results
            ?.products || [];

        console.log(
          'Companion search results:',
          products
        );

        const matchingProduct =
          products.find(
            (product) => {
              const title =
                normalizeValue(
                  product.title
                )
                  .trim()
                  .toLowerCase();

              return (
                title ===
                COMPANION_PRODUCT_TITLE.toLowerCase()
              );
            }
          ) ||
          products.find(
            (product) => {
              const title =
                normalizeValue(
                  product.title
                )
                  .trim()
                  .toLowerCase();

              return title.includes(
                COMPANION_PRODUCT_TITLE.toLowerCase()
              );
            }
          );

        if (
          matchingProduct?.handle
        ) {
          const fullProduct =
            await loadProduct(
              matchingProduct.handle
            );

          if (
            fullProduct?.variants?.length
          ) {
            console.log(
              'Soft Winter Jacket found by search:',
              fullProduct
            );

            return fullProduct;
          }
        }
      }
    } catch (error) {
      console.warn(
        'Predictive search failed:',
        error
      );
    }

    /*
     * Attempt 3:
     * products.json fallback.
     */
    try {
      const response =
        await fetch(
          `${getRootUrl()}products.json?limit=250`
        );

      if (response.ok) {
        const data =
          await response.json();

        const products =
          data?.products || [];

        console.log(
          'Storefront products:',
          products
        );

        const matchingProduct =
          products.find(
            (product) =>
              normalizeValue(
                product.title
              )
                .trim()
                .toLowerCase() ===
              COMPANION_PRODUCT_TITLE.toLowerCase()
          ) ||
          products.find(
            (product) =>
              normalizeValue(
                product.title
              )
                .trim()
                .toLowerCase()
                .includes(
                  COMPANION_PRODUCT_TITLE.toLowerCase()
                )
          );

        if (
          matchingProduct?.handle
        ) {
          const fullProduct =
            await loadProduct(
              matchingProduct.handle
            );

          if (
            fullProduct?.variants?.length
          ) {
            console.log(
              'Soft Winter Jacket found through products.json:',
              fullProduct
            );

            return fullProduct;
          }
        }
      }
    } catch (error) {
      console.warn(
        'products.json lookup failed:',
        error
      );
    }

    console.error(
      'Soft Winter Jacket could not be found.'
    );

    return null;
  }

  /*
  
    BUILD CART ITEMS
   */

  async function buildCartItems() {
    if (
      !currentVariant?.id
    ) {
      throw new Error(
        'Please select a valid product variant.'
      );
    }

    /*
     * Always add the selected product.
     */
    const items = [
      {
        id: Number(
          currentVariant.id
        ),

        quantity: 1
      }
    ];

    /*
     * Check Black + Medium.
     */
    const shouldAddCompanion =
      variantHasBlackAndMedium(
        currentVariant,
        currentProduct
      );

    console.log(
      'Should add companion:',
      shouldAddCompanion
    );

    /*
     * If not Black + Medium,
     * stop here.
     */
    if (
      !shouldAddCompanion
    ) {
      return items;
    }

    /*
     * Find Soft Winter Jacket.
     */
    const companionProduct =
      await loadCompanionProduct();

    if (
      !companionProduct?.variants?.length
    ) {
      console.error(
        'Soft Winter Jacket was found without usable variants.'
      );

      return items;
    }

    /*
     * We don't care what options
     * the jacket has.
     *
     * Use its first available variant.
     */
    const companionVariant =
      findFirstAvailableVariant(
        companionProduct
      );

    if (
      !companionVariant?.id
    ) {
      console.error(
        'No available Soft Winter Jacket variant found.'
      );

      return items;
    }

    console.log(
      'Soft Winter Jacket variant:',
      companionVariant
    );

    /*
     * Prevent duplicate jacket.
     */
    try {
      const cartResponse =
        await fetch(
          `${getRootUrl()}cart.js`
        );

      if (
        cartResponse.ok
      ) {
        const cart =
          await cartResponse.json();

        const alreadyInCart =
          cart.items?.some(
            (item) =>
              Number(
                item.variant_id
              ) ===
              Number(
                companionVariant.id
              )
          );

        if (
          alreadyInCart
        ) {
          console.log(
            'Soft Winter Jacket is already in cart.'
          );

          return items;
        }
      }
    } catch (error) {
      console.warn(
        'Unable to check current cart:',
        error
      );
    }

    /*
     * Add Soft Winter Jacket
     * to the same cart request.
     */
    items.push({
      id: Number(
        companionVariant.id
      ),

      quantity: 1
    });

    console.log(
      'FINAL CART ITEMS:',
      items
    );

    return items;
  }

  /*
  
   CART SECTION HELPERS

   */

  function extractSectionElement(
    html,
    selector
  ) {
    if (!html) {
      return null;
    }

    const documentFragment =
      new DOMParser().parseFromString(
        html,
        'text/html'
      );

    return documentFragment.querySelector(
      selector
    );
  }

  function updateCartIconFromSection(
    html
  ) {
    const currentCartIcon =
      document.querySelector(
        '#cart-icon-bubble'
      );

    if (
      !currentCartIcon ||
      !html
    ) {
      return;
    }

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

  function updateCartCount(
    cart
  ) {
    const cartIcon =
      document.querySelector(
        '#cart-icon-bubble'
      );

    if (
      !cartIcon ||
      !cart
    ) {
      return;
    }

    const count =
      Number(
        cart.item_count || 0
      );

    let bubble =
      cartIcon.querySelector(
        '.cart-count-bubble'
      );

    if (
      count > 0
    ) {
      if (!bubble) {
        bubble =
          document.createElement(
            'div'
          );

        bubble.className =
          'cart-count-bubble';

        cartIcon.appendChild(
          bubble
        );
      }

      bubble.innerHTML = `
        <span aria-hidden="true">
          ${count}
        </span>

        <span class="visually-hidden">
          ${count} items
        </span>
      `;
    } else if (bubble) {
      bubble.remove();
    }
  }

  function updateCartDrawer(
    sectionHtml,
    cart
  ) {
    const cartDrawer =
      document.querySelector(
        'cart-drawer'
      );

    if (
      !cartDrawer ||
      !sectionHtml
    ) {
      return;
    }

    const renderedCartDrawer =
      extractSectionElement(
        sectionHtml,
        '#CartDrawer'
      );

    if (
      !renderedCartDrawer
    ) {
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
      Number(
        cart?.item_count || 0
      ) === 0;

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

  async function fetchCartSections() {
    const url =
      new URL(
        window.location.href
      );

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
            Accept:
              'application/json'
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

  async function refreshCartUI(
    addResponse
  ) {
    let cart = null;

    let sections =
      addResponse?.sections ||
      null;

    try {
      const cartResponse =
        await fetch(
          `${getRootUrl()}cart.js`
        );

      if (
        cartResponse.ok
      ) {
        cart =
          await cartResponse.json();
      }
    } catch (error) {
      console.warn(
        'Unable to fetch latest cart:',
        error
      );
    }

    if (!sections) {
      try {
        sections =
          await fetchCartSections();
      } catch (error) {
        console.warn(
          'Unable to refresh cart sections:',
          error
        );
      }
    }

    if (
      sections?.[
        'cart-icon-bubble'
      ]
    ) {
      updateCartIconFromSection(
        sections[
          'cart-icon-bubble'
        ]
      );
    }

    if (cart) {
      updateCartCount(
        cart
      );
    }

    const cartDrawer =
      document.querySelector(
        'cart-drawer'
      );

    if (
      cartDrawer &&
      sections?.[
        'cart-drawer'
      ] &&
      cart
    ) {
      updateCartDrawer(
        sections[
          'cart-drawer'
        ],
        cart
      );

      if (
        typeof cartDrawer.open ===
          'function' &&
        Number(
          cart.item_count || 0
        ) > 0
      ) {
        requestAnimationFrame(
          () => {
            cartDrawer.open(
              document.querySelector(
                '#cart-icon-bubble'
              )
            );
          }
        );
      }
    }
  }

  /*
    ADD TO CART
   */

  async function addToCart() {
    if (
      isAddingToCart
    ) {
      return;
    }

    if (
      !currentVariant?.id
    ) {
      alert(
        'Please select a valid product variant.'
      );

      return;
    }

    if (
      !currentVariant.available
    ) {
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

    isAddingToCart =
      true;

    button.disabled =
      true;

    if (addText) {
      addText.textContent =
        'ADDING...';
    }

    try {
      /*
       * Build the complete list.
       */
      const items =
        await buildCartItems();

      console.log(
        'Sending items to Shopify:',
        items
      );

      /*
       * Send both products
       * in one Shopify cart request.
       */
      const response =
        await fetch(
          `${getRootUrl()}cart/add.js`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json'
            },

            body:
              JSON.stringify({
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

      console.log(
        'Shopify cart response:',
        data
      );

      if (
        !response.ok
      ) {
        throw new Error(
          data?.description ||
          data?.message ||
          'Unable to add product to cart.'
        );
      }

      await refreshCartUI(
        data
      );

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
      isAddingToCart =
        false;

      button.disabled =
        false;

      if (addText) {
        addText.textContent =
          currentVariant?.available
            ? 'ADD TO CART'
            : 'SOLD OUT';
      }
    }
  }

  /*
    OPEN MODAL
   */

  async function openModal(
    handle,
    triggerButton
  ) {
    try {
      const product =
        await loadProduct(
          handle
        );

      if (!product) {
        return;
      }

      currentProduct =
        product;

      modalTitle.textContent =
        product.title || '';

      modalPrice.textContent =
        formatPrice(
          product.price
        );

      modalDescription.innerHTML =
        product.description || '';

      const imageUrl =
        getImageUrl(
          product
        );

      if (imageUrl) {
        modalImage.src =
          imageUrl;

        modalImage.alt =
          product.title || '';
      } else {
        modalImage.removeAttribute(
          'src'
        );

        modalImage.alt =
          '';
      }

      /*
       * Render Color first,
       * Size second.
       */
      renderVariants(
        product
      );

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

      /*
       * Open modal.
       */
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

      /*
       * Force visible dark backdrop.
       */
      const overlay =
        modal.querySelector(
          '.tisso-product-modal__overlay'
        );

      if (overlay) {
        overlay.style.backgroundColor =
          'rgba(0, 0, 0, 0.65)';

        overlay.style.opacity =
          '1';
      }

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

  /*
    CLOSE MODAL
   */

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

    currentProduct =
      null;

    currentVariant =
      null;

    selectedOptions =
      {};
  }

  /*  
   PRODUCT CARD EVENTS
   */

  section
    .querySelectorAll(
      '.tisso-product-card__add-button'
    )
    .forEach(
      (button) => {
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
      }
    );

  /*
  
    CLOSE BUTTON + OVERLAY

   */

  section
    .querySelectorAll(
      '[data-modal-close]'
    )
    .forEach(
      (element) => {
        element.addEventListener(
          'click',
          closeModal
        );
      }
    );

  /*
    CLICK OUTSIDE MODAL 
   */

  modal.addEventListener(
    'click',
    (event) => {
      const dialog =
        modal.querySelector(
          '.tisso-product-modal__dialog'
        );

      /*
       * Click inside dialog:
       * Keep modal open.
       */
      if (
        dialog &&
        dialog.contains(
          event.target
        )
      ) {
        return;
      }

      /*
       * Click outside dialog:
       * Close modal.
       */
      closeModal();
    }
  );

  /*
   
    ESCAPE KEY
   
   */

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