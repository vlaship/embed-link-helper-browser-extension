/**
 * Share Menu Injector Module
 * Creates and injects custom menu items into share menus
 */

/**
 * Create a "Copy embed link" menu item
 * @param {string} postUrl - The post URL to transform
 * @param {string} targetHostname - Target hostname for transformation
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {HTMLElement|null} The created menu item element
 */
function createEmbedLinkMenuItem(postUrl, targetHostname, platform) {
  if (!postUrl || typeof postUrl !== 'string') {
    console.error('[share-menu-injector] Invalid post URL provided');
    return null;
  }

  if (!targetHostname || typeof targetHostname !== 'string') {
    console.error('[share-menu-injector] Invalid target hostname provided');
    return null;
  }

  if (!platform || (platform !== 'twitter' && platform !== 'instagram')) {
    console.error('[share-menu-injector] Invalid platform provided');
    return null;
  }

  try {
    // Generate unique item ID
    const itemId = `embed-link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let menuItem;

    if (platform === 'twitter') {
      // Create Twitter-style menu item
      menuItem = document.createElement('div');
      menuItem.setAttribute('role', 'menuitem');
      menuItem.setAttribute('tabindex', '0');
      menuItem.className = 'embed-link-menu-item';
      menuItem.setAttribute('data-item-id', itemId);
      
      // Create inner structure similar to Twitter's menu items
      const innerDiv = document.createElement('div');
      innerDiv.style.cssText = 'display: flex; align-items: center; padding: 12px 16px; cursor: pointer;';
      
      // Create icon container
      const iconContainer = document.createElement('div');
      iconContainer.style.cssText = 'margin-right: 12px; display: flex; align-items: center;';
      
      // Create SVG icon (link icon)
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '18.75');
      svg.setAttribute('height', '18.75');
      svg.style.cssText = 'fill: currentColor;';
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M11.96 14.945c-.067 0-.136-.01-.203-.027-1.13-.318-2.097-.986-2.795-1.932-.832-1.125-1.176-2.508-.968-3.893s.942-2.605 2.068-3.438l3.53-2.608c2.322-1.716 5.61-1.224 7.33 1.1.83 1.127 1.175 2.51.967 3.895s-.943 2.605-2.07 3.438l-1.48 1.094c-.333.246-.804.175-1.05-.158-.246-.334-.176-.804.158-1.05l1.48-1.095c.803-.592 1.327-1.463 1.476-2.45.148-.988-.098-1.975-.69-2.778-1.225-1.656-3.572-2.01-5.23-.784l-3.53 2.608c-.802.593-1.326 1.464-1.475 2.45-.15.99.097 1.975.69 2.778.498.675 1.187 1.15 1.992 1.377.4.114.633.528.52.928-.092.33-.39.547-.722.547z');
      svg.appendChild(path);
      
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M7.27 22.054c-1.61 0-3.197-.735-4.225-2.125-.832-1.127-1.176-2.51-.968-3.894s.943-2.605 2.07-3.438l1.478-1.094c.333-.246.805-.175 1.05.158s.177.804-.157 1.05l-1.48 1.095c-.803.593-1.326 1.464-1.475 2.45-.148.99.097 1.975.69 2.778 1.225 1.657 3.57 2.01 5.23.785l3.528-2.608c1.658-1.225 2.01-3.57.785-5.23-.498-.674-1.187-1.15-1.992-1.376-.4-.113-.633-.527-.52-.927.112-.4.528-.63.926-.522 1.13.318 2.096.986 2.794 1.932 1.717 2.324 1.224 5.612-1.1 7.33l-3.53 2.608c-.933.693-2.023 1.026-3.105 1.026z');
      svg.appendChild(path2);
      
      iconContainer.appendChild(svg);
      innerDiv.appendChild(iconContainer);
      
      // Create text container
      const textContainer = document.createElement('div');
      textContainer.style.cssText = 'flex: 1;';
      
      const textSpan = document.createElement('span');
      textSpan.textContent = 'Copy embed link';
      textContainer.appendChild(textSpan);
      
      innerDiv.appendChild(textContainer);
      menuItem.appendChild(innerDiv);
      
    } else if (platform === 'instagram') {
      // Create Instagram-style menu item with circular icon (matching Copy link style)
      menuItem = document.createElement('div');
      menuItem.className = 'embed-link-menu-item';
      menuItem.setAttribute('data-item-id', itemId);
      menuItem.setAttribute('role', 'button');
      menuItem.setAttribute('tabindex', '0');
      
      // Outer container matching Instagram's structure
      const outerDiv = document.createElement('div');
      outerDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; width: 76px; height: 104px;';
      
      // Circular icon container
      const circleContainer = document.createElement('div');
      circleContainer.style.cssText = 'width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: transparent;';
      
      // Create SVG icon
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('aria-label', 'Copy embed link');
      svg.setAttribute('fill', 'currentColor');
      svg.setAttribute('height', '20');
      svg.setAttribute('width', '20');
      svg.setAttribute('role', 'img');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.classList.add('x1lliihq', 'x1n2onr6', 'x5n08af');
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M11.96 14.945c-.067 0-.136-.01-.203-.027-1.13-.318-2.097-.986-2.795-1.932-.832-1.125-1.176-2.508-.968-3.893s.942-2.605 2.068-3.438l3.53-2.608c2.322-1.716 5.61-1.224 7.33 1.1.83 1.127 1.175 2.51.967 3.895s-.943 2.605-2.07 3.438l-1.48 1.094c-.333.246-.804.175-1.05-.158-.246-.334-.176-.804.158-1.05l1.48-1.095c.803-.592 1.327-1.463 1.476-2.45.148-.988-.098-1.975-.69-2.778-1.225-1.656-3.572-2.01-5.23-.784l-3.53 2.608c-.802.593-1.326 1.464-1.475 2.45-.15.99.097 1.975.69 2.778.498.675 1.187 1.15 1.992 1.377.4.114.633.528.52.928-.092.33-.39.547-.722.547z');
      svg.appendChild(path);
      
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M7.27 22.054c-1.61 0-3.197-.735-4.225-2.125-.832-1.127-1.176-2.51-.968-3.894s.943-2.605 2.07-3.438l1.478-1.094c.333-.246.805-.175 1.05.158s.177.804-.157 1.05l-1.48 1.095c-.803.593-1.326 1.464-1.475 2.45-.148.99.097 1.975.69 2.778 1.225 1.657 3.57 2.01 5.23.785l3.528-2.608c1.658-1.225 2.01-3.57.785-5.23-.498-.674-1.187-1.15-1.992-1.376-.4-.113-.633-.527-.52-.927.112-.4.528-.63.926-.522 1.13.318 2.096.986 2.794 1.932 1.717 2.324 1.224 5.612-1.1 7.33l-3.53 2.608c-.933.693-2.023 1.026-3.105 1.026z');
      svg.appendChild(path2);
      
      circleContainer.appendChild(svg);
      outerDiv.appendChild(circleContainer);
      
      // Text label container
      const textContainer = document.createElement('div');
      textContainer.style.cssText = 'margin-top: 8px;';
      
      const textSpan = document.createElement('span');
      textSpan.textContent = 'Copy embed link';
      textSpan.style.cssText = 'font-size: 12px; line-height: 16px; text-align: center; display: block; max-width: 76px; overflow: hidden; text-overflow: ellipsis;';
      textSpan.classList.add('x1lliihq', 'x1plvlek', 'xryxfnj', 'x1n2onr6', 'xyejjpt', 'x15dsfln', 'x193iq5w', 'xeuugli', 'x1fj9vlw', 'x13faqbe', 'x1vvkbs', 'x1s928wv', 'xhkezso', 'x1gmr53x', 'x1cpjm7i', 'x1fgarty', 'x1943h6x', 'x1i0vuye', 'x1fhwpqd', 'xo1l8bm', 'x5n08af', 'x2b8uid', 'x1s3etm8', 'x676frb', 'x10wh9bi', 'xpm28yp', 'x8viiok', 'x1o7cslx');
      
      textContainer.appendChild(textSpan);
      outerDiv.appendChild(textContainer);
      
      menuItem.appendChild(outerDiv);
    }

    // Store data attributes for later use
    menuItem.setAttribute('data-post-url', postUrl);
    menuItem.setAttribute('data-target-hostname', targetHostname);
    menuItem.setAttribute('data-platform', platform);
    
    // Apply platform-specific styling
    applyPlatformStyling(menuItem, platform);

    // Log menu item creation with unique ID
    window.Logger.log('[share-menu-injector] Created menu item', {
      itemId,
      platform,
      postUrl
    });

    return menuItem;
  } catch (error) {
    console.error('[share-menu-injector] Error creating menu item:', error);
    return null;
  }
}

/**
 * Inject menu item into share menu
 * @param {HTMLElement} menuItem - The menu item to inject
 * @param {HTMLElement} menuContainer - The share menu container
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {boolean} True if injection was successful
 */
function injectMenuItem(menuItem, menuContainer, platform) {
  if (!menuItem || !(menuItem instanceof HTMLElement)) {
    console.error('[share-menu-injector] Invalid menu item provided');
    return false;
  }

  if (!menuContainer || !(menuContainer instanceof HTMLElement)) {
    console.error('[share-menu-injector] Invalid menu container provided');
    return false;
  }

  if (!platform || (platform !== 'twitter' && platform !== 'instagram')) {
    console.error('[share-menu-injector] Invalid platform provided');
    return false;
  }

  try {
    // CRITICAL: Check if menu item already exists in this container
    const existingItem = menuContainer.querySelector('.embed-link-menu-item');
    if (existingItem) {
      window.Logger.log('[share-menu-injector] Menu item already exists, skipping injection', {
        existingItemId: existingItem.getAttribute('data-item-id'),
        newItemId: menuItem.getAttribute('data-item-id')
      });
      return true; // Return true since the item exists (goal achieved)
    }

    // Find injection point
    const injectionPoint = findMenuInjectionPoint(menuContainer, platform);
    
    if (!injectionPoint) {
      window.Logger.warn('[share-menu-injector] Could not find injection point');
      return false;
    }

    // Inject the menu item
    if (platform === 'twitter') {
      // For Twitter, insert after "Copy link" button
      const copyLinkButton = findCopyLinkButton(injectionPoint, platform);
      if (copyLinkButton && copyLinkButton.nextSibling) {
        injectionPoint.insertBefore(menuItem, copyLinkButton.nextSibling);
      } else {
        // Fallback: insert at the beginning if Copy link not found
        injectionPoint.insertBefore(menuItem, injectionPoint.firstChild);
      }
    } else if (platform === 'instagram') {
      // For Instagram, insert after "Copy link" button
      const copyLinkButton = findCopyLinkButton(injectionPoint, platform);
      if (copyLinkButton && copyLinkButton.nextSibling) {
        injectionPoint.insertBefore(menuItem, copyLinkButton.nextSibling);
      } else {
        // Fallback: insert at the beginning if Copy link not found
        injectionPoint.insertBefore(menuItem, injectionPoint.firstChild);
      }
    }

    // Verify injection
    const verifyItem = menuContainer.querySelector('.embed-link-menu-item');
    if (verifyItem && verifyItem === menuItem) {
      window.Logger.log('[share-menu-injector] Successfully injected and verified menu item', {
        itemId: menuItem.getAttribute('data-item-id'),
        platform
      });
      return true;
    } else {
      console.error('[share-menu-injector] Injection verification failed', {
        itemId: menuItem.getAttribute('data-item-id'),
        platform
      });
      return false;
    }
  } catch (error) {
    console.error('[share-menu-injector] Error injecting menu item:', error);
    return false;
  }
}

/**
 * Find the "Copy link" button in the share menu
 * @param {HTMLElement} container - The menu container
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {HTMLElement|null} The Copy link button element
 */
function findCopyLinkButton(container, platform) {
  if (!container || !(container instanceof HTMLElement)) {
    return null;
  }

  try {
    if (platform === 'twitter') {
      // Look for menu items with "Copy link" text
      const menuItems = container.querySelectorAll('[role="menuitem"]');
      for (const item of menuItems) {
        const text = item.textContent || '';
        if (text.toLowerCase().includes('copy link')) {
          return item;
        }
      }
    } else if (platform === 'instagram') {
      // Look for buttons or divs with role="button" with "Copy link" text
      const buttons = container.querySelectorAll('button, div[role="button"], a');
      for (const button of buttons) {
        const text = button.textContent || '';
        if (text.toLowerCase().includes('copy link')) {
          window.Logger.log('[share-menu-injector] Found Copy link button:', button);
          return button;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[share-menu-injector] Error finding Copy link button:', error);
    return null;
  }
}

/**
 * Find the appropriate injection point within a share menu
 * @param {HTMLElement} menuContainer - The share menu container
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {HTMLElement|null} The injection point element
 */
function findMenuInjectionPoint(menuContainer, platform) {
  if (!menuContainer || !(menuContainer instanceof HTMLElement)) {
    window.Logger.warn('[share-menu-injector] Invalid menu container provided');
    return null;
  }

  if (!platform || (platform !== 'twitter' && platform !== 'instagram')) {
    window.Logger.warn('[share-menu-injector] Invalid platform provided');
    return null;
  }

  try {
    if (platform === 'twitter') {
      // Look for the container that holds menu items
      // Twitter typically uses a div with role="menu" or similar
      
      // Strategy 1: Look for role="menu"
      let menuItemsContainer = menuContainer.querySelector('[role="menu"]');
      if (menuItemsContainer) {
        return menuItemsContainer;
      }

      // Strategy 2: Look for container with multiple menuitem children
      const containers = menuContainer.querySelectorAll('div');
      for (const container of containers) {
        const menuItems = container.querySelectorAll('[role="menuitem"]');
        if (menuItems.length > 0) {
          return container;
        }
      }

      // Strategy 3: Use the menu container itself
      return menuContainer;
      
    } else if (platform === 'instagram') {
      // Look for the container that holds share action buttons (not user avatars)
      // Instagram has a specific structure with share buttons at the bottom
      
      // Strategy 1: Find the container with "Copy link" button and its siblings
      // This is the actual share buttons container
      const allDivs = menuContainer.querySelectorAll('div');
      for (const div of allDivs) {
        // Look for direct children that are links or buttons with share actions
        const directChildren = Array.from(div.children);
        const hasShareButtons = directChildren.some(child => {
          const text = child.textContent || '';
          return text.includes('Copy link') || text.includes('Facebook') || text.includes('Messenger');
        });
        
        if (hasShareButtons && directChildren.length > 3) {
          window.Logger.log('[share-menu-injector] Found Instagram share buttons container');
          return div;
        }
      }

      // Strategy 2: Look for container with multiple link/button children (not just divs)
      for (const container of allDivs) {
        const links = container.querySelectorAll(':scope > a, :scope > div[role="button"]');
        if (links.length > 3) {
          return container;
        }
      }

      // Strategy 3: Use the menu container itself
      return menuContainer;
    }

    return null;
  } catch (error) {
    console.error('[share-menu-injector] Error finding injection point:', error);
    return null;
  }
}

/**
 * Style menu item to match platform's native styling
 * @param {HTMLElement} menuItem - The menu item element
 * @param {string} platform - 'twitter' or 'instagram'
 */
function applyPlatformStyling(menuItem, platform) {
  if (!menuItem || !(menuItem instanceof HTMLElement)) {
    window.Logger.warn('[share-menu-injector] Invalid menu item provided');
    return;
  }

  if (!platform || (platform !== 'twitter' && platform !== 'instagram')) {
    window.Logger.warn('[share-menu-injector] Invalid platform provided');
    return;
  }

  try {
    if (platform === 'twitter') {
      // Twitter styling
      menuItem.style.cssText = `
        cursor: pointer;
        transition: background-color 0.2s;
        user-select: none;
      `;
      
      // Add hover effect
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'transparent';
      });
      
      // Add focus effect
      menuItem.addEventListener('focus', () => {
        menuItem.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
      });
      
      menuItem.addEventListener('blur', () => {
        menuItem.style.backgroundColor = 'transparent';
      });
      
    } else if (platform === 'instagram') {
      // Instagram styling for circular button
      menuItem.style.cssText = `
        cursor: pointer;
        background: transparent;
        border: none;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: inherit;
      `;
      
      // Add hover effect to the circular icon
      const circleContainer = menuItem.querySelector('div > div');
      if (circleContainer) {
        menuItem.addEventListener('mouseenter', () => {
          circleContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        });
        
        menuItem.addEventListener('mouseleave', () => {
          circleContainer.style.backgroundColor = 'transparent';
        });
      }
    }
  } catch (error) {
    console.error('[share-menu-injector] Error applying platform styling:', error);
  }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createEmbedLinkMenuItem,
    injectMenuItem,
    findMenuInjectionPoint,
    findCopyLinkButton,
    applyPlatformStyling
  };
}

// Expose to window for browser extension content scripts
if (typeof window !== 'undefined') {
  window.ShareMenuInjector = {
    createEmbedLinkMenuItem,
    injectMenuItem,
    findMenuInjectionPoint,
    findCopyLinkButton,
    applyPlatformStyling
  };
}
