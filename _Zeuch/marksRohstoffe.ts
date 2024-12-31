    const buildMarkerTypes = (parentEl: HTMLElement) => {
      const types: MarkItems = {};
      const marks: MarkTypes = {
        match: { description: "matches", defaultState: true },
        line: { description: "parent line", defaultState: false },
      };
      const container = parentEl.createDiv("mark-wrapper");
      const wrapper = container.createDiv("mark-wrapper");
      let type: markTypes;
      for (type in marks) {
        const mark = marks[type];
        wrapper.createSpan("match-type").setText(mark.description);
        const component = new ToggleComponent(wrapper).setValue(
          mark.defaultState
        );
        types[type] = {
          element: wrapper,
          component: component,
        };
      }
      return types;
    };


    const enabledMarks = Object.entries(marks)
    .map(([type, item]) => (item.component.getValue() && type) as string)
    .filter((type): type is markTypes => ["line", "match"].includes(type));


    const queryTypeInput = new ToggleComponent(queryWrapper);
    queryTypeInput.toggleEl.addClass("highlighter-settings-regex");
    queryTypeInput.toggleEl.ariaLabel = "Enable Regex";
    queryTypeInput.onChange((value) => {
      if (value) {
        queryInput.setPlaceholder("Search expression");
      } else {
        queryInput.setPlaceholder("Search term");
      }
    });  