
let enabledMarks;

const markWrapper = containerEl.createDiv("mark-wrapper");
const matchToggle = new ToggleComponent(markWrapper);
 matchToggle
 .toggleEl.addClass("highlighter-settings-regex")
       .ariaLabel = "Highlight matches";
    matchToggle
    .setvalue(true)
    .onChange((value) => {
        matchEnabled = value;
        if (matchEnabled) {
            enabledMarks.push("match");
        } else {
            enabledMarks = enabledMarks.filter((type) => type !== "match");
        }        
    });  
const lineToggle = new ToggleComponent(markWrapper);
lineToggle
 .toggleEl.addClass("highlighter-settings-regex")
       .ariaLabel = "Highlight matches";
       lineToggle
    .setvalue(false)
    .onChange((value) => {
        lineEnabled = value;
        if (lineToggle) {
            enabledMarks.push("line");
        } else {
            enabledMarks = enabledMarks.filter((type) => type !== "line");
        }        
    });