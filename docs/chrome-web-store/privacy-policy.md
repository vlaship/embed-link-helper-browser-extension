# Privacy Policy for Embed Link Helper

**Last Updated:** December 1, 2025  
**Version:** 1.0.1

## Overview

Embed Link Helper is a browser extension that transforms social media links to alternative hostnames that provide better embeds in messaging platforms. This privacy policy explains how the extension handles data.

## Data Collection

The extension collects and stores **only** the following data:

- **User Configuration Preferences**: Custom hostname mappings that you configure through the extension's popup interface (e.g., mapping "x.com" to "fxtwitter.com")

**The extension does NOT collect:**
- Personal information
- Browsing history
- Social media content
- Usernames or passwords
- Any data from the websites you visit beyond what's necessary to detect posts and inject buttons

## Data Storage

All data collected by the extension is stored **locally on your device** using the browser's storage API (`browser.storage.sync`).

- Data remains on your computer/device only
- Data may sync across your devices if you have browser sync enabled (this is a browser feature, not controlled by the extension)
- No data is transmitted to external servers by the extension
- No data is sent to the extension developers
- No data is shared with any third parties
- No analytics or tracking services are used

## Data Usage

The configuration data you provide is used exclusively for:

- Transforming social media URLs to your preferred alternative hostnames
- Displaying the correct redirect buttons on social media posts
- Remembering your preferences across browser sessions

All URL transformation and button injection happens **locally in your browser**. The extension processes web page content on your device without sending any information externally.

## Data Sharing

The extension **does not share any data** with third parties. Period.

- No data is transmitted to external servers
- No data is sold or monetized
- No data is shared with advertisers
- No data is used for analytics or tracking

## User Control

You have complete control over your data:

- **View Settings**: Open the extension popup to see your current configuration
- **Modify Settings**: Change hostname mappings at any time through the popup interface
- **Clear Settings**: Remove all custom configurations by clearing your browser's extension data
- **Uninstall**: Removing the extension deletes all stored configuration data

## Permissions Explained

The extension requests the following permissions:

- **activeTab**: Allows the extension to interact with the current tab when you click the extension icon
- **clipboardWrite**: Enables copying transformed URLs to your clipboard
- **storage**: Stores your configuration preferences locally
- **Host permissions (x.com, instagram.com)**: Allows the extension to detect posts and inject redirect buttons on these specific platforms

All permissions are used solely for the extension's stated functionality and do not enable any data collection beyond what is described in this policy.

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last Updated" date at the top of this document. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Contact

If you have questions about this privacy policy or the extension's data practices, please contact us through the Chrome Web Store support page or via the support email provided in the extension listing.

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- User Data Privacy requirements
- Minimum permission principles
