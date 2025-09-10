> **Note:** This project is a fork of the original [Bible linker Pro](https://github.com/Floydv149/bibleLinkerPro) by Floydv149. It builds upon the previous work to add new features and improvements.

NWT Linker is a plugin for [Obsidian](https://obsidian.md/) that lets you generate links to [JW Library](https://www.jw.org/en/online-help/jw-library/) from Bible texts in your notes.

-   Convert short or long written out versions of Bible texts to links.
-   Open Bible texts directly in JW Library without altering your note.
-   Automatically get the current line.
-   Format the link output to your liking.
-   Multiple language support.
-   Choose your preferred Bible edition.
-   Online inline qoutation support.

## Installation

> [!Note]  
> You must turn off **Restricted mode** to use this plugin.

1. In Obsidian, open **Settings**.
2. Under **Community plugins**, select **Browse**.
3. Search for "NWT Linker" by Floydv149, and then select it.
4. Select **Install** and then **Enable**.
5. Then click **Options** and select your preferred language.

To get started using NWT Linker, press **Ctrl+P** (or **Cmd+P** on macOS) to open the **Command palette**, and then select **NWT Linker: Convert Bible text to JW Library link**.

## Example

You can type a shorthand version of a Bible text like "ge 1:1" or a long version like "genesis 1:1".
This converts to `[Genesis 1:1](jwlibrary:///finder?srcid=jwlshare&wtlocale=O&prefer=lang&pub=nwtsty&bible=01001001)`

## Settings

### Processing

While processing your text, you have some extra options:

-   Expand the Bible book name from abbreviation to full name.
-   Automatically get the current line when using the command.
-   Automatically open the newly generated link.
-   Choose your preferred Bible edition (nwt or nwtsty).

### Styling

The links you generate with this plugin can be styled with the following options:

-   Capitalize first character
-   Add space between Bible book number and Bible book name.
-   Render the link output bold and/or italic
-   Add link prefix and/or suffix

## Languages

This plugin supports the following languages:

-   English
-   Dutch
-   French - By @DarkBuffalo
-   Spanish - By @Marc-Fernandez
-   German - By @Juilio
-   Finnish - By @amahlaka
-   Portuguese from Brasil - By @gutembergmaciel
-   Portuguese from Portugal - By @joao-p-marques
-   Hungarian - By @MGeri97
-   Ukrainian - By @gaborishka

## Changelog

[Click here to view the changelog.](https://github.com/Floydv149/bibleLinkerPro/blob/main/CHANGELOG.MD)

## Roadmap

-   Better text recognition, from a bigger selection.
-   Support to convert to WOL links.
-   More languages

## License

Project is distributed under [Apache License 2.0](LICENSE).
