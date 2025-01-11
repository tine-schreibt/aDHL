This plugin is based on '<a href = "https://github.com/nothingislost/obsidian-dynamic-highlights" >Dynamic Highlights</a>' by nothingislost. I fixed a bug in the regEx, but otherwise I left the basic mechanics untouched. I just added a lot more customisability and some usability features, which I hope you find worthwhile.
The pretty highlight styles I got from <a href="https://github.com/chetachiezikeuzor/highlightr-Plugin/">Highlightr</a> by Chechichetachiezikeuzor, so if you're using that, aDHL will fit right in, style wise.

Here's a picture of the settings panel, including some use cases and highlighter examples. Scroll down to find all elements explained, left to right, top to bottom.

<img src="https://github.com/tine-schreibt/active_aDHL/blob/main/Another-dynamic-highlights-plugin.png?raw=true">

**Persistent highlights**

- **Import:** Imports settings; you can't import highlighters from the original Plugin, sorry. But you'll have to touch them all in order to get the benefits of the revamped version, anyway, so...
- **Export:** Exports settings
- **toggle:** This is The Switch that starts/stops all highlights being rendered; find it in the Command Palette. If you can tell me why it keeps this border at the top, please do.

**Define persistent highlighters**

- **input field:** Here you input your highlighter's name. Don't use any special characters or the highlighter might not work. Spaces will be replaced with dashes.
- **red circle:** This is the color picker. Click on it to get a... well, picker, and the option to input a hex or hsla.
- **input field:** Here you input your search query. It also shows what the highlight will look like (doesn't work for all deco styles, though).
- **toggle:** turn RegEx on/off. This obviously uses JavaScript flavoured RegEx. Find info here: https://www.regular-expressions.info
- **save button:** Saves your highlighters.
- **cancel button**: cancels; useful when you start to edit a highlighter and then think better of it.
- **dropdown**: So many decoration styles!
- **matches toggle:** Toggle on if you want to have matches highlighted.
- **parent line:** Toggle on if you want the parent line of the match highlighted.
- **dropdown:** All your tags. Choose one or make a new one. Intended to group your highlighters together an make them easier to manage.

**Your highlighters and tags**

- **sort button:** By default, newly created tags appear at the top, newly created highlighters appear at the top in their tag. Once you're done creating, sort them alphabetically (or don't, I'm not your boss).
- **caret**: UI iconography thingy that tells you that this element can be expanded/collapsed.
- **#unsorted**: This is the default tag. Your tags don't need a #, though.
- **toggle:** Toggle all highlighters under this tag on/off.
- **edit button:** Edit the tag name. If the new name already exists, both tags' highlighters will be merged under the new name.
- **delete button:** Delete the tag. This will also delete all highlighters associated with it.
- **abc icon**: This is a little preview of what your highlighter will look like. I think it's a neat feature.
- **highlighter name:** The name of your highlighter. See the dashes where spaces used to be.
- **toggle:** Toggle this highlighter on/off.
- **edit button**: Edit your highlighter.
- **delete button:** Delete your highlighter.

**Hotkeys and Command Palette**

- All your tags will automatically be available in the Command Palette/Hotkeys panel to toggle on/off (search aDHL to see them all). You can choose one tag whose highlighters you want to toggle individually using the Command Palette or a Hotkey. The default is #unsorted, the input is case sensitive.
- **input field:** For the name of the tag you want to choose.

**Selection Highlights**

- **Choose a color:** Self explanatory, really.
- **Choose a decoration:** All the deco available for static highlighters you also can choose for your dynamic highlights.
- **save button:** Save the style you made. I would give you a preview but couldn't figure out how.
- **cancel button:** For when you regret your choices.
- **Highlight all occurrences of the word under the cursor:** Sounds cool, but gets annoying quickly.
- **Highlight all occurrences of the actively selected text:** Much better, in my opinion.
- **Highlight delay:** For when you want to take things slow.
- **Ignored words:** A list of words you don't want to be highlighted, even when they are under the cursor.

Let me know if I forgot anything.
I might add a modal for on/off toggling, but only if many people would find that useful.

If you want to express your joy at finding this neat little piece of code, you can buy me a coffee:
