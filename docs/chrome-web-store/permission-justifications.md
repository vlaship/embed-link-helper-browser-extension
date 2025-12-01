# Permission Justifications

This document provides detailed justifications for each permission requested by the Embed Link Helper extension, explaining why each permission is necessary for the extension's functionality and how it benefits users.

## activeTab

The activeTab permission allows the extension to interact with the currently active tab when the user explicitly clicks the extension icon in the toolbar. This permission is used solely for the configuration popup interface to communicate with the background script to retrieve and save user settings. The extension only accesses the active tab when the user chooses to interact with it, and no data from the tab is collected, stored, or transmitted.

---

## storage

The storage permission enables the extension to save user configuration preferences for hostname mappings across browser sessions. Users configure their preferred target hostnames for Twitter/X and Instagram (e.g., "fxtwitter.com" or "ddinstagram.com"), and these preferences must persist after the browser is closed. Only hostname strings are stored locally - no personal information, browsing history, or sensitive data is collected or stored.

---

## clipboardWrite

The clipboardWrite permission enables the extension to copy transformed URLs to the user's clipboard when they click the "Copy Link" button on social media posts. This is the core functionality of the extension - allowing users to quickly copy alternative links that provide better embeds in messaging platforms like Discord and Slack.

---

## Host Permissions: *://x.com/* and *://www.instagram.com/*

These host permissions allow the extension to run on Twitter/X and Instagram pages to detect individual posts and inject "Copy Link" buttons. The extension scans the page structure to identify posts, extracts post URLs, and adds convenient buttons that transform URLs to user-configured alternative hostnames. All processing happens locally in the browser. The extension does not collect, store, or transmit any data from these sites - it only adds UI elements and transforms URLs when users click the buttons. This enables users to quickly share social media content with better embeds in messaging platforms like Discord and Slack.

---

## Remote Code

The extension does not execute any remote code. All JavaScript files are bundled with the extension package and loaded locally from the extension's installation directory. The extension does not fetch code from external servers, use eval() or similar dynamic code execution, load scripts from CDNs, or connect to any external APIs or services. All functionality is implemented in bundled scripts that are reviewed during Chrome Web Store submission. Users can trust that the extension's behavior is exactly as reviewed and cannot be modified remotely.


